import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-archivo",
});

const plexKr = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-kr",
});

export const metadata: Metadata = {
  title: "lighthigh — 월드컵 하이라이트 한 곳에",
  description:
    "2026 월드컵 경기 일정을 한 눈에, 하이라이트로 한 번에. 흩어진 하이라이트를 일정표에서 바로 연결합니다.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "lighthigh", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0C1322",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${archivo.variable} ${plexKr.variable} h-full antialiased`}>
      <body className="min-h-full bg-pitch text-chalk">{children}</body>
    </html>
  );
}
