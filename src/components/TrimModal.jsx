import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { X, Scissors, Play, RefreshCw, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const TrimModal = ({ isOpen, onClose, clip, onTrimConfirm, isProcessing }) => {
  const playerRef = useRef(null);
  
  // Estados
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(10);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Reiniciar al abrir
  useEffect(() => {
    if (isOpen && clip) {
      setStart(0);
      setEnd(10);
      setIsPlaying(false);
      setIsReady(false);
    }
  }, [isOpen, clip]);

  if (!isOpen || !clip) return null;

  // Cargar duración real
  const handleDuration = (d) => {
    setDuration(d);
    const defaultEnd = clip.end_time && clip.end_time > 0 ? clip.end_time : Math.min(d, 30);
    setEnd(defaultEnd);
    setIsReady(true);
  };

  // Ajuste fino de tiempo (+/- 1 segundo)
  const adjustTime = (type, amount) => {
    if (type === 'start') {
      const newVal = Math.max(0, Math.min(start + amount, end - 1));
      setStart(newVal);
      playerRef.current.seekTo(newVal, 'seconds');
    } else {
      const newVal = Math.max(start + 1, Math.min(end + amount, duration));
      setEnd(newVal);
      playerRef.current.seekTo(newVal, 'seconds');
    }
    setIsPlaying(false);
  };

  const handleConfirm = () => {
    if (onTrimConfirm) {
      setIsPlaying(false);
      onTrimConfirm(clip, start, end);
    }
  };

  const previewCut = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(start, 'seconds');
      setIsPlaying(true);
      setTimeout(() => {
        setIsPlaying(false);
      }, (end - start) * 1000);
    }
  };

  // Formatear tiempo bonito (00:00)
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Fondo oscuro */}
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
        onClick={!isProcessing ? onClose : undefined}
      />

      <div className="relative w-full max-w-5xl bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Scissors className="text-blue-500" size={20} />
              Editor de Clips
            </h3>
            <p className="text-xs text-slate-400 truncate max-w-md">{clip.title}</p>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
              <X size={24} />
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
          
          {/* 1. ÁREA DEL VIDEO (Izquierda/Arriba) */}
          <div className="relative flex-grow bg-black flex items-center justify-center min-h-[300px] lg:min-h-[400px]">
             <div className="w-full h-full aspect-video relative">
               <ReactPlayer
                  ref={playerRef}
                  url={clip.video_url}
                  width="100%"
                  height="100%"
                  controls={true}
                  playing={isPlaying}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onDuration={handleDuration}
                  config={{ youtube: { playerVars: { showinfo: 0 } } }}
                />
                
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-6"></div>
                    <h4 className="text-xl font-bold text-white mb-2">Procesando tu clip...</h4>
                    <p className="text-blue-400 animate-pulse">No cierres esta ventana</p>
                  </div>
                )}
             </div>
          </div>

          {/* 2. PANEL DE CONTROL (Derecha/Abajo) */}
          <div className="w-full lg:w-[350px] bg-slate-900 border-l border-slate-800 flex flex-col">
            
            <div className="p-6 space-y-8 flex-grow overflow-y-auto">
              
              {/* Control INICIO */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">Inicio del Clip</label>
                  <span className="font-mono text-white bg-slate-800 px-2 py-1 rounded text-sm">{formatTime(start)}</span>
                </div>
                <input 
                  type="range" min={0} max={duration} step={0.1} value={start}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val < end) { setStart(val); playerRef.current.seekTo(val, 'seconds'); setIsPlaying(false); }
                  }}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between gap-2">
                  <button onClick={() => adjustTime('start', -1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded transition-colors border border-slate-700">-1s</button>
                  <button onClick={() => adjustTime('start', 1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded transition-colors border border-slate-700">+1s</button>
                </div>
              </div>

              {/* Control FIN */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-purple-400 uppercase tracking-wider">Fin del Clip</label>
                  <span className="font-mono text-white bg-slate-800 px-2 py-1 rounded text-sm">{formatTime(end)}</span>
                </div>
                <input 
                  type="range" min={0} max={duration} step={0.1} value={end}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val > start) { setEnd(val); playerRef.current.seekTo(val, 'seconds'); setIsPlaying(false); }
                  }}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  style={{ accentColor: '#a855f7' }} // Color morado para diferenciar
                />
                <div className="flex justify-between gap-2">
                  <button onClick={() => adjustTime('end', -1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded transition-colors border border-slate-700">-1s</button>
                  <button onClick={() => adjustTime('end', 1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded transition-colors border border-slate-700">+1s</button>
                </div>
              </div>

              {/* Resumen */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
                 <div className="flex items-center gap-2 text-slate-400">
                    <Clock size={16} />
                    <span className="text-xs font-medium">Duración total</span>
                 </div>
                 <span className="text-xl font-bold text-white font-mono">{(end - start).toFixed(1)}s</span>
              </div>

            </div>

            {/* Footer Acciones */}
            <div className="p-6 border-t border-slate-800 space-y-3 bg-slate-950">
               <button 
                 onClick={previewCut}
                 disabled={!isReady}
                 className="w-full flex items-center justify-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 py-3 rounded-xl transition-all text-sm font-medium border border-slate-700"
               >
                 <Play size={16} /> Previsualizar Recorte
               </button>

               <button
                onClick={handleConfirm}
                disabled={isProcessing || !isReady || (end - start) <= 0.5}
                className={`
                  w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg
                  ${isProcessing || !isReady
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-95'}
                `}
              >
                <RefreshCw size={18} className={isProcessing ? "animate-spin" : ""} />
                {isProcessing ? 'Procesando...' : '✂️ Confirmar y Descargar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrimModal;