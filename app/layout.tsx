import type { Metadata } from "next";
import "./globals.css";

import AppLayout from "../components/AppLayout";

export const metadata: Metadata = {
  title: "StahlFabrik",
  description: "Swiss ERP System",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}