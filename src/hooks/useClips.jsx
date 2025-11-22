import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient.js'; // Agregamos .js para ser explícitos
import { toast } from 'react-hot-toast'; 

// 1. Configuración segura de la URL (Fuerza HTTPS y maneja import.meta)
const getApiUrl = () => {
    const url = import.meta.env.VITE_API_URL || "https://clip-hunter-backend-production.up.railway.app";
    return url.replace('http://', 'https://');
};

const API_URL = getApiUrl();

export const EMOTIONS = ['Comedia', 'Drama', 'Acción', 'Feliz', 'Triste', 'Épico', 'Tensa', 'General'];

// Helper para esperar entre reintentos
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const useClips = () => {
    const [clips, setClips] = useState([]);
    const [filter, setFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const [newClip, setNewClip] = useState({
        title: '',
        video_url: '',
        show_title: '', 
        thumbnail: '', 
        emotion: EMOTIONS[0], 
        start_time: '0', 
        end_time: '10', 
        category: 'General'
    });

    // --- CARGAR CLIPS ---
    const fetchClips = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('Clips')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Error cargando clips:", error);
            toast.error("Error al cargar la librería");
        } else if (data) {
            setClips(data);
        }
        setLoading(false);
    };

    // --- FILTRADO OPTIMIZADO ---
    const filteredClips = useMemo(() => {
        if (!filter) return clips;
        const lowerFilter = filter.toLowerCase();
        
        return clips.filter(clip => 
            (clip.title && clip.title.toLowerCase().includes(lowerFilter)) ||
            (clip.show_title && clip.show_title.toLowerCase().includes(lowerFilter)) ||
            (clip.category && clip.category.toLowerCase().includes(lowerFilter))
        );
    }, [clips, filter]);

    // --- FUNCIÓN NUCLEAR: CORTAR EN RAILWAY (CON REINTENTO) ---
    const cutVideoOnBackend = async (videoUrl, startTime, endTime, title) => {
        const startNum = parseFloat(startTime);
        const endNum = parseFloat(endTime);
        const maxRetries = 3; 

        // Bucle de intentos
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(`[Backend] Intento ${attempt}/${maxRetries}: Reintentando conexión...`);
                    await sleep(1000 * (attempt - 1)); // Espera progresiva (0s, 1s, 2s)
                }

                const res = await fetch(`${API_URL}/api/cut`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        video_url: videoUrl,
                        start_time: startNum, 
                        end_time: endNum,     
                        title: title
                    })
                });

                if (!res.ok) {
                    // Si es un error del servidor (5xx), lanzamos error para que el bucle reintente
                    if (res.status >= 500 && attempt < maxRetries) {
                         throw new Error(`Error temporal del servidor (${res.status})`);
                    }
                    
                    // Si es otro error, intentamos leer el mensaje
                    let errorDetail = `Error desconocido: ${res.status}`;
                    try {
                        const errData = await res.json();
                        errorDetail = errData.detail || errorDetail;
                    } catch (e) {
                        errorDetail = await res.text();
                    }
                    throw new Error(errorDetail); // Rompe el bucle y va al catch final
                }

                const data = await res.json();
                // Asegurar HTTPS en la respuesta
                let fullUrl = data.public_url.startsWith('http') ? data.public_url : `${API_URL}${data.public_url}`;
                fullUrl = fullUrl.replace('http://', 'https://');
                
                return fullUrl; // ¡Éxito! Retornamos la URL

            } catch (error) {
                console.error(`[Backend] Falló el intento ${attempt}:`, error.message);
                
                // Si es el último intento, lanzamos el error final al usuario
                if (attempt === maxRetries) {
                    throw new Error(`No se pudo conectar con el servidor. (Detalle: ${error.message})`);
                }
                // Si no es el último, el bucle continuará al siguiente intento
            }
        }
    };

    // --- ACCIÓN: RECORTAR UN CLIP EXISTENTE ---
    const handleTrimExistingClip = async (originalClip, start, end) => {
        setIsProcessing(true);
        const toastId = toast.loading('✂️ Procesando video...');
        
        try {
            const cutUrl = await cutVideoOnBackend(originalClip.video_url, start, end, originalClip.title);
            
            const duration = parseFloat(end) - parseFloat(start);

            const newClipData = {
                title: `${originalClip.title} (Recorte)`,
                show_title: originalClip.show_title,
                thumbnail: originalClip.thumbnail,
                emotion: originalClip.emotion,
                category: originalClip.category,
                video_url: cutUrl,
                start_time: 0, 
                end_time: duration
            };

            const { error } = await supabase.from('Clips').insert([newClipData]);
            if (error) throw error;

            toast.success('¡Clip creado exitosamente!', { id: toastId });
            fetchClips();
            return cutUrl; 

        } catch (error) {
            console.error(error);
            toast.error(`Error: ${error.message}`, { id: toastId }); 
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // --- ACCIÓN: CREAR NUEVO CLIP DESDE CERO ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newClip.video_url || !newClip.title) {
            toast.error("Falta información");
            return;
        }

        setIsProcessing(true); 
        const toastId = toast.loading('⏳ Procesando nuevo video...');

        try {
            const finalUrl = await cutVideoOnBackend(newClip.video_url, newClip.start_time, newClip.end_time, newClip.title);

            const duration = parseFloat(newClip.end_time) - parseFloat(newClip.start_time);

            const { error } = await supabase.from('Clips').insert([{
                ...newClip,
                video_url: finalUrl,
                start_time: 0, 
                end_time: duration
            }]);

            if (error) throw error;

            toast.success('¡Video añadido a la biblioteca!', { id: toastId });
            fetchClips();
            setIsModalOpen(false);
            setNewClip({ title: '', video_url: '', show_title: '', thumbnail: '', emotion: EMOTIONS[0], start_time: '0', end_time: '10', category: 'General' });

        } catch (error) {
            console.error(error);
            toast.error(`Error: ${error.message}`, { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    // --- AUTO-RELLENO INFO VIDEO ---
    const fetchVideoInfo = async (url) => {
        if (!url || !url.includes('http')) return;
        if (url.includes('.mp4') || url.includes('railway.app')) return;

        const toastId = toast.loading('Analizando enlace...');
        
        try {
            // Usamos también HTTPS aquí
            const infoUrl = `${API_URL}/api/info`.replace('http://', 'https://');
            
            const res = await fetch(infoUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ url })
            });
            
            if (!res.ok) throw new Error('No se pudo obtener información del video');
            
            const data = await res.json();

            setNewClip(prev => ({
                ...prev, 
                title: data.title || prev.title,
                show_title: data.title || prev.show_title,
                thumbnail: data.thumbnail || prev.thumbnail, 
                video_url: data.video_url, 
                end_time: String(data.duration && data.duration > 0 ? Math.min(data.duration, 60) : 30) 
            }));
            
            toast.success('¡Información obtenida!', { id: toastId });

        } catch (e) {
            console.error("Error fetchVideoInfo:", e);
            toast.error('No pudimos leer este enlace automáticamente', { id: toastId });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewClip(prev => ({ ...prev, [name]: value }));
        
        if (name === 'video_url' && value.length > 10 && (value.includes('youtube') || value.includes('youtu.be'))) {
             const timeoutId = setTimeout(() => fetchVideoInfo(value), 1000);
             return () => clearTimeout(timeoutId);
        }
    };

    useEffect(() => { fetchClips(); }, []); 

    return { 
        clips, filteredClips, loading, isProcessing, newClip, setFilter, 
        isModalOpen, setIsModalOpen, handleInputChange, handleSubmit,
        handleTrimExistingClip
    };
};

export default useClips;