import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  title: {
    default: "Khatch & Valley — Brewstillery",
    template: "%s — Khatch & Valley"
  },
  description:
    "Distillerie artisanale de South Los Santos. Commande en ligne et règlement à la livraison.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand-mark.svg", apple: "/brand-mark.svg" },
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#201d1a"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
