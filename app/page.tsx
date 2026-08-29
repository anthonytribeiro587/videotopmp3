"use client";

import { FormEvent, useState } from "react";

function getFilename(disposition: string | null) {
  if (!disposition) return "audio.mp3";

  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].replace(/["']/g, ""));
    } catch {
      return utf8[1].replace(/["']/g, "");
    }
  }

  const simple = disposition.match(/filename="?([^";]+)"?/i);
  return simple?.[1] || "audio.mp3";
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function convert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!authorized) {
      setError("Confirme que você tem autorização para baixar esse conteúdo.");
      return;
    }

    const productionApi = process.env.NEXT_PUBLIC_CONVERTER_API_URL?.replace(/\/$/, "");
    const localApi =
      typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:8000"
        : "";
    const apiBase = productionApi || localApi;

    if (!apiBase) {
      setError(
        "O conversor ainda precisa do backend. Configure NEXT_PUBLIC_CONVERTER_API_URL na Vercel depois de publicar a pasta backend."
      );
      return;
    }

    setLoading(true);
    setStatus("Buscando o áudio e convertendo para MP3…");

    try {
      const response = await fetch(`${apiBase}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        let message = "Não foi possível converter esse link.";
        try {
          const data = await response.json();
          if (typeof data?.detail === "string") message = data.detail;
        } catch {}
        throw new Error(message);
      }

      setStatus("MP3 pronto. Iniciando o download…");
      const blob = await response.blob();
      const filename = getFilename(response.headers.get("content-disposition"));
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      setStatus("Pronto! O MP3 foi gerado.");
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "Erro inesperado durante a conversão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="card">
        <div className="badge">YouTube → MP3</div>
        <h1>Baixe o áudio em MP3</h1>
        <p className="lead">
          Cole o link de um vídeo do YouTube que você possui ou tem autorização para baixar.
        </p>

        <form onSubmit={convert}>
          <label className="fieldLabel" htmlFor="youtube-url">
            Link do YouTube
          </label>
          <input
            id="youtube-url"
            className="urlInput"
            type="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            autoComplete="off"
          />

          <label className="permission">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(event) => setAuthorized(event.target.checked)}
            />
            <span>Confirmo que tenho permissão para baixar e converter este conteúdo.</span>
          </label>

          <button className="primary" disabled={loading || !url.trim()} type="submit">
            {loading ? "Convertendo…" : "Converter para MP3"}
          </button>
        </form>

        {loading && (
          <div className="progress" aria-label="Conversão em andamento">
            <div />
          </div>
        )}

        {status && <p className="success">{status}</p>}
        {error && <p className="error">{error}</p>}

        <div className="note">
          <strong>Como funciona</strong>
          <p>
            O site envia o link para um backend separado, que usa yt-dlp e FFmpeg para obter o áudio e gerar o MP3. O frontend continua hospedado na Vercel.
          </p>
        </div>
      </section>
    </main>
  );
}
