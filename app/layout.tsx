import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minha Linha do Tempo",
  description: "Uma viagem visual pelos meus registros de localização.",
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
