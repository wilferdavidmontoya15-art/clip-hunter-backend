import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient'; 
import { toast } from 'react-hot-toast'; 

// Usamos la variable de entorno, o el fallback (tu URL de Railway)
const API_URL = import.meta.env.VITE_API_URL || "https://clip-hunter-backend-production.up.railway.app";

export const EMOTIONS = ['Comedia', 'Drama', 'Acción', 'Feliz', 'Triste', 'Épico', 'Tensa', 'General'];

// Helper para esperar
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


    // --- 3. FUNCIÓN NUCLEAR: CORTAR EN RAILWAY (CON REINTENTO) ---
    const cutVideoOnBackend = async (videoUrl, startTime, endTime, title) => {
        // Aseguramos que los tiempos sean números (float) para enviarlos a Python
        const startNum = parseFloat(startTime);
        const endNum = parseFloat(endTime);

        const maxRetries = 3; 

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(`[Backend] Intento ${attempt}/${maxRetries}: Reintentando conexión...`);
                    // Espera 1s, 2s, 3s entre reintentos para evadir el bloqueo del navegador
                    await sleep(1000 * (attempt - 1)); 
                }

                const res = await fetch(`${API_URL}/api/cut`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        video_url: videoUrl,
                        start_time: startNum, 
                        end_time: endNum,     
                        title: title
                    })
                });

                if (!res.ok) {
                    // Si el servidor responde con un error que no es de red (4xx, 5xx), reintentamos si es necesario
                    if (attempt < maxRetries) {
                         throw new Error(`Error temporal del servidor (${res.status}). Reintentando...`);
                    }
                    const err = await res.json();
                    throw new Error(err.detail || `Error desconocido: ${res.status}`);
                }

                const data = await res.json();
                const fullUrl = data.public_url.startsWith('http') ? data.public_url : `${API_URL}${data.public_url}`;
                return fullUrl;

            } catch (error) {
                console.error(`[Backend] Falló el intento ${attempt}:`, error.message);
                if (attempt === maxRetries) {
                    // La corrección fue aquí, quitando el 'new' redundante para evitar el error de sintaxis
                    throw new Error(`Fallo definitivo: No se pudo conectar con el servidor (Error: ${error.message})`);
                }
            }
        }
    };


    // --- 4. ACCIÓN: RECORTAR UN CLIP EXISTENTE ---
    const handleTrimExistingClip = async (originalClip, start, end) => {
        setIsProcessing(true);
        const toastId = toast.loading('✂️ Enviando a FFmpeg en la nube...');
        
        try {
            // Mandamos los floats directamente desde el modal
            const cutUrl = await cutVideoOnBackend(originalClip.video_url, start, end, originalClip.title);
            
            // Calculamos la duración del clip resultante
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

            toast.success('¡Recorte generado con éxito!', { id: toastId });
            fetchClips();
            return cutUrl; 

        } catch (error) {
            console.error(error);
            // Mostrar el mensaje de error del reintento fallido
            toast.error(`Fallo en recorte: ${error.message}`, { id: toastId }); 
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
        const toastId = toast.loading('⏳ Procesando y guardando...');

        try {
            // Mandamos los strings del estado, pero cutVideoOnBackend los convierte a float
            const finalUrl = await cutVideoOnBackend(newClip.video_url, newClip.start_time, newClip.end_time, newClip.title);

            const duration = parseFloat(newClip.end_time) - parseFloat(newClip.start_time);

            const { error } = await supabase.from('Clips').insert([{
                ...newClip,
                video_url: finalUrl,
                start_time: 0, 
                end_time: duration
            }]);

            if (error) throw error;

            toast.success('¡Clip creado!', { id: toastId });
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
            const res = await fetch(`${API_URL}/api/info`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ url })
            });
            
            if (!res.ok) throw new Error('No se pudo obtener el video');
            
            const data = await res.json();

            setNewClip(prev => ({
                ...prev, 
                title: data.title || prev.title,
                show_title: data.title || prev.show_title,
                thumbnail: data.thumbnail || prev.thumbnail, 
                video_url: data.video_url, 
                // Usamos la duración real si existe, sino 30s
                end_time: String(data.duration && data.duration > 0 ? Math.min(data.duration, 60) : 30) 
            }));
            
            toast.success('¡Video detectado!', { id: toastId });

        } catch (e) {
            console.error("Error fetchVideoInfo:", e);
            toast.error('No pudimos procesar este enlace automáticamente', { id: toastId });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewClip(prev => ({ ...prev, [name]: value }));
        
        if (name === 'video_url' && value.length > 10 && (value.includes('youtube') || value.includes('youtu.be'))) {
             fetchVideoInfo(value);
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