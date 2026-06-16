import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "lighthigh — 월드컵 하이라이트 모아보기",
    short_name: "lighthigh",
    description: "월드컵 경기 일정과 하이라이트를 한 곳에서.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
