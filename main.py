from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI()

# --- CONFIGURACIÓN DE SEGURIDAD (CORS) CORREGIDA ---
# Aquí definimos quién tiene permiso para hablar con el servidor
origins = [
    "http://localhost:5173",           # Tu web en modo desarrollo
    "https://clip-hunter.netlify.app", # Tu web publicada (pon aquí tu link real de Netlify si es distinto)
    "*"                                # Comodín (por si acaso)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"status": "Servidor activo y escuchando 👂"}

@app.post("/api/info")
def get_video_info(request: VideoRequest):
    try:
        # Configuración de yt-dlp para extraer info rápido
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'format': 'best',
            # Opciones extra para evitar bloqueos de YouTube
            'nocheckcertificate': True,
            'ignoreerrors': True,
            'no_color': True,
            'geo_bypass': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        print(f"Procesando URL: {request.url}") # Log para ver en Railway
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            
            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "duration": info.get('duration'),
                "views": info.get('view_count'),
                "original_url": request.url
            }
            
    except Exception as e:
        print(f"ERROR GRAVE: {str(e)}") # Esto saldrá en los logs de Railway si falla
        raise HTTPException(status_code=400, detail=f"Error al procesar video: {str(e)}")