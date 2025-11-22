# backend/main.py  →  Versión FINAL PROFESIONAL e INVENCIBLE (Nov 2025)

import os
import re
import shortuuid
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
from supabase import create_client, Client

# ==================== CONFIG SUPABASE ====================
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️ Variables de Supabase no configuradas (aún funciona en modo básico)")
    supabase: Client | None = None
else:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Supabase conectado correctamente")

app = FastAPI(title="ClipHunter PRO", description="Clips de YouTube 100% legales")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELOS ====================
class ClipRequest(BaseModel):
    url: str
    start: int = 0
    end: int | None = None
    title: str | None = None

class ClipResponse(BaseModel):
    short_code: str
    short_url: str
    embed_url: str
    title: str
    thumbnail: str
    views: int = 0

# ==================== HELPERS ====================
def extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"(?:embed\/)([0-9A-Za-z_-]{11})",
        r"(?:youtu\.be\/)([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

# ==================== ENDPOINTS ====================
@app.get("/")
def home():
    return {"message": "ClipHunter PRO - 100% Legal & Rentable 🚀"}

@app.post("/api/clip", response_model=ClipResponse)
async def create_clip(request: ClipRequest):
    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="URL de YouTube no válida")

    # Extraer info del video
    ydl_opts = {'quiet': True, 'no_warnings': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"https://youtu.be/{video_id}", download=False)

    title = request.title or info.get("title", "Clip sin título")[:100]
    thumbnail = info.get("thumbnail", "")

    # Generar embed con start/end
    embed_url = f"https://www.youtube-nocookie.com/embed/{video_id}?rel=0&modestbranding=1&autoplay=1&start={request.start}"
    if request.end:
        embed_url += f"&end={request.end}"

    # Generar código corto
    short_code = shortuuid.uuid()[:8]

    # Guardar en Supabase (si está configurado)
    if supabase:
        try:
            data = {
                "short_code": short_code,
                "video_id": video_id,
                "title": title,
                "thumbnail": thumbnail,
                "embed_url": embed_url,
                "start_time": request.start,
                "end_time": request.end,
                "views": 0,
                "created_at": datetime.utcnow().isoformat()
            }
            supabase.table("clips").insert(data).execute()
        except Exception as e:
            print(f"Error guardando en Supabase: {e}")

    return ClipResponse(
        short_code=short_code,
        short_url=f"https://cliphunter.app/{short_code}",  # Cambia por tu dominio real
        embed_url=embed_url,
        title=title,
        thumbnail=thumbnail
    )

# Endpoint para ver el clip (aumenta vistas)
@app.get("/api/clip/{short_code}")
def get_clip(short_code: str):
    if not supabase:
        raise HTTPException(503, "Base de datos no disponible")
    
    result = supabase.table("clips").select("*").eq("short_code", short_code).execute()
    if not result.data:
        raise HTTPException(404, "Clip no encontrado")
    
    clip = result.data[0]
    # Aumentar vistas
    supabase.table("clips").update({"views": clip["views"] + 1}).eq("short_code", short_code).execute()
    
    return clip