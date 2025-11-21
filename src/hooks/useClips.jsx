import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 
import { toast } from 'react-hot-toast'; 

// TU BACKEND REAL EN RAILWAY (Verifica que no tenga espacios al final)
const API_URL = "https://clip-hunter-backend-production.up.railway.app";

export const EMOTIONS = ['Comedia', 'Drama', 'Acción', 'Feliz', 'Triste', 'Épico', 'Tensa', 'General'];

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
        if (!error && data) setClips(data);
        setLoading(false);
    };

    // --- 2. FUNCIÓN NUCLEAR: CORTAR EN RAILWAY ---
    const cutVideoOnBackend = async (videoUrl, startTime, endTime, title) => {
        const res = await fetch(`${API_URL}/api/cut`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                video_url: videoUrl,
                start_time: parseInt(startTime),
                end_time: parseInt(endTime),
                title: title
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al procesar el video en el servidor");
        }

        const data = await res.json();
        // El backend devuelve una ruta relativa (/static/...), le pegamos la URL base
        // Si tu backend ya devuelve la URL completa, puedes quitar `${API_URL}`
        const fullUrl = data.public_url.startsWith('http') ? data.public_url : `${API_URL}${data.public_url}`;
        return fullUrl;
    };

    // --- 3. ACCIÓN: RECORTAR UN CLIP EXISTENTE ---
    const handleTrimExistingClip = async (originalClip, start, end) => {
        setIsProcessing(true);
        const toastId = toast.loading('✂️ Enviando a FFmpeg en la nube...');
        
        try {
            const cutUrl = await cutVideoOnBackend(originalClip.video_url, start, end, originalClip.title);
            
            const newClipData = {
                title: `${originalClip.title} (Recorte)`,
                show_title: originalClip.show_title,
                thumbnail: originalClip.thumbnail,
                emotion: originalClip.emotion,
                category: originalClip.category,
                video_url: cutUrl,
                start_time: 0, 
                end_time: end - start
            };

            const { error } = await supabase.from('Clips').insert([newClipData]);
            if (error) throw error;

            toast.success('¡Recorte generado con éxito!', { id: toastId });
            fetchClips();
            return cutUrl; 

        } catch (error) {
            console.error(error);
            toast.error(`Fallo en recorte: ${error.message}`, { id: toastId });
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // --- 4. ACCIÓN: CREAR NUEVO CLIP DESDE CERO ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newClip.video_url || !newClip.title) {
            toast.error("Falta información");
            return;
        }

        setIsProcessing(true); 
        const toastId = toast.loading('⏳ Procesando y guardando...');

        try {
            const finalUrl = await cutVideoOnBackend(newClip.video_url, newClip.start_time, newClip.end_time, newClip.title);

            const { error } = await supabase.from('Clips').insert([{
                ...newClip,
                video_url: finalUrl,
                start_time: parseInt(newClip.start_time),
                end_time: parseInt(newClip.end_time)
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

    // --- 5. AUTO-RELLENO INFO VIDEO (CORREGIDO) ---
    const fetchVideoInfo = async (url) => {
        // Validaciones
        if (!url.includes('http')) return;
        if (url.includes('googlevideo.com')) return; // Ya es procesado

        const toastId = toast.loading('Analizando enlace de YouTube...');
        
        try {
            // Llamada al Backend
            const res = await fetch(`${API_URL}/api/info`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ url })
            });
            
            if (!res.ok) throw new Error('No se pudo obtener el video');
            
            const data = await res.json();

            // --- AQUÍ ESTABA EL PROBLEMA ---
            // Ahora guardamos data.video_url (el link real) en lugar de la url de YouTube
            setNewClip(prev => ({
                ...prev, 
                title: data.title || prev.title,
                show_title: data.title || prev.show_title,
                thumbnail: data.thumbnail || prev.thumbnail, 
                video_url: data.video_url, // <--- ESTO ES LO IMPORTANTE
                end_time: '30'
            }));
            
            toast.success('¡Video listo para usar!', { id: toastId });

        } catch (e) {
            console.error("Error fetchVideoInfo:", e);
            toast.error('No se pudo procesar el enlace', { id: toastId });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewClip(prev => ({ ...prev, [name]: value }));
        // Si cambia la URL y es larga (probablemente un link), intentamos buscar info
        if (name === 'video_url' && value.length > 15) fetchVideoInfo(value);
    };

    useEffect(() => { fetchClips(); }, []); 

    const filteredClips = clips.filter(clip => 
        clip.title?.toLowerCase().includes(filter.toLowerCase())
    );

    return { 
        clips, filteredClips, loading, isProcessing, newClip, setFilter, 
        isModalOpen, setIsModalOpen, handleInputChange, handleSubmit,
        handleTrimExistingClip
    };
};

export default useClips;