import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VonssyAI — Multi-Provider Chat",
  description:
    "Converse with multiple AI models through one unified interface. Built by Vonssy, the Heavenly Demon King.",
  openGraph: {
    title: "VonssyAI",
    description:
      "Multi-provider AI chatbot — Qwen, Grok, Mercury and more through free-tier gateways.",
    type: "website",
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
