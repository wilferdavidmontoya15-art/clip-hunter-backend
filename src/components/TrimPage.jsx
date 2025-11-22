import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useClips from '../hooks/useClips';  // Tu hook

const TrimPage = () => {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get('videoId') || '';
  const start = parseInt(searchParams.get('start')) || 0;
  const end = parseInt(searchParams.get('end')) || 30;

  const [currentStart, setCurrentStart] = useState(start);
  const [currentEnd, setCurrentEnd] = useState(end);
  const [duration, setDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const { loading, error, clip, createClip } = useClips();

  useEffect(() => {
    if (videoId) {
      createClip(`https://www.youtube.com/watch?v=${videoId}`, currentStart, currentEnd);
    }
  }, [videoId, currentStart, currentEnd]);

  useEffect(() => {
    if (clip) {
      setPreviewUrl(clip.embed_url);
      setDownloadUrl(clip.download_url || '');
      setDuration(clip.duration || 60);
    }
  }, [clip]);

  const handleSliderChange = (type) => (e) => {
    const value = parseInt(e.target.value);
    if (type === 'start') {
      setCurrentStart(value);
      if (currentEnd - value < 1) setCurrentEnd(value + 1);
      if (currentEnd - value > 30) setCurrentEnd(value + 30);
    } else {
      setCurrentEnd(value);
      if (value - currentStart > 30) setCurrentStart(value - 30);
      if (value - currentStart < 1) setCurrentStart(value - 1);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) window.location.href = downloadUrl;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: clip?.title,
        url: clip?.short_url,
        text: 'Mira este clip viral que recorté en ClipHunter!'
      });
    } else {
      navigator.clipboard.writeText(clip?.short_url);
      alert('URL copiada al portapapeles – compártela en WhatsApp o TikTok!');
    }
  };

  if (loading) return <div>Procesando video... No cierres esta ventana.</div>;
  if (error) return <div>Error: {error}. Intenta de nuevo.</div>;

  return (
    <div className="trim-page">
      <h1>Recorta tu Clip Viral (Máx 30 seg – 100% Legal)</h1>
      <div className="preview">
        <iframe src={previewUrl} title="Preview Clip" allowFullScreen></iframe>
      </div>
      <div className="timeline">
        <label>Inicio: {currentStart}s</label>
        <input type="range" min="0" max={duration - 1} value={currentStart} onChange={handleSliderChange('start')} />
        <label>Fin: {currentEnd}s</label>
        <input type="range" min="1" max={duration} value={currentEnd} onChange={handleSliderChange('end')} />
        <p>Duración: {currentEnd - currentStart}s (Máx 30s para uso legal)</p>
      </div>
      <button onClick={handleDownload} disabled={!downloadUrl}>Descargar MP4 (Fair Use Legal)</button>
      <button onClick={handleShare}>Compartir en WhatsApp/TikTok</button>
      <div className="ads">
        {/* Espacio para anuncio Ezoic/AdSense */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
        <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXX" data-ad-slot="XXXX"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      </div>
    </div>
  );
};

export default TrimPage;