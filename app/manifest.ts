import type { MetadataRoute } from "next";

// Rota de metadata do Next: serve /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hub",
    short_name: "Hub",
    description: "Conecte-se pelo que realmente importa.",
    start_url: "/",
    display: "standalone",
    // Cores de docs/design-system/tokens.json: surfacePage e ink.
    background_color: "#F1EEFF",
    theme_color: "#F1EEFF",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
