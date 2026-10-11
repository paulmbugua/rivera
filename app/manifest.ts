import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rivera — Where brands meet creators",
    short_name: "Rivera",
    description: "Discover creators, publish campaigns and build partnerships that grow.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5ef",
    theme_color: "#174f42",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/images/rivera-notification.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
    ],
  };
}
