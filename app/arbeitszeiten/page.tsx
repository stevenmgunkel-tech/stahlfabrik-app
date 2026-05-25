"use client";

export default function ArbeitszeitenPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 md:text-5xl">
          Arbeitszeiten
        </h1>

        <p className="mt-2 text-sm text-zinc-600 md:text-lg">
          Eigene Arbeitszeiten erfassen
        </p>
      </div>

      {/* FORMULAR */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-6 text-xl font-bold text-zinc-900 md:text-2xl">
          Arbeitszeit erfassen
        </h2>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-6">
          <input
            type="date"
            className="rounded-xl border border-zinc-300 p-3"
          />

          <select className="rounded-xl border border-zinc-300 p-3">
            <option>Projekt auswählen</option>
          </select>

          <input
            type="time"
            className="rounded-xl border border-zinc-300 p-3"
          />

          <input
            type="time"
            className="rounded-xl border border-zinc-300 p-3"
          />

          <input
            type="number"
            placeholder="Pause"
            className="rounded-xl border border-zinc-300 p-3"
          />

          <button className="rounded-xl bg-zinc-900 p-3 font-bold text-white">
            Speichern
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-100 p-4">
          <span className="font-bold">
            Berechnete Arbeitszeit:
          </span>{" "}
          <span className="font-extrabold text-orange-500">
            8.5h
          </span>
        </div>
      </div>

      {/* MOBILE CARDS */}
      <div className="space-y-4 md:hidden">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              25.05.2026
            </div>

            <div className="font-bold text-orange-500">
              8.5h
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="font-semibold">
                Projekt:
              </span>{" "}
              Werkhalle
            </div>

            <div>
              <span className="font-semibold">
                Zeit:
              </span>{" "}
              07:00 - 16:00
            </div>

            <div>
              <span className="font-semibold">
                Pause:
              </span>{" "}
              30 Min.
            </div>
          </div>

          <button className="mt-4 rounded-xl bg-red-600 p-3 font-bold text-white">
            Löschen
          </button>
        </div>
      </div>

      {/* DESKTOP TABELLE */}
      <div className="hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:block">
        <h2 className="mb-6 text-2xl font-bold">
          Eigene Arbeitszeiten
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-300 text-left">
                <th className="pb-4">Datum</th>
                <th className="pb-4">Projekt</th>
                <th className="pb-4">Start</th>
                <th className="pb-4">Ende</th>
                <th className="pb-4">Pause</th>
                <th className="pb-4">Stunden</th>
                <th className="pb-4">Aktion</th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-b border-zinc-200">
                <td className="py-4">25.05.2026</td>
                <td>Werkhalle</td>
                <td>07:00</td>
                <td>16:00</td>
                <td>30 Min.</td>
                <td className="font-bold">8.5h</td>

                <td>
                  <button className="rounded-lg bg-red-600 px-4 py-2 text-white">
                    Löschen
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}