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
  const [ueberstundenStart, setUeberstundenStart] = useState("");

  const [eintrittsdatum, setEintrittsdatum] = useState("");
  const [probezeitBis, setProbezeitBis] = useState("");
  const [austrittsdatum, setAustrittsdatum] = useState("");
  const [vertragsart, setVertragsart] = useState("Unbefristet");

  const [loading, setLoading] = useState(false);
  const [meldung, setMeldung] = useState("");

  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null);

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

  function istInProbezeit(probezeit_bis: string | null) {
    if (!probezeit_bis) return false;
    const heute = new Date();
    const ende = new Date(probezeit_bis);
    return ende >= heute;
  }

  function formularLeeren() {
    setBearbeitenId(null);
    setName("");
    setEmail("");
    setPassword("");
    setRolle("Mitarbeiter");
    setWochenstunden("");
    setUrlaubstage("");
    setUeberstundenStart("");
    setEintrittsdatum("");
    setProbezeitBis("");
    setAustrittsdatum("");
    setVertragsart("Unbefristet");
  }

  async function mitarbeiterSpeichern() {
    setMeldung("");

    if (!name.trim()) {
      setMeldung("Bitte Namen eingeben.");
      return;
    }

    setLoading(true);

    if (bearbeitenId) {
      const { error } = await supabase
        .from("mitarbeiter")
        .update({
          name,
          rolle,
          wochenstunden: Number(wochenstunden),
          urlaubstage: Number(urlaubstage),
          ueberstunden_start: Number(ueberstundenStart || 0),
          eintrittsdatum: eintrittsdatum || null,
          probezeit_bis: probezeitBis || null,
          austrittsdatum: austrittsdatum || null,
          vertragsart,
        })
        .eq("id", bearbeitenId);

      if (error) {
        setLoading(false);
        setMeldung(error.message);
        console.log(error);
        return;
      }

      setMeldung("Mitarbeiter aktualisiert.");
    } else {
      if (!email.trim() || !password.trim()) {
        setLoading(false);
        setMeldung("Bitte E-Mail und Start-Passwort ausfüllen.");
        return;
      }

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
          ueberstunden_start: Number(ueberstundenStart || 0),
          eintrittsdatum: eintrittsdatum || null,
          probezeit_bis: probezeitBis || null,
          austrittsdatum: austrittsdatum || null,
          vertragsart,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setLoading(false);
        setMeldung(
          result.error || "Mitarbeiter konnte nicht erstellt werden."
        );
        return;
      }

      setMeldung("Mitarbeiter wurde erstellt.");
    }

    formularLeeren();
    await ladeMitarbeiter();
    setLoading(false);
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

  function mitarbeiterBearbeiten(person: any) {
    setBearbeitenId(person.id);
    setName(person.name || "");
    setRolle(person.rolle || "Mitarbeiter");
    setWochenstunden(String(person.wochenstunden || ""));
    setUrlaubstage(String(person.urlaubstage || ""));
    setUeberstundenStart(String(person.ueberstunden_start || 0));
    setEintrittsdatum(person.eintrittsdatum || "");
    setProbezeitBis(person.probezeit_bis || "");
    setAustrittsdatum(person.austrittsdatum || "");
    setVertragsart(person.vertragsart || "Unbefristet");
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
          {bearbeitenId
            ? "Mitarbeiter bearbeiten"
            : "Mitarbeiter mit Login erstellen"}
        </h2>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          />

          {!bearbeitenId && (
            <>
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
            </>
          )}

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

          <select
            value={vertragsart}
            onChange={(e) => setVertragsart(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          >
            <option value="Unbefristet">Unbefristet</option>
            <option value="Befristet">Befristet</option>
            <option value="Temporär">Temporär</option>
            <option value="Lehre">Lehre</option>
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

          <input
            type="number"
            step="0.5"
            placeholder="Überstunden Start"
            value={ueberstundenStart}
            onChange={(e) => setUeberstundenStart(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          />

          <input
            type="date"
            value={eintrittsdatum}
            onChange={(e) => setEintrittsdatum(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          />

          <input
            type="date"
            value={probezeitBis}
            onChange={(e) => setProbezeitBis(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          />

          <input
            type="date"
            value={austrittsdatum}
            onChange={(e) => setAustrittsdatum(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={mitarbeiterSpeichern}
            disabled={loading}
            className="rounded-xl bg-zinc-900 px-5 py-3 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
          >
            {loading
              ? "Speichern..."
              : bearbeitenId
              ? "Änderung speichern"
              : "Mitarbeiter erstellen"}
          </button>

          {bearbeitenId && (
            <button
              type="button"
              onClick={formularLeeren}
              className="rounded-xl bg-zinc-200 px-5 py-3 font-bold text-zinc-900"
            >
              Abbrechen
            </button>
          )}
        </div>

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

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  istInProbezeit(person.probezeit_bis)
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {istInProbezeit(person.probezeit_bis)
                  ? "Probezeit"
                  : person.status || "Aktiv"}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div>
                <span className="font-semibold">Rolle:</span> {person.rolle}
              </div>

              <div>
                <span className="font-semibold">Vertrag:</span>{" "}
                {person.vertragsart || "-"}
              </div>

              <div>
                <span className="font-semibold">Eintritt:</span>{" "}
                {person.eintrittsdatum || "-"}
              </div>

              <div>
                <span className="font-semibold">Probezeit bis:</span>{" "}
                {person.probezeit_bis || "-"}
              </div>

              <div>
                <span className="font-semibold">Austritt:</span>{" "}
                {person.austrittsdatum || "-"}
              </div>

              <div>
                <span className="font-semibold">Wochenstunden:</span>{" "}
                {person.wochenstunden}h
              </div>

              <div>
                <span className="font-semibold">Urlaubstage:</span>{" "}
                {person.urlaubstage}
              </div>

              <div>
                <span className="font-semibold">Überstunden Start:</span>{" "}
                {Number(person.ueberstunden_start || 0).toFixed(2)}h
              </div>
            </div>

            <button
              type="button"
              onClick={() => mitarbeiterBearbeiten(person)}
              className="mt-4 w-full rounded-xl bg-zinc-900 p-3 font-bold text-white"
            >
              Bearbeiten
            </button>

            <button
              type="button"
              onClick={() => mitarbeiterLoeschen(person.id)}
              className="mt-3 w-full rounded-xl bg-red-600 p-3 font-bold text-white"
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
          <div className="min-w-[1450px]">
            <div className="grid grid-cols-10 border-b border-zinc-300 pb-4 font-bold text-zinc-800">
              <div>Name</div>
              <div>Rolle</div>
              <div>Vertrag</div>
              <div>Eintritt</div>
              <div>Probezeit</div>
              <div>Woche</div>
              <div>Urlaub</div>
              <div>Ü-Start</div>
              <div>Status</div>
              <div>Aktion</div>
            </div>

            {mitarbeiter.map((person) => (
              <div
                key={person.id}
                className="grid grid-cols-10 items-center border-b border-zinc-200 py-4"
              >
                <div className="font-medium text-zinc-900">
                  {person.name}
                </div>

                <div>{person.rolle}</div>

                <div>{person.vertragsart || "-"}</div>

                <div>{person.eintrittsdatum || "-"}</div>

                <div>{person.probezeit_bis || "-"}</div>

                <div>{person.wochenstunden}h</div>

                <div>{person.urlaubstage}</div>

                <div>
                  {Number(person.ueberstunden_start || 0).toFixed(2)}h
                </div>

                <div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      istInProbezeit(person.probezeit_bis)
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {istInProbezeit(person.probezeit_bis)
                      ? "Probezeit"
                      : person.status || "Aktiv"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => mitarbeiterBearbeiten(person)}
                    className="rounded-lg bg-zinc-900 px-4 py-2 font-semibold text-white"
                  >
                    Bearbeiten
                  </button>

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