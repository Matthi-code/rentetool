import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
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
      <body className={`${inter.variable} ${merriweather.variable} font-sans antialiased min-h-screen bg-background`}>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t py-4 text-center text-sm text-muted-foreground">
              <div className="container">
                Rentetool - Wettelijke rente conform art. 6:119/119a BW
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
