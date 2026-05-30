"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ArbeitszeitenPage() {
  const [zeiten, setZeiten] = useState<any[]>([]);
  const [projekte, setProjekte] = useState<any[]>([]);

  const [datum, setDatum] = useState("");
  const [projekt, setProjekt] = useState("");
  const [startzeit, setStartzeit] = useState("");
  const [endzeit, setEndzeit] = useState("");
  const [pause, setPause] = useState("");

  const [saving, setSaving] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null);

  async function ladeDaten() {
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: zeitData, error: zeitError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (zeitError) {
      setMeldung(zeitError.message);
      console.log(zeitError);
    }

    if (zeitData) setZeiten(zeitData);

    const { data: projektData, error: projektError } = await supabase
      .from("projekte")
      .select("*")
      .order("name", { ascending: true });

    if (projektError) {
      setMeldung(projektError.message);
      console.log(projektError);
    }

    if (projektData) setProjekte(projektData);
  }

  useEffect(() => {
    ladeDaten();
  }, []);

  function berechneStunden() {
    if (!startzeit || !endzeit) return 0;

    const [startH, startM] = startzeit.split(":").map(Number);
    const [endH, endM] = endzeit.split(":").map(Number);

    const startMinuten = startH * 60 + startM;
    const endMinuten = endH * 60 + endM;
    const pauseMinuten = Number(pause || 0);

    const arbeitsMinuten = endMinuten - startMinuten - pauseMinuten;

    if (arbeitsMinuten <= 0) return 0;

    return Number((arbeitsMinuten / 60).toFixed(2));
  }

  async function zeitSpeichern() {
    setMeldung("");

    if (!datum || !projekt || !startzeit || !endzeit) {
      setMeldung("Bitte Datum, Projekt, Von und Bis ausfüllen.");
      return;
    }

    const berechneteStunden = berechneStunden();

    if (berechneteStunden <= 0) {
      setMeldung("Bitte gültige Arbeitszeit eingeben.");
      return;
    }

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setSaving(false);
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    setSaving(true);

    if (bearbeitenId) {
      const { error } = await supabase
        .from("arbeitszeiten")
        .update({
          datum,
          projekt,
          startzeit,
          endzeit,
          pause: Number(pause || 0),
          stunden: berechneteStunden,
        })
        .eq("id", bearbeitenId)
        .eq("user_id", user.id);

      if (error) {
        setSaving(false);
        setMeldung(error.message);
        console.log(error);
        return;
      }

      setMeldung("Arbeitszeit aktualisiert.");
    } else {
      const { error } = await supabase.from("arbeitszeiten").insert([
        {
          datum,
          projekt,
          startzeit,
          endzeit,
          pause: Number(pause || 0),
          stunden: berechneteStunden,
          user_id: user.id,
        },
      ]);

      if (error) {
        setSaving(false);
        setMeldung(error.message);
        console.log(error);
        return;
      }

      setMeldung("Arbeitszeit gespeichert.");
    }

    setDatum("");
    setProjekt("");
    setStartzeit("");
    setEndzeit("");
    setPause("");
    setBearbeitenId(null);

    await ladeDaten();
    setSaving(false);
  }

  async function zeitLoeschen(id: number) {
    const bestaetigen = confirm("Arbeitszeit wirklich löschen?");
    if (!bestaetigen) return;

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase
      .from("arbeitszeiten")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    await ladeDaten();
    setMeldung("Arbeitszeit gelöscht.");
  }

  function bearbeitungStarten(zeit: any) {
    setBearbeitenId(zeit.id);
    setDatum(zeit.datum || "");
    setProjekt(zeit.projekt || "");
    setStartzeit(zeit.startzeit || "");
    setEndzeit(zeit.endzeit || "");
    setPause(String(zeit.pause || ""));
  }

  function bearbeitungAbbrechen() {
    setBearbeitenId(null);
    setDatum("");
    setProjekt("");
    setStartzeit("");
    setEndzeit("");
    setPause("");
  }

  const vorschauStunden = berechneStunden();

  return (
    <main className="space-y-8">
      <div>
        <div className="mb-3 text-sm font-medium uppercase tracking-widest text-white/60">
          Zeiterfassung
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl">
          Arbeitszeiten
        </h1>

        <p className="mt-3 text-white/60">
          Eigene Arbeitszeiten erfassen und verwalten
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">
              {bearbeitenId ? "Arbeitszeit bearbeiten" : "Arbeitszeit erfassen"}
            </h2>
            <p className="mt-1 text-white/55">
              Datum, Projekt und Arbeitszeit eintragen
            </p>
          </div>

          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
            <span className="text-sm text-white/60">Berechnet</span>{" "}
            <span className="font-black text-orange-500">
              {vorschauStunden}h
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
          <Field label="Datum">
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Projekt">
            <select
              value={projekt}
              onChange={(e) => setProjekt(e.target.value)}
              className="dark-input"
            >
              <option value="">Projekt auswählen</option>
              {projekte.map((projektItem) => (
                <option key={projektItem.id} value={projektItem.name}>
                  {projektItem.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Von">
            <input
              type="time"
              value={startzeit}
              onChange={(e) => setStartzeit(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Bis">
            <input
              type="time"
              value={endzeit}
              onChange={(e) => setEndzeit(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Pause Min.">
            <input
              type="number"
              placeholder="0"
              value={pause}
              onChange={(e) => setPause(e.target.value)}
              className="dark-input"
            />
          </Field>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={zeitSpeichern}
              disabled={saving}
              className="rounded-xl bg-orange-600 p-3 font-black text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-500 disabled:opacity-50"
            >
              {saving
                ? "Speichern..."
                : bearbeitenId
                ? "Änderung speichern"
                : "Speichern"}
            </button>
          </div>
        </div>

        {bearbeitenId && (
          <button
            type="button"
            onClick={bearbeitungAbbrechen}
            className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-bold text-white transition hover:border-orange-500/40 hover:text-orange-500"
          >
            Bearbeiten abbrechen
          </button>
        )}

        {meldung && (
          <div className="mt-5 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-bold text-orange-400">
            {meldung}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black text-white">
              Eigene Arbeitszeiten
            </h2>
            <p className="mt-1 text-white/55">
              Übersicht deiner erfassten Zeiten
            </p>
          </div>

          <div className="text-sm text-white/50">
            {zeiten.length} Einträge
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {zeiten.map((zeit) => (
            <div
              key={zeit.id}
              className="rounded-2xl border border-white/10 bg-black/25 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-white/50">{zeit.datum}</div>
                  <div className="mt-2 text-xl font-black text-white">
                    {zeit.projekt}
                  </div>
                </div>

                <div className="rounded-lg bg-orange-600 px-3 py-2 font-black text-white">
                  {zeit.stunden}h
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/70">
                <div>Von: {zeit.startzeit || "-"}</div>
                <div>Bis: {zeit.endzeit || "-"}</div>
                <div>Pause: {zeit.pause || 0} Min.</div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => bearbeitungStarten(zeit)}
                  className="rounded-xl bg-white/[0.06] p-3 font-bold text-white transition hover:bg-white/[0.10]"
                >
                  Bearbeiten
                </button>

                <button
                  type="button"
                  onClick={() => zeitLoeschen(zeit.id)}
                  className="rounded-xl bg-red-600 p-3 font-bold text-white transition hover:bg-red-500"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <div className="grid min-w-[1000px] grid-cols-[1fr_1.4fr_1fr_1fr_1fr_1fr_1.7fr] border-b border-white/10 bg-black/20 px-5 py-4 text-sm font-bold uppercase tracking-wide text-white/50">
            <div>Datum</div>
            <div>Projekt</div>
            <div>Von</div>
            <div>Bis</div>
            <div>Pause</div>
            <div>Stunden</div>
            <div>Aktion</div>
          </div>

          <div className="overflow-x-auto">
            {zeiten.map((zeit) => (
              <div
                key={zeit.id}
                className="grid min-w-[1000px] grid-cols-[1fr_1.4fr_1fr_1fr_1fr_1fr_1.7fr] items-center border-b border-white/10 px-5 py-4 text-white/80 transition hover:bg-white/[0.03]"
              >
                <div>{zeit.datum}</div>
                <div className="font-bold text-white">{zeit.projekt}</div>
                <div>{zeit.startzeit || "-"}</div>
                <div>{zeit.endzeit || "-"}</div>
                <div>{zeit.pause || 0} Min.</div>
                <div className="font-black text-orange-500">{zeit.stunden}h</div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => bearbeitungStarten(zeit)}
                    className="rounded-lg bg-white/[0.06] px-4 py-2 font-bold text-white transition hover:bg-white/[0.10]"
                  >
                    Bearbeiten
                  </button>

                  <button
                    type="button"
                    onClick={() => zeitLoeschen(zeit.id)}
                    className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-500"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>

          {zeiten.length === 0 && (
            <div className="p-5 text-white/55">
              Noch keine Arbeitszeiten vorhanden.
            </div>
          )}
        </div>
      </section>

      <style jsx global>{`
        .dark-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.25);
          padding: 0.85rem 1rem;
          color: white;
          outline: none;
          transition: 0.2s ease;
        }

        .dark-input:focus {
          border-color: rgba(249, 115, 22, 0.6);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
        }

        .dark-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .dark-input option {
          background: #111315;
          color: white;
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-white/70">
        {label}
      </label>
      {children}
    </div>
  );
}