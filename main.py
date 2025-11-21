import os
import subprocess
import uuid
import shutil
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
# CORRECCIÓN: Usamos el cliente oficial que sí instalaste
from supabase import create_client 
import yt_dlp

# --- LECTURA DE VARIABLES ---
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

# --- CORS (Permitir acceso desde tu web) ---
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

# 1. OBTENER INFO (METADATA)
@app.post("/api/info")
def get_video_info(request: VideoRequest):
    try:
        ydl_opts = {
            'quiet': True, 'no_warnings': True, 'format': 'best',
            'nocheckcertificate': True, 'ignoreerrors': True, 'geo_bypass': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        print(f"Buscando info: {request.url}")
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

# 2. CORTAR VIDEO (LA MAGIA)
@app.post("/api/cut")
def cut_video(request: ClipRequest):
    if not storage:
        raise HTTPException(status_code=503, detail="Error de configuración de Storage.")

    # Nombres de archivo únicos
    file_id = str(uuid.uuid4())
    temp_download = f"/tmp/{file_id}_raw.mp4"
    final_clip = f"/tmp/{file_id}_cut.mp4"
    bucket_name = "clips-cortados" # ¡ASEGÚRATE DE CREAR ESTE BUCKET EN SUPABASE!

    try:
        print(f"1. Descargando: {request.video_url}")
        ydl_opts = {
            'format': 'mp4/best', # Forzar MP4 para evitar errores de compatibilidad
            'outtmpl': temp_download,
            'quiet': True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([request.video_url])

        print(f"2. Cortando de {request.start_time} a {request.end_time}")
        # Comando FFmpeg optimizado
        subprocess.run([
            'ffmpeg', '-y',
            '-i', temp_download,
            '-ss', str(request.start_time),
            '-to', str(request.end_time),
            '-c:v', 'libx264', # Re-codificar para asegurar compatibilidad web
            '-c:a', 'aac',
            '-strict', 'experimental',
            final_clip
        ], check=True, capture_output=True)

        print("3. Subiendo a Supabase...")
        file_name = f"{request.title.replace(' ', '_')}_{file_id}.mp4"
        
        with open(final_clip, 'rb') as f:
            storage.from_(bucket_name).upload(
                file=f, 
                path=file_name, 
                file_options={"content-type": "video/mp4"}
            )

        # Obtener URL pública
        public_url = storage.from_(bucket_name).get_public_url(file_name)
        print(f"Listo: {public_url}")
        
        return {"status": "success", "public_url": public_url}

    except Exception as e:
        print(f"ERROR CUT: {e}")
        raise HTTPException(status_code=500, detail=f"Fallo al procesar: {str(e)}")
    
    finally:
        # Limpieza de basura
        if os.path.exists(temp_download): os.remove(temp_download)
        if os.path.exists(final_clip): os.remove(final_clip)