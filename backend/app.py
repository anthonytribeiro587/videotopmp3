import os
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl

app = FastAPI(title="Video to MP3 Converter API", version="1.0.0")

raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


class ConvertRequest(BaseModel):
    url: HttpUrl


def is_youtube_url(value: str) -> bool:
    host = (urlparse(value).hostname or "").lower().rstrip(".")
    return host == "youtu.be" or host == "youtube.com" or host.endswith(".youtube.com")


def safe_filename(title: str) -> str:
    cleaned = re.sub(r"[\\/:*?\"<>|]+", "-", title).strip(" .-")
    cleaned = re.sub(r"\s+", " ", cleaned)
    return (cleaned[:120] or "audio") + ".mp3"


def cleanup_directory(path: str) -> None:
    shutil.rmtree(path, ignore_errors=True)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/convert")
def convert_video(payload: ConvertRequest, background_tasks: BackgroundTasks):
    video_url = str(payload.url)

    if not is_youtube_url(video_url):
        raise HTTPException(status_code=400, detail="Envie um link válido do YouTube.")

    workdir = tempfile.mkdtemp(prefix="videotopmp3-")
    output_template = str(Path(workdir) / "%(id)s.%(ext)s")

    ydl_options = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "restrictfilenames": True,
        "retries": 3,
        "fragment_retries": 3,
        "socket_timeout": 30,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_options) as ydl:
            info = ydl.extract_info(video_url, download=True)

        mp3_files = list(Path(workdir).glob("*.mp3"))
        if not mp3_files:
            raise RuntimeError("MP3 output was not created")

        mp3_path = mp3_files[0]
        title = str(info.get("title") or info.get("id") or "audio")
        download_name = safe_filename(title)

        background_tasks.add_task(cleanup_directory, workdir)
        return FileResponse(
            path=mp3_path,
            media_type="audio/mpeg",
            filename=download_name,
            background=background_tasks,
        )
    except yt_dlp.utils.DownloadError as exc:
        cleanup_directory(workdir)
        message = str(exc).lower()
        if "private video" in message:
            detail = "Esse vídeo é privado e não pode ser acessado pelo conversor."
        elif "video unavailable" in message or "unavailable" in message:
            detail = "Esse vídeo não está disponível para conversão."
        else:
            detail = "O YouTube não liberou o áudio desse link. Tente outro vídeo público."
        raise HTTPException(status_code=422, detail=detail) from exc
    except Exception as exc:
        cleanup_directory(workdir)
        raise HTTPException(status_code=500, detail="Falha ao gerar o MP3.") from exc
