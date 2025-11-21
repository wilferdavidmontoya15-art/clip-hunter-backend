# Usa una imagen base de Python reciente
FROM python:3.11-slim

# Instala FFmpeg, la herramienta que corta videos
RUN apt-get update && apt-get install -y ffmpeg

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de Python (main.py, requirements.txt)
COPY . .

# Instala las dependencias de Python (incluido uvicorn)
RUN pip install --no-cache-dir -r requirements.txt

# Comando para iniciar la aplicación con uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]