import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "StahlFabrik",
  description: "Schweizer ERP & Zeiterfassung",
  manifest: "/manifest.json",

  icons: {
    icon: "/icon-512.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="bg-zinc-100 text-zinc-900">
        <main className="min-h-screen flex">
          <aside className="w-72 bg-zinc-950 text-white p-6 border-r border-zinc-800 shadow-2xl">
            <h1 className="text-3xl font-extrabold mb-10 tracking-wide text-orange-400">
              StahlFabrik
            </h1>

            <nav className="space-y-3">
              <Link
                href="/"
                className="block bg-zinc-900 hover:bg-orange-500 transition text-zinc-100 p-4 rounded-xl font-bold shadow"
              >
                Dashboard
              </Link>

              <Link
                href="/chef-dashboard"
                className="block bg-zinc-900 hover:bg-orange-500 transition text-zinc-100 p-4 rounded-xl font-bold shadow"
              >
                Chef Dashboard
              </Link>

              <Link
                href="/arbeitszeiten"
                className="block bg-zinc-900 hover:bg-orange-500 transition text-zinc-100 p-4 rounded-xl font-bold shadow"
              >
                Arbeitszeiten
              </Link>

              <Link
                href="/monatsansicht"
                className="block bg-zinc-900 hover:bg-orange-500 transition text-zinc-100 p-4 rounded-xl font-bold shadow"
              >
                Monatsansicht
              </Link>

              <Link
                href="/resturlaub"
                className="block bg-zinc-900 hover:bg-orange-500 transition text-zinc-100 p-4 rounded-xl font-bold shadow"
              >
                Resturlaub
              </Link>

              <Link
                href="/mitarbeiter"
                className="block bg-zinc-900 hover:bg-orange-500 transition text-zinc-100 p-4 rounded-xl font-bold shadow"
              >
                Mitarbeiter
              </Link>

              <Link
                href="/projekte"
                className="block bg-zinc-900 hover:bg-orange-500 transition text-zinc-100 p-4 rounded-xl font-bold shadow"
              >
                Projekte
              </Link>

              <Link
                href="/urlaub"
                className="block bg-zinc-900 hover:bg-orange-500 transition text-zinc-100 p-4 rounded-xl font-bold shadow"
              >
                Urlaub
              </Link>

              <Link
                href="/admin"
                className="block bg-zinc-900 hover:bg-orange-500 transition text-zinc-100 p-4 rounded-xl font-bold shadow"
              >
                Admin
              </Link>

              <Link
                href="/login"
                className="block bg-zinc-900 hover:bg-orange-500 transition text-zinc-100 p-4 rounded-xl font-bold shadow"
              >
                Login
              </Link>
            </nav>
          </aside>

          <section className="flex-1 p-10 bg-zinc-100">
            {children}
          </section>
        </main>
      </body>
    </html>
  );
}