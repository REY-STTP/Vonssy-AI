import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

const SITE_URL = (() => {
  try {
    return new URL(process.env.NEXTAUTH_URL ?? "https://www.vonssy-ai.web.id");
  } catch {
    return new URL("https://www.vonssy-ai.web.id");
  }
})();

const SITE_DESCRIPTION =
  "Bring your own keys. Chat with multiple OpenAI-compatible models through one unified, encrypted BYOK interface.";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: "VonssyAI — BYOK Multi-Model Chat",
    template: "%s | VonssyAI",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "VonssyAI",
    url: "/",
    title: "VonssyAI — BYOK Multi-Model Chat",
    description: SITE_DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["id_ID"],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VonssyAI — BYOK Multi-Model Chat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VonssyAI — BYOK Multi-Model Chat",
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  // F5: site-verification meta tags. Tokens are public by design;
  // env keeps them out of source. Empty values emit nothing.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      ...(process.env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
        : {}),
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F6" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1918" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif4.variable} ${jetbrainsMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var f=localStorage.getItem('vonssy-reading-font');if(f&&f!=='default')d.setAttribute('data-reading-font',f);var l=localStorage.getItem('vonssy-locale');if(l&&l!=='en'){d.setAttribute('data-locale',l);d.lang=l}}catch(e){}})()`
          }}
        />
      </head>
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster 
            position="top-center" 
            offset="64px"
            style={{ "--width": "min(calc(100vw - 32px), 356px)" } as React.CSSProperties}
            toastOptions={{ 
              className: 'font-body !bg-text-primary dark:!bg-surface !text-surface dark:!text-text-primary !border-none dark:border-solid dark:border-border !rounded-xl shadow-xl dark:shadow-soft px-4 py-3',
            }} 
            theme="system" 
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
