import type { Metadata } from "next";

import CreativeStudioClient from "./CreativeStudioClient";

export const dynamic = "force-dynamic";

const siteUrl = "https://www.shothik.ai";

export const metadata: Metadata = {
  title: "Creative Studio - Shothik AI",
  description:
    "Plan and run MCP-backed creative image and video workflows through Shothik Creative Studio.",
  keywords: [
    "creative studio",
    "MCP workflow",
    "Higgsfield MCP",
    "image generation",
    "video generation",
    "Shothik AI",
  ],
  openGraph: {
    title: "Creative Studio - Shothik AI",
    description:
      "Plan and run MCP-backed creative image and video workflows through Shothik Creative Studio.",
    images: [
      {
        url: `${siteUrl}/moscot.png`,
        width: 1200,
        height: 630,
        alt: "Shothik AI Creative Studio",
      },
    ],
    type: "website",
    url: `${siteUrl}/creative-studio`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Creative Studio - Shothik AI",
    description:
      "Plan and run MCP-backed creative image and video workflows through Shothik Creative Studio.",
    images: [`${siteUrl}/moscot.png`],
  },
};

export default function CreativeStudioPage() {
  return <CreativeStudioClient />;
}
