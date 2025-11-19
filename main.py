from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI()

# --- CONFIGURACIÓN DE SEGURIDAD (CORS) DEFINITIVA ---
# Al poner allow_credentials=False, podemos usar ["*"] sin problemas.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ¡Entra todo el mundo! (Localhost, Netlify, etc)
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"status": "Servidor activo 🚀"}

@app.post("/api/info")
def get_video_info(request: VideoRequest):
    try:
        print(f"Recibiendo petición para: {request.url}")
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'format': 'best',
            'nocheckcertificate': True,
            'ignoreerrors': True,
            'geo_bypass': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            
            # Log de éxito
            print(f"Video encontrado: {info.get('title')}")
            
            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "duration": info.get('duration'),
                "views": info.get('view_count'),
                "original_url": request.url
            }
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")