from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI()

# Permitir que tu web (Netlify) hable con este servidor
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"status": "Activo", "message": "Bienvenido al API de ClipHunter"}

@app.post("/api/info")
def get_video_info(request: VideoRequest):
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'format': 'best',
        }

        # Usamos yt-dlp para sacar la info del video
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
        raise HTTPException(status_code=400, detail=str(e))