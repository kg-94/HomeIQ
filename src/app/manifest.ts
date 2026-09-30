import type { MetadataRoute } from "next";

// "Add to Home Screen" installs HomeIQ as a full-screen app. The icon is
// full-bleed with the mark inside the centre 80%, so it also works as maskable.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HomeIQ",
    short_name: "HomeIQ",
    description: "Run your home together: tasks, inventory, bills and documents.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#0f766e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
