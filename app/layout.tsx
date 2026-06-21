import type { Metadata } from "next";
import "./globals.css";

import AppLayout from "../components/AppLayout";

export const metadata: Metadata = {
  title: "ODZ. StahlFabrik",
  description: "ODZ. Business Command Center für StahlFabrik",
  manifest: "/manifest.json",
  applicationName: "ODZ. StahlFabrik",
  appleWebApp: {
    capable: true,
    title: "ODZ.",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
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
