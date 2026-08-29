# YouTube → MP3

Aplicação com frontend em Next.js e backend separado em FastAPI para converter o áudio de links do YouTube em MP3 usando `yt-dlp` + `FFmpeg`.

Use somente em vídeos que você possui ou tem autorização para baixar/converter.

## Estrutura

- `/app`: frontend Next.js, ideal para Vercel.
- `/backend`: API FastAPI em Docker com `yt-dlp` e `FFmpeg`.

## Frontend

```bash
npm install
npm run dev
```

Em desenvolvimento, quando o site roda em `localhost`, ele tenta usar automaticamente:

```text
http://localhost:8000
```

Em produção, configure na Vercel:

```text
NEXT_PUBLIC_CONVERTER_API_URL=https://SEU-BACKEND
```

Depois faça um novo deploy do frontend.

## Backend local com Docker

Entre na pasta `backend`:

```bash
docker build -t videotopmp3-backend .
docker run --rm -p 8000:8000 -e ALLOWED_ORIGINS=http://localhost:3000 videotopmp3-backend
```

Teste:

```text
GET http://localhost:8000/health
```

## Publicar o backend

O backend foi preparado para qualquer serviço que execute Docker, por exemplo Railway, Render ou um VPS.

Ao criar o serviço:

1. Use este mesmo repositório.
2. Configure a pasta raiz do serviço como `backend`.
3. Faça o deploy usando o `Dockerfile` existente.
4. Configure `ALLOWED_ORIGINS` com o domínio do frontend na Vercel. Exemplo:

```text
ALLOWED_ORIGINS=https://videotopmp3.vercel.app
```

5. Copie a URL pública do backend e adicione na Vercel como:

```text
NEXT_PUBLIC_CONVERTER_API_URL=https://seu-backend.example.com
```

## Endpoint

`POST /convert`

Body:

```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

Se a conversão for concluída, a API responde diretamente com o arquivo `audio/mpeg`.

## Observações

A disponibilidade de vídeos pode variar conforme restrições do próprio YouTube, região, privacidade do vídeo e mecanismos anti-bot. O backend restringe as URLs aceitas a domínios do YouTube e processa apenas um vídeo por requisição.
