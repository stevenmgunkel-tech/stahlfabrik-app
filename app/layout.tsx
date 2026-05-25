import "./globals.css";
import AppLayout from "@/components/AppLayout";

export const metadata = {
  title: "StahlFabrik",
  description: "ERP & Zeiterfassung",
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