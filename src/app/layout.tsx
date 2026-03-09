import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Iftar Relay",
    template: "%s | Iftar Relay",
  },
  description:
    "Bantu paket buka puasa dari UMKM lokal sampai ke penerima dengan cepat, aman, dan bermartabat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
