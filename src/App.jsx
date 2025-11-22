import React, { useState } from 'react';
import { PlusCircle, Search, Film, Filter } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import useClips, { EMOTIONS } from './hooks/useClips.jsx'; 
import ClipCard from './components/ClipCard.jsx'; 
import ClipModal from './components/ClipModal.jsx'; 
import TrimModal from './components/TrimModal.jsx'; 

function App() {
  const { 
    clips, 
    filteredClips, 
    loading, 
    newClip, 
    setFilter, 
    isModalOpen, 
    setIsModalOpen, 
    handleInputChange, 
    handleSubmit,
    isProcessing,
    handleTrimExistingClip // <--- 1. IMPORTANTE: Extraemos esta función nueva
  } = useClips();

  // Estado local para la categoría activa
  const [activeCategory, setActiveCategory] = useState('Todos');
  
  // Estado para saber qué clip se está recortando
  const [clipToTrim, setClipToTrim] = useState(null);

  // 2. NUEVO: Función intermediaria para manejar la confirmación del recorte
  const onTrimConfirm = async (clip, start, end) => {
    try {
      // Llamamos a la función del hook que conecta con Railway
      const newUrl = await handleTrimExistingClip(clip, start, end);
      
      // Opcional: Si quieres abrir el video nuevo en otra pestaña
      // if (newUrl) window.open(newUrl, '_blank');
      
      // Cerramos el modal solo si tuvo éxito (el hook maneja el error con toast)
      setClipToTrim(null);
    } catch (error) {
      console.error("Error en el recorte desde App:", error);
    }
  };

  // Lógica de filtrado combinada (Texto + Categoría)
  const displayClips = filteredClips.filter(clip => {
    if (activeCategory === 'Todos') return true;
    return clip.emotion === activeCategory;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      }}/>

      {/* HEADER STICKY */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Film className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  ClipHunter
                </h1>
                <span className="text-xs text-slate-500 font-medium tracking-wider">VIRAL LIBRARY</span>
              </div>
            </div>
            
            {/* Buscador y Botón */}
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative group flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar clips..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm text-white placeholder-slate-600 transition-all"
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-95 font-medium whitespace-nowrap"
              >
                <PlusCircle size={20} />
                <span className="hidden sm:inline">Nuevo Clip</span>
              </button>
            </div>
          </div>

          {/* BARRA DE CATEGORÍAS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Filter size={16} className="text-slate-500 min-w-[16px]" />
            <button 
              onClick={() => setActiveCategory('Todos')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                activeCategory === 'Todos' 
                  ? 'bg-white text-slate-900' 
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              Todos
            </button>
            {EMOTIONS.map(emotion => (
              <button 
                key={emotion}
                onClick={() => setActiveCategory(emotion)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  activeCategory === emotion 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {emotion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-20">
        {loading && (
          <div className="flex flex-col items-center justify-center mt-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-500 text-sm animate-pulse">Cargando biblioteca...</p>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayClips.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                <div className="bg-slate-800 p-6 rounded-full mb-6">
                  <Film size={48} className="text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No se encontraron clips</h3>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="text-blue-400 hover:text-blue-300 font-semibold hover:underline"
                >
                  Subir video ahora
                </button>
              </div>
            ) : (
              displayClips.map((clip) => (
                <ClipCard 
                  key={clip.id} 
                  clip={clip}
                  onTrimClick={() => setClipToTrim(clip)} 
                /> 
              ))
            )}
          </div>
        )}
      </main>

      <ClipModal 
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        newClip={newClip}
        EMOTIONS={EMOTIONS}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isProcessing={isProcessing}
      />

      {/* 3. MODAL DE RECORTE CONECTADO */}
      <TrimModal 
        isOpen={!!clipToTrim} 
        // Solo permitimos cerrar si no está procesando
        onClose={() => !isProcessing && setClipToTrim(null)}
        clip={clipToTrim}
        onTrimConfirm={onTrimConfirm} // Conectamos la acción
        isProcessing={isProcessing}   // Pasamos el estado de carga
      />
    </div>
  );
}

export default App;