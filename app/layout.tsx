import type { Metadata, Viewport } from "next";
import "./globals.css";
import Footer from "@/components/Footer";

const TITLE = "lighthigh — 월드컵 하이라이트 한 곳에";
const DESCRIPTION =
  "2026 월드컵 경기 일정을 한 눈에, 하이라이트로 한 번에. 흩어진 하이라이트를 일정표에서 바로 연결합니다.";

export const metadata: Metadata = {
  metadataBase: new URL("https://lighthigh.today"),
  title: TITLE,
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "lighthigh", statusBarStyle: "default" },
  // 카카오톡·텔레그램 등 링크 공유 시 노출되는 썸네일 카드
  openGraph: {
    type: "website",
    siteName: "lighthigh",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://lighthigh.today",
    locale: "ko_KR",
    images: [
      { url: "/og.png", width: 1000, height: 562, alt: "lighthigh — 2026 월드컵 하이라이트" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
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
      <body className="min-h-full bg-canvas pb-[calc(3rem+env(safe-area-inset-bottom))] text-ink">
        {children}
        <Footer />
      </body>
    </html>
  );
}
