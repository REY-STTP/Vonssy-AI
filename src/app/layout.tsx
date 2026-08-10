import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vonssy AI — Multi-Provider Chat",
  description:
    "Converse with multiple AI models through one unified interface. Built by Vonssy, the Heavenly Demon King.",
  openGraph: {
    title: "Vonssy AI",
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
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
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
              className: 'font-body !bg-surface border-border text-text-primary !rounded-xl shadow-soft px-4 py-3',
            }} 
            theme="system" 
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
