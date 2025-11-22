# Usa una imagen base de Python reciente
FROM python:3.11-slim

# Instala FFmpeg (necesario para recortar)
RUN apt-get update && apt-get install -y ffmpeg

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos del proyecto
COPY . .

# Instala las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# --- CAMBIO IMPORTANTE AQUÍ ---
# Usamos la forma "Shell" (sin corchetes) para que lea la variable $PORT correctamente
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 🚀 Subir la corrección

Una vez guardado el archivo, abre la terminal en esa carpeta (`clip-hunter-backend`) y ejecuta los comandos de siempre:

```bash
git add .
git commit -m "Arreglar puerto Dockerfile"
git push -u origin main --force