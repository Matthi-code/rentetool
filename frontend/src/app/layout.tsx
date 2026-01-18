import type { Metadata } from "next";
import { Inter, Merriweather, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Header } from "@/components/header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Rentetool - Wettelijke Rente Calculator",
  description: "Nederlandse wettelijke rente calculator conform het Burgerlijk Wetboek. Berekent rente op vorderingen met ondersteuning voor deelbetalingen, kapitalisatie en meerdere rentetypes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className={`${inter.variable} ${merriweather.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen bg-background`}>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            {/* Demo banner */}
            <div className="bg-amber-500 text-amber-950 text-center py-2 px-4 text-sm font-medium">
              TEST-versie - Alleen voor test doeleinden
            </div>
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t py-6 text-sm text-muted-foreground">
              <div className="max-w-6xl mx-auto px-4 space-y-3 text-center">
                <p className="text-xs">
                  <strong>Disclaimer:</strong> De gebruiker is zelf verantwoordelijk voor het verifiëren van de uitkomsten.
                </p>
                <p>Rentetool v0.1 - Wettelijke rente conform art. 6:119/119a BW</p>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
