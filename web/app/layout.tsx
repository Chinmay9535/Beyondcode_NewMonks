import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DrishtiSaathi",
  description: "A voice-first, multilingual companion for cataract patients: choose the right lens, recover safely.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06080c",
};

// Restore the saved theme and contrast before paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem('ds-theme');if(t)document.documentElement.dataset.theme=t;if(JSON.parse(localStorage.getItem('ds-read')||'{}').contrast)document.documentElement.dataset.contrast='high'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@300..800&family=Red+Hat+Mono:wght@400;500&family=Noto+Sans+Kannada:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600&family=Noto+Sans+Tamil:wght@400;600&display=swap"
        />
      </head>
      <body className="min-h-dvh" suppressHydrationWarning>{children}</body>
    </html>
  );
}
