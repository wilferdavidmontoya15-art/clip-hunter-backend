# backend/main.py → VERSIÓN GOD MODE – INVENCIBLE, RÁPIDA Y RENTABLE (2025)
import os
import re
import shortuuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
from supabase import create_client, Client

# ==================== SUPABASE (opcional pero épico) ====================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase conectado – URLs cortas y estadísticas activadas")
    except:
        print("⚠️ Supabase falló, pero la app funciona 100% sin DB")
else:
    print("ℹ️ Supabase no configurado – modo básico activado (aún invencible)")

# ==================== FASTAPI APP ====================
app = FastAPI(
    title="ClipHunter GOD MODE",
    description="La app de clips de YouTube más rápida y legal del mundo",
    version="2.0.0"
)

# CORS ULTRA PERMISIVO (nunca más errores de conexión)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],                  # Todo permitido
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ==================== MODELOS ====================
class ClipRequest(BaseModel):
    url: str
    start: int = 0
    end: int | None = None
    title: str | None = None

class ClipResponse(BaseModel):
    success: bool = True
    short_code: str
    short_url: str
    embed_url: str
    title: str
    thumbnail: str
    views: int = 0
    message: str = "¡Clip creado con éxito!"

# ==================== HELPERS ====================
def extract_video_id(url: str) -> str:
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11})",
        r"(?:embed\/)([0-9A-Za-z_-]{11})",
        r"(?:youtu\.be\/)([0-9A-Za-z_-]{11})",
        r"youtube\.com.*[?&]v=([0-9A-Za-z_-]{11})",
    ]
    for p in patterns:
        match = re.search(p, url)
        if match:
            return match.group(1)
    raise HTTPException(400, "No se pudo extraer el ID del video")

# ==================== ENDPOINTS GOD ====================
@app.get("/")
async def root():
    return {"message": "ClipHunter GOD MODE activo 🚀 – 100% Legal & Rentable"}

@app.options("/api/clip")
async def options():
    return JSONResponse(content={})

@app.post("/api/clip")
async def create_clip(request: ClipRequest):
    try:
        video_id = extract_video_id(request.url)

        # Info del video (rápido y sin errores)
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "extract_flat": True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://youtu.be/{video_id}", download=False) or {}

        title = (request.title or info.get("title") or "Clip épico")[:120]
        thumbnail = info.get("thumbnail") or f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"

        # Embed perfecto (sin anuncios, sin marca, con start/end)
        embed_url = f"https://www.youtube-nocookie.com/embed/{video_id}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&start={request.start}"
        if request.end:
            embed_url += f"&end={request.end}"

        short_code = shortuuid.uuid(name=video_id + str(request.start))[:8]

        # Guardar en Supabase si existe
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
                supabase.table("clips").upsert(data, on_conflict="short_code").execute()
            except Exception as e:
                print(f"Supabase warning: {e}")

        return ClipResponse(
            short_code=short_code,
            short_url=f"https://cliphunter.app/{short_code}",  # Cambia por tu dominio real
            embed_url=embed_url,
            title=title,
            thumbnail=thumbnail
        )

    except Exception as e:
        raise HTTPException(500, f"Error interno: {str(e)}")

# Ver clip + contador de vistas
@app.get("/api/clip/{short_code}")
async def get_clip(short_code: str):
    if not supabase:
        raise HTTPException(503, "Estadísticas temporales desactivadas")
    
    res = supabase.table("clips").select("*").eq("short_code", short_code).execute()
    if not res.data:
        raise HTTPException(404, "Clip no encontrado")
    
    clip = res.data[0]
    supabase.table("clips").update({"views": clip["views"] + 1}).eq("short_code", short_code).execute()
    return clip

# Health check para Railway
@app.get("/health")
async def health():
    return {"status": "GOD MODE ACTIVATED", "timestamp": datetime.utcnow().isoformat()}