import React, { useState } from 'react';
import { X, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const BulkModal = ({ isOpen, onClose, onUpload, isProcessing, progressLog }) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const urls = text.split('\n').filter(url => url.trim().length > 0);
    if (urls.length === 0) return;
    onUpload(urls);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-[#1e293b] w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload size={24} className="text-blue-500" />
            Carga Masiva de Videos
          </h2>
          {!isProcessing && (
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!isProcessing ? (
            <>
              <label className="block text-sm text-slate-400 mb-2">
                Pega tus enlaces de YouTube aquí (uno por línea):
              </label>
              <textarea
                className="w-full h-64 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none font-mono"
                placeholder={"https://youtube.com/watch?v=...\nhttps://youtube.com/watch?v=..."}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-2">
                * Se cortarán automáticamente los primeros 60 segundos de cada video.
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
                <span>Procesando cola...</span>
                <Loader size={16} className="animate-spin text-blue-500" />
              </div>
              
              {/* Consola de Progreso */}
              <div className="bg-slate-950 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs border border-slate-800 space-y-2">
                {progressLog.map((log, idx) => (
                  <div key={idx} className={`flex items-start gap-2 ${
                    log.type === 'success' ? 'text-green-400' : 
                    log.type === 'error' ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    {log.type === 'success' && <CheckCircle size={14} className="mt-0.5 shrink-0" />}
                    {log.type === 'error' && <AlertCircle size={14} className="mt-0.5 shrink-0" />}
                    {log.type === 'info' && <Loader size={14} className="mt-0.5 shrink-0 animate-spin" />}
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50 bg-slate-900/30 rounded-b-2xl">
          {!isProcessing ? (
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              <Upload size={20} />
              Procesar Lote
            </button>
          ) : (
            <button disabled className="w-full bg-slate-700 text-slate-400 py-3 rounded-xl font-bold cursor-wait flex items-center justify-center gap-2">
              <Loader size={20} className="animate-spin" />
              Trabajando... No cierres esta ventana
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default BulkModal;