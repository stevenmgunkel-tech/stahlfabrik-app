"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MitarbeiterPage() {
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rolle, setRolle] = useState("Mitarbeiter");
  const [wochenstunden, setWochenstunden] = useState("");
  const [urlaubstage, setUrlaubstage] = useState("");

  const [loading, setLoading] = useState(false);
  const [meldung, setMeldung] = useState("");

  async function ladeMitarbeiter() {
    const { data, error } = await supabase
      .from("mitarbeiter")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setMitarbeiter(data || []);
  }

  useEffect(() => {
    ladeMitarbeiter();
  }, []);

  async function mitarbeiterHinzufuegen() {
    setMeldung("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setMeldung("Bitte Name, E-Mail und Start-Passwort ausfüllen.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
        rolle,
        wochenstunden: Number(wochenstunden),
        urlaubstage: Number(urlaubstage),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setLoading(false);
      setMeldung(result.error || "Mitarbeiter konnte nicht erstellt werden.");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setRolle("Mitarbeiter");
    setWochenstunden("");
    setUrlaubstage("");

    await ladeMitarbeiter();

    setLoading(false);
    setMeldung("Mitarbeiter wurde erstellt.");
  }

  async function mitarbeiterLoeschen(id: number) {
    const bestaetigen = confirm("Mitarbeiter wirklich löschen?");

    if (!bestaetigen) return;

    const { error } = await supabase
      .from("mitarbeiter")
      .delete()
      .eq("id", id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    await ladeMitarbeiter();
    setMeldung("Mitarbeiter gelöscht.");
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-zinc-900">
          Mitarbeiter
        </h1>

        <p className="mt-2 text-sm md:text-lg text-zinc-600">
          Mitarbeiter & Login-Zugänge verwalten
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-6 shadow-sm">
        <h2 className="mb-6 text-xl md:text-2xl font-bold text-zinc-900">
          Mitarbeiter mit Login erstellen
        </h2>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          />

          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          />

          <input
            type="password"
            placeholder="Start-Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          />

          <select
            value={rolle}
            onChange={(e) => setRolle(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          >
            <option value="Mitarbeiter">Mitarbeiter</option>
            <option value="Admin">Admin</option>
            <option value="Lehrling">Lehrling</option>
            <option value="Temporär">Temporär</option>
            <option value="Aushilfe">Aushilfe</option>
          </select>

          <input
            type="number"
            step="0.5"
            placeholder="Wochenstunden"
            value={wochenstunden}
            onChange={(e) => setWochenstunden(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          />

          <input
            type="number"
            placeholder="Urlaubstage"
            value={urlaubstage}
            onChange={(e) => setUrlaubstage(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          />
        </div>

        <button
          type="button"
          onClick={mitarbeiterHinzufuegen}
          disabled={loading}
          className="mt-6 rounded-xl bg-zinc-900 px-5 py-3 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? "Erstellen..." : "Mitarbeiter erstellen"}
        </button>

        {meldung && (
          <div className="mt-4 rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
            {meldung}
          </div>
        )}
      </div>

      <div className="space-y-4 md:hidden">
        {mitarbeiter.map((person) => (
          <div
            key={person.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-zinc-900">
                {person.name}
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                {person.status}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div>
                <span className="font-semibold">Rolle:</span> {person.rolle}
              </div>

              <div>
                <span className="font-semibold">Wochenstunden:</span>{" "}
                {person.wochenstunden}h
              </div>

              <div>
                <span className="font-semibold">Urlaubstage:</span>{" "}
                {person.urlaubstage}
              </div>
            </div>

            <button
              type="button"
              onClick={() => mitarbeiterLoeschen(person.id)}
              className="mt-4 rounded-xl bg-red-600 p-3 font-bold text-white"
            >
              Löschen
            </button>
          </div>
        ))}
      </div>

      <div className="hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:block">
        <h2 className="mb-6 text-2xl font-bold text-zinc-900">
          Teamübersicht
        </h2>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-6 border-b border-zinc-300 pb-4 font-bold text-zinc-800">
              <div>Name</div>
              <div>Rolle</div>
              <div>Wochenstunden</div>
              <div>Urlaubstage</div>
              <div>Status</div>
              <div>Aktion</div>
            </div>

            {mitarbeiter.map((person) => (
              <div
                key={person.id}
                className="grid grid-cols-6 items-center border-b border-zinc-200 py-4"
              >
                <div className="font-medium text-zinc-900">
                  {person.name}
                </div>

                <div>{person.rolle}</div>

                <div>{person.wochenstunden}h</div>

                <div>{person.urlaubstage}</div>

                <div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                    {person.status}
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => mitarbeiterLoeschen(person.id)}
                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}