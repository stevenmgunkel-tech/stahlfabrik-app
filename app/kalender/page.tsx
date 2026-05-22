export default function HomePage() {

  return (

    <main>

      <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
        Übersicht
      </h1>

      <p className="text-zinc-700 text-lg mb-10 font-medium">
        Willkommen bei StahlFabrik 👋
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">

          <h2 className="text-zinc-700 font-semibold">
            Mitarbeiter
          </h2>

          <p className="text-5xl font-extrabold text-zinc-900 mt-3">
            12
          </p>

        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">

          <h2 className="text-zinc-700 font-semibold">
            Projekte
          </h2>

          <p className="text-5xl font-extrabold text-zinc-900 mt-3">
            5
          </p>

        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">

          <h2 className="text-zinc-700 font-semibold">
            Stunden diese Woche
          </h2>

          <p className="text-5xl font-extrabold text-zinc-900 mt-3">
            168h
          </p>

        </div>

      </div>

    </main>

  );
}