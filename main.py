import os
import subprocess
import uuid
import shutil 
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
# IMPORTACIÓN CORRECTA: Cliente oficial
from supabase import create_client 
import yt_dlp

# --- LECTURA DE VARIABLES DE ENTORNO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL") 
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") 

# Inicialización de Supabase
storage = None
try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        storage = supabase_client.storage
    else:
        print("WARNING: Faltan credenciales de Supabase.")
except Exception as e:
    print(f"WARNING: Error conectando a Supabase: {e}")

app = FastAPI()

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    url: str

class ClipRequest(BaseModel):
    video_url: str
    start_time: int
    end_time: int
    title: str = "clip"

# 1. OBTENER INFO
@app.post("/api/info")
def get_video_info(request: VideoRequest):
    try:
        ydl_opts = {
            'quiet': True, 'no_warnings': True, 'format': 'best',
            'nocheckcertificate': True, 'ignoreerrors': True, 'geo_bypass': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        print(f"Info: {request.url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            if not info or 'title' not in info:
                raise ValueError("Video no disponible.")
            
            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "duration": info.get('duration'),
                "original_url": request.url
            }
    except Exception as e:
        print(f"ERROR INFO: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# 2. CORTAR VIDEO
@app.post("/api/cut")
def cut_video(request: ClipRequest):
    if not storage:
        raise HTTPException(status_code=503, detail="Storage no configurado.")

    file_id = str(uuid.uuid4())
    temp_download = f"/tmp/{file_id}_raw.mp4"
    final_clip = f"/tmp/{file_id}_cut.mp4"
    bucket_name = "clips-cortados"

    try:
        print(f"Descargando: {request.video_url}")
        ydl_opts = {'format': 'mp4', 'outtmpl': temp_download, 'quiet': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([request.video_url])

        print(f"Cortando {request.start_time}-{request.end_time}")
        subprocess.run([
            'ffmpeg', '-y', '-i', temp_download,
            '-ss', str(request.start_time),
            '-to', str(request.end_time),
            '-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental',
            final_clip
        ], check=True, capture_output=True)

        print("Subiendo...")
        file_name = f"{request.title.replace(' ', '_')}_{file_id}.mp4"
        
        # Subir usando el método correcto de la librería oficial
        with open(final_clip, 'rb') as f:
            storage.from_(bucket_name).upload(
                file=f, 
                path=file_name, 
                file_options={"content-type": "video/mp4"}
            )

        public_url = storage.from_(bucket_name).get_public_url(file_name)
        return {"status": "success", "public_url": public_url}

    except Exception as e:
        print(f"ERROR CUT: {e}")
        raise HTTPException(status_code=500, detail=f"Fallo al procesar: {str(e)}")
    finally:
        if os.path.exists(temp_download): os.remove(temp_download)
        if os.path.exists(final_clip): os.remove(final_clip)