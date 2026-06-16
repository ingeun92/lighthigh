import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "lighthigh — 월드컵 하이라이트 한 곳에",
  description:
    "2026 월드컵 경기 일정을 한 눈에, 하이라이트로 한 번에. 흩어진 하이라이트를 일정표에서 바로 연결합니다.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "lighthigh", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F0EEE9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-canvas text-ink">{children}</body>
    </html>
  );
}
