import React from 'react';
import { X } from 'lucide-react';
// 1. Aquí importamos la lista real
import { EMOTIONS } from '../hooks/useClips.jsx'; 

// 2. CORRECCIÓN AQUÍ: Borré "EMOTIONS" de estos paréntesis.
// Ahora el código usará la lista importada arriba en lugar de esperar una prop vacía.
const ClipModal = ({ isModalOpen, setIsModalOpen, newClip, handleInputChange, handleSubmit }) => {
  
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button 
          onClick={() => setIsModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-white">Nuevo Recorte</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Título del Clip</label>
            <input required name="title" value={newClip.title} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white" placeholder="Ej: Escena triste" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Título Película/Serie</label>
            <input required name="show_title" value={newClip.show_title} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white" placeholder="Ej: Up: Una Aventura de Altura" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Link YouTube</label>
            <input required name="video_url" value={newClip.video_url} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white" placeholder="https://youtube.com/..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm text-slate-400 mb-1">Tipo de Escena (Emoción)</label>
                {/* Ahora usa la lista EMOTIONS importada correctamente */}
                <select name="emotion" value={newClip.emotion} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white">
                    {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)} 
                </select>
            </div>
            
            <div>
                <label className="block text-sm text-slate-400 mb-1">Categoría</label>
                <select name="category" value={newClip.category} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white">
                  <option>Acción</option><option>Drama</option><option>Documental</option><option>General</option>
                </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-slate-400 mb-1">Inicio (s)</label><input required type="number" name="start_time" value={newClip.start_time} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white" /></div>
            <div><label className="block text-sm text-slate-400 mb-1">Fin (s)</label><input required type="number" name="end_time" value={newClip.end_time} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white" /></div>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4">Publicar Clip</button>
        </form>
      </div>
    </div>
  );
};

export default ClipModal;