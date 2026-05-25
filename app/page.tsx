export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          StahlFabrik Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Willkommen zurück 👋
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-gray-500">Mitarbeiter</h2>
          <p className="mt-2 text-3xl font-bold">12</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-gray-500">Arbeitsstunden</h2>
          <p className="mt-2 text-3xl font-bold">148h</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-gray-500">Offene Urlaube</h2>
          <p className="mt-2 text-3xl font-bold">3</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-gray-500">Krankmeldungen</h2>
          <p className="mt-2 text-3xl font-bold">1</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">
          Letzte Aktivitäten
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl bg-gray-100 p-4">
            Max Mustermann hat Arbeitszeit erfasst
          </div>

          <div className="rounded-xl bg-gray-100 p-4">
            Neuer Urlaubsantrag eingegangen
          </div>

          <div className="rounded-xl bg-gray-100 p-4">
            Projekt "Werkhalle" aktualisiert
          </div>
        </div>
      </div>
    </div>
  );
}