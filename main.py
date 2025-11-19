from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI()

# CONFIGURACIÓN DE SEGURIDAD (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"status": "Servidor activo y robusto 🛡️"}

@app.post("/api/info")
def get_video_info(request: VideoRequest):
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'format': 'best',
            'nocheckcertificate': True,
            'ignoreerrors': True,
            'no_color': True,
            'geo_bypass': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        print(f"Procesando URL: {request.url}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            
            # --- VALIDACIÓN CRÍTICA ---
            if info is None or info.get('title') is None:
                # Si yt-dlp no encuentra nada, lanzamos un error claro
                raise ValueError("El video no está disponible, requiere inicio de sesión, o está bloqueado por región.")

            print(f"Video encontrado: {info.get('title')}")

            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "duration": info.get('duration'),
                "views": info.get('view_count'),
                "original_url": request.url
            }
            
    except ValueError as ve:
         # Si es un error de validación (video bloqueado), enviamos 404
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
         # Para cualquier otro error (red, timeout)
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")