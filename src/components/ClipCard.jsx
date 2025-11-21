import React, { useState } from 'react';
import ReactPlayer from 'react-player'; // ✅ ESENCIAL: Importamos el reproductor
import { Play, Clock, Film, Scissors } from 'lucide-react';

const ClipCard = ({ clip, onTrimClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // 🎨 MAGIA: Paleta de colores "Neon Glass"
  const getEmotionStyle = (emotion) => {
    const styles = {
      'Comedia': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]',
      'Drama':   'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]',
      'Acción':  'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
      'Feliz':   'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]',
      'Triste':  'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]',
      'Épico':   'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]',
      'Tensa':   'bg-slate-500/10 text-slate-300 border-slate-500/20',
      'General': 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    };
    return styles[emotion] || styles['General'];
  };

  // 🛡️ LÓGICA BLINDADA PARA EL BOTÓN
  const handleTrimAction = (e) => {
    e.preventDefault();  // 1. Evita comportamientos por defecto
    e.stopPropagation(); // 2. DETIENE el clic aquí (no llega a la tarjeta)
    
    if (onTrimClick) {
      console.log("✂️ Abriendo modal de recorte para:", clip.title);
      onTrimClick(); // Abre el modal
    }
  };

  // Calculamos duración segura
  const duration = (clip.end_time && clip.start_time) 
    ? Math.round(clip.end_time - clip.start_time) 
    : 0;

  return (
    <div 
      className="group relative bg-[#0f172a]/60 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden transition-all duration-500 hover:transform hover:-translate-y-1 hover:shadow-2xl hover:border-white/10 flex flex-col h-full"
      // Si el mouse sale de la tarjeta, dejamos de reproducir
      onMouseLeave={() => setIsPlaying(false)}
    >
      
      {/* --- ÁREA DE VISUALIZACIÓN (16:9) --- */}
      <div className="relative aspect-video overflow-hidden bg-black w-full">
        {isPlaying ? (
          // ✅ MODO REPRODUCTOR (Con ReactPlayer para YouTube)
          <div className="w-full h-full fade-in animate-in duration-300">
            <ReactPlayer
              url={clip.video_url}
              width="100%"
              height="100%"
              playing={true} // Autoplay al hacer clic en la tarjeta
              controls={true} // Controles nativos de YouTube
              muted={false}
              // Configuración para limpiar un poco la interfaz de YouTube
              config={{
                youtube: { playerVars: { showinfo: 0, modestbranding: 1 } }
              }}
              onError={(e) => console.error("Error reproduciendo:", e)}
            />
          </div>
        ) : (
          // ✅ MODO MINIATURA (Imagen Estática)
          <>
            {clip.thumbnail ? (
                <img 
                  src={clip.thumbnail} 
                  alt={clip.title} 
                  loading="lazy"
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <Film className="text-slate-700" size={40} />
                </div>
            )}
            
            {/* Gradiente oscuro inferior */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

            {/* Botón Play Gigante (Solo visual) */}
            <button 
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 flex items-center justify-center group/btn cursor-pointer z-10"
            >
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover/btn:scale-110 group-hover/btn:bg-blue-600/90 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
                <Play fill="currentColor" className="text-white ml-1 w-6 h-6" />
              </div>
            </button>

            {/* Etiqueta de Duración */}
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 border border-white/10 z-20">
              <Clock size={10} />
              {duration}s
            </div>
          </>
        )}
      </div>

      {/* --- INFO DEL CLIP --- */}
      <div className="p-5 flex flex-col gap-3 flex-grow">
        
        <div>
          <h3 className="font-bold text-slate-100 text-[1.05rem] leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors mb-1.5" title={clip.title}>
            {clip.title}
          </h3>
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <Film size={12} className="text-blue-500/70" />
            <span className="truncate max-w-[200px]">{clip.show_title || "YouTube Original"}</span>
          </div>
        </div>

        <div className="h-px w-full bg-white/5 mt-auto mb-1"></div>

        <div className="flex justify-between items-center pt-2">
          
          {/* Etiquetas / Tags */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wide ${getEmotionStyle(clip.emotion)}`}>
              {clip.emotion}
            </span>
            {clip.category && clip.category !== clip.emotion && (
               <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                 {clip.category}
               </span>
            )}
          </div>

          {/* --- BOTÓN DE RECORTE --- */}
          <button 
            onClick={handleTrimAction} // Usamos la función corregida
            className="group/icon relative p-2 rounded-full bg-slate-800/50 hover:bg-blue-500 hover:text-white text-slate-400 transition-all border border-slate-700 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 z-30"
            title="Recortar y Descargar"
          >
            <Scissors size={18} />
            
            {/* Tooltip */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 shadow-xl z-10">
              Editar Clip
            </span>
          </button>

        </div>
      </div>
    </div>
  );
};

export default ClipCard;