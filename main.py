import os
import subprocess
import uuid
import shutil 
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
# CORRECCIÓN CLAVE: Importamos el cliente oficial
from supabase import create_client 
import yt_dlp

# --- LECTURA DE VARIABLES DE ENTORNO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL") 
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") 
# ----------------------------------------

# Inicialización del cliente de Supabase
storage = None
try:
    if SUPABASE_URL and SUPABASE_KEY:
        # Crea el cliente y accede al Storage
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        storage = supabase_client.storage
    else:
        print("WARNING: Faltan credenciales de Supabase.")
except Exception as e:
    print(f"WARNING: Error al conectar con Supabase: {e}")

app = FastAPI()

# --- CONFIGURACIÓN DE SEGURIDAD (CORS) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DATOS ---
class VideoRequest(BaseModel):
    url: str

class ClipRequest(BaseModel):
    video_url: str
    start_time: int = Field(..., ge=0, description="Tiempo de inicio del clip en segundos.")
    end_time: int = Field(..., gt=0, description="Tiempo de fin del clip en segundos.")
    file_name_prefix: str = Field("clip", description="Prefijo para el nombre del archivo final.")


## ---------------------------------------------
## 1. ENDPOINT: OBTENER METADATA
## ---------------------------------------------
@app.post("/api/info")
def get_video_info(request: VideoRequest) -> Dict[str, Any]:
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
            
            if info is None or info.get('title') is None:
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
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


## ------------------------------------------
## 2. ENDPOINT: CORTAR Y SUBIR VIDEO (NUEVA FUNCIÓN)
## ------------------------------------------
@app.post("/api/cut")
def cut_video_and_upload(request: ClipRequest):
    if not storage:
        raise HTTPException(status_code=503, detail="El servicio de almacenamiento no está disponible. Revisa las variables de Supabase.")

    # Rutas temporales de Linux (se usa /tmp para el almacenamiento efímero de Railway)
    temp_download_path = f"/tmp/{uuid.uuid4()}.mp4"
    final_clip_path = f"/tmp/{uuid.uuid4()}_cut.mp4"
    bucket_name = "clips-cortados" # Asumiendo que has creado este bucket en Supabase

    try:
        # 1. DESCARGAR VIDEO (Descarga el archivo completo)
        print(f"Iniciando descarga de {request.video_url}...")
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
            'outtmpl': temp_download_path,
            'quiet': True,
            'no_warnings': True,
            'ignoreerrors': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([request.video_url])

        # 2. CORTAR VIDEO USANDO FFmpeg
        print(f"Cortando de {request.start_time}s a {request.end_time}s...")
        ffmpeg_command = [
            'ffmpeg',
            '-i', temp_download_path,
            '-ss', str(request.start_time),
            '-to', str(request.end_time),
            '-c', 'copy',
            final_clip_path
        ]
        
        # Ejecutar el comando FFmpeg
        subprocess.run(ffmpeg_command, check=True, capture_output=True)
        print("Corte realizado con éxito.")

        # 3. SUBIR EL CLIP CORTADO A SUPABASE STORAGE
        storage_path = f"{request.file_name_prefix}-{uuid.uuid4()}.mp4"
        
        # CORRECCIÓN: Usamos storage.from_ por el cambio de librería
        with open(final_clip_path, 'rb') as f:
            storage.from_(bucket_name).upload(
                file=f,
                path=storage_path,
                file_options={"content-type": "video/mp4"}
            )
            
        # 4. OBTENER LA URL PÚBLICA DEL CLIP
        public_url = storage.from_(bucket_name).get_public_url(storage_path)
        print(f"Clip subido. URL: {public_url}")

        return {"status": "success", "public_url": public_url}

    except subprocess.CalledProcessError as e:
        print(f"ERROR EN PROCESO: {e.stderr.decode()}")
        raise HTTPException(status_code=500, detail=f"Fallo en el corte (FFmpeg/yt-dlp): {e.stderr.decode()[:100]}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")
        
    finally:
        # 5. LIMPIEZA: Eliminar los archivos temporales del servidor
        if os.path.exists(temp_download_path):
            os.remove(temp_download_path)
        if os.path.exists(final_clip_path):
            os.remove(final_clip_path)