"use client";

import { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export default function Home() {
  const ffmpegRef = useRef(new FFmpeg());
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadFFmpeg() {
    if (loaded) return;
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("progress", ({ progress }) => setProgress(Math.round(progress * 100)));
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    setLoaded(true);
  }

  async function convert() {
    if (!file) return;
    setError(null); setDownloadUrl(null); setLoading(true); setProgress(0);
    try {
      await loadFFmpeg();
      const ffmpeg = ffmpegRef.current;
      const ext = file.name.split(".").pop() || "mp4";
      const input = `input.${ext}`;
      const output = "audio.mp3";
      await ffmpeg.writeFile(input, await fetchFile(file));
      await ffmpeg.exec(["-i", input, "-vn", "-codec:a", "libmp3lame", "-q:a", "2", output]);
      const data = await ffmpeg.readFile(output);
      const blob = new Blob([data], { type: "audio/mpeg" });
      setDownloadUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (e) {
      console.error(e);
      setError("Não consegui converter esse arquivo. Tente outro formato ou um vídeo menor.");
    } finally { setLoading(false); }
  }

  return (
    <main className="shell"><section className="card">
      <div className="badge">100% local</div>
      <h1>Vídeo → MP3</h1>
      <p className="lead">Converta um vídeo que você possui ou tem autorização para usar. O processamento acontece no seu navegador.</p>
      <label className="dropzone">
        <input type="file" accept="video/*,audio/*" onChange={(e) => { const next=e.target.files?.[0]??null; setFile(next); setDownloadUrl(null); setError(null); }} />
        <strong>{file ? file.name : "Escolher arquivo de vídeo"}</strong>
        <span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "MP4, MOV, WEBM, M4A e outros"}</span>
      </label>
      <button className="primary" disabled={!file || loading} onClick={convert}>{loading ? `Convertendo… ${progress}%` : "Converter para MP3"}</button>
      {loading && <div className="progress" aria-label="Progresso da conversão"><div style={{ width: `${Math.max(2, progress)}%` }} /></div>}
      {downloadUrl && <a className="download" href={downloadUrl} download={`${file?.name.replace(/\.[^.]+$/, "") || "audio"}.mp3`}>Baixar MP3</a>}
      {error && <p className="error">{error}</p>}
      <div className="note"><strong>Sobre YouTube</strong><p>Este projeto não extrai nem baixa mídia de URLs do YouTube. Para conteúdo seu, baixe-o pelos meios oferecidos pela plataforma e converta o arquivo aqui.</p></div>
    </section></main>
  );
}
