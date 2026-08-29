import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video → MP3",
  description: "Converta seus próprios arquivos de vídeo para MP3 no navegador.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
