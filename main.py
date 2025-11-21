import os
import subprocess
import uuid
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
import yt_dlp

# --- 1. CONFIGURACIÓN DE ENTORNO ---
# IMPORTANTE: Asegúrate de tener estas variables en el panel de Railway > Variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# Inicialización segura de Supabase
storage = None
try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        storage = supabase_client.storage
        print("✅ Conexión a Supabase exitosa")
    else:
        print("⚠️ WARNING: Faltan credenciales de Supabase en las variables de entorno.")
except Exception as e:
    print(f"❌ ERROR CRÍTICO: No se pudo conectar a Supabase: {e}")

app = FastAPI()

# --- 2. CONFIGURACIÓN DE CORS BLINDADA ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     # Permite conexiones desde cualquier lugar (Netlify, localhost, etc.)
    allow_credentials=False, # <--- IMPORTANTE: False para que el asterisco (*) funcione sin errores
    allow_methods=["*"],     # Permite todos los métodos (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],     # Permite todos los headers
)

# --- 3. MODELOS DE DATOS ---
class VideoRequest(BaseModel):
    url: str

class ClipRequest(BaseModel):
    video_url: str
    start_time: float 
    end_time: float   
    title: str = "clip"

# --- 4. ENDPOINTS ---

@app.get("/")
def read_root():
    return {"status": "online", "service": "ClipHunter Backend"}

# Endpoint 1: Obtener información del video
@app.post("/api/info")
def get_video_info(request: VideoRequest):
    try:
        ydl_opts = {
            'quiet': True, 
            'no_warnings': True, 
            'format': 'best',
            'nocheckcertificate': True, 
            'ignoreerrors': True, 
            'geo_bypass': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        print(f"🔍 Buscando info para: {request.url}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            
            if not info or 'title' not in info:
                raise ValueError("No se pudo extraer información del video.")
            
            duration = info.get('duration') or 0
            
            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "duration": duration,
                "video_url": info.get('webpage_url', request.url), 
                "original_url": request.url
            }

    except Exception as e:
        print(f"❌ ERROR INFO: {e}")
        raise HTTPException(status_code=400, detail=f"Error al obtener video: {str(e)}")

# Endpoint 2: Cortar y Subir el video
@app.post("/api/cut")
def cut_video(request: ClipRequest):
    if not storage:
        raise HTTPException(status_code=503, detail="El almacenamiento no está configurado en el servidor.")

    file_id = str(uuid.uuid4())
    # Rutas temporales en Railway (/tmp es la única carpeta escribible)
    temp_download = f"/tmp/{file_id}_raw.mp4"
    final_clip = f"/tmp/{file_id}_cut.mp4"
    bucket_name = "clips-cortados" 

    try:
        # A. Descargar video original
        print(f"⬇️ Descargando video: {request.video_url}")
        ydl_opts = {
            'format': 'mp4[height<=720]', 
            'outtmpl': temp_download, 
            'quiet': True,
            'overwrites': True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([request.video_url])

        # B. Cortar con FFmpeg
        print(f"✂️ Cortando desde {request.start_time} hasta {request.end_time}")
        
        duration = request.end_time - request.start_time
        subprocess.run([
            'ffmpeg', 
            '-y',               
            '-ss', str(request.start_time), 
            '-i', temp_download,            
            '-t', str(duration),            
            '-c:v', 'libx264',  
            '-c:a', 'aac',      
            '-strict', 'experimental',
            '-preset', 'fast',  
            final_clip
        ], check=True, capture_output=True)

        # C. Subir a Supabase
        print(f"☁️ Subiendo a Supabase: {bucket_name}")
        safe_title = "".join([c if c.isalnum() else "_" for c in request.title])[:50] 
        file_name = f"{safe_title}_{file_id}.mp4"
        
        with open(final_clip, 'rb') as f:
            storage.from_(bucket_name).upload(
                file=f, 
                path=file_name, 
                file_options={"content-type": "video/mp4"}
            )

        # D. Obtener URL pública
        public_url = storage.from_(bucket_name).get_public_url(file_name)
        print(f"✅ Éxito! URL: {public_url}")
        
        return {
            "status": "success", 
            "public_url": public_url,
            "message": "Clip generado correctamente"
        }

    except subprocess.CalledProcessError as e:
        print(f"❌ ERROR FFMPEG: {e.stderr}")
        raise HTTPException(status_code=500, detail="Error al procesar el video con FFmpeg.")
    except Exception as e:
        print(f"❌ ERROR GENERAL: {e}")
        raise HTTPException(status_code=500, detail=f"Fallo en el servidor: {str(e)}")
    finally:
        # Limpieza de archivos
        if os.path.exists(temp_download): os.remove(temp_download)
        if os.path.exists(final_clip): os.remove(final_clip)
```

### 🚀 ¡A despegar!

Una vez que guardes esto en `main.py` (en la carpeta del backend), corre estos comandos en tu terminal y espera a que Railway se ponga en verde:

```bash
git add .
git commit -m "Servidor final corregido"
git push