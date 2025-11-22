import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient'; 
import { toast } from 'react-hot-toast'; 

// Usamos la variable de entorno, o el fallback (tu URL de Railway)
// IMPORTANTE: Forzamos HTTPS para evitar bloqueos de "Mixed Content"
const API_URL = (import.meta.env.VITE_API_URL || "https://clip-hunter-backend-production.up.railway.app").replace('http://', 'https://');

export const EMOTIONS = ['Comedia', 'Drama', 'Acción', 'Feliz', 'Triste', 'Épico', 'Tensa', 'General'];

// Helper para esperar (usado en reintentos)
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

    // --- 1. CARGAR CLIPS ---
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

    // --- 2. LÓGICA DE FILTRADO MEJORADA (useMemo) ---
    const filteredClips = useMemo(() => {
        if (!filter) return clips;
        const lowerFilter = filter.toLowerCase();
        
        return clips.filter(clip => 
            (clip.title && clip.title.toLowerCase().includes(lowerFilter)) ||
            (clip.show_title && clip.show_title.toLowerCase().includes(lowerFilter)) ||
            (clip.category && clip.category.toLowerCase().includes(lowerFilter))
        );
    }, [clips, filter]);


    // --- 3. FUNCIÓN NUCLEAR: CORTAR EN RAILWAY (CON REINTENTO Y MODO SIMPLE) ---
    const cutVideoOnBackend = async (videoUrl, startTime, endTime, title) => {
        const startNum = parseFloat(startTime);
        const endNum = parseFloat(endTime);
        const maxRetries = 3; 

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(`[Backend] Intento ${attempt}/${maxRetries}: Reintentando conexión...`);
                    await sleep(1500 * (attempt - 1)); // Espera progresiva
                }

                // Usamos fetch con headers estándar para JSON
                const res = await fetch(`${API_URL}/api/cut`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        video_url: videoUrl,
                        start_time: startNum, 
                        end_time: endNum,     
                        title: title
                    })
                });

                if (!res.ok) {
                    // Leemos el error con cuidado
                    let errorDetail = `Error desconocido: ${res.status}`;
                    try {
                        const errData = await res.json();
                        errorDetail = errData.detail || errorDetail;
                    } catch (e) {
                        // Si no es JSON, es un error de red crudo
                        errorDetail = await res.text(); 
                    }

                    // Si es un error 500 (Server Error), reintentamos. Si es 400 (Bad Request), paramos.
                    if (res.status >= 500 && attempt < maxRetries) {
                         // Lanzamos error para que el catch lo capture y reintente
                         throw new Error(`Error del servidor (${res.status}). Reintentando...`);
                    }
                    
                    // Si es un error definitivo (400, 422), lanzamos error final
                    throw new Error(errorDetail);
                }

                const data = await res.json();
                // Aseguramos HTTPS en la respuesta también
                let fullUrl = data.public_url.startsWith('http') ? data.public_url : `${API_URL}${data.public_url}`;
                fullUrl = fullUrl.replace('http://', 'https://');
                return fullUrl;

            } catch (error) {
                console.error(`[Backend] Falló el intento ${attempt}:`, error.message);
                if (attempt === maxRetries) {
                    // Este es el error que se mostrará al usuario si todo falla
                    throw new Error(`No se pudo conectar con el servidor de edición. Verifica tu conexión o intenta más tarde. (Detalle: ${error.message})`);
                }
            }
        }
    };


    // --- 4. ACCIÓN: RECORTAR UN CLIP EXISTENTE ---
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

    // --- 5. ACCIÓN: CREAR NUEVO CLIP DESDE CERO ---
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

    // --- 6. AUTO-RELLENO INFO VIDEO ---
    const fetchVideoInfo = async (url) => {
        if (!url || !url.includes('http')) return;
        if (url.includes('.mp4') || url.includes('railway.app')) return;

        const toastId = toast.loading('Analizando enlace...');
        
        try {
            // También aseguramos HTTPS aquí
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
             // Debounce manual simple
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