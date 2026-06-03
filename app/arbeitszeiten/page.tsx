"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ArbeitszeitenPage() {
  const [zeiten, setZeiten] = useState<any[]>([]);
  const [projekte, setProjekte] = useState<any[]>([]);
  const [offeneTage, setOffeneTage] = useState<string[]>([]);
  const [offeneDetails, setOffeneDetails] = useState<string[]>([]);

  const [datum, setDatum] = useState("");
  const [projekt, setProjekt] = useState("");
  const [stunden, setStunden] = useState("");
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
      .order("datum", { ascending: false })
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

    if (projektData) {
      const aktiveProjekte = projektData.filter(
        (p) => p.status === "Aktiv" || !p.status
      );
      setProjekte(aktiveProjekte);
    }
  }

  useEffect(() => {
    ladeDaten();
  }, []);

  function kundeFuerProjekt(projektName: string) {
    const gefunden = projekte.find((p) => p.name === projektName);
    return gefunden?.kunde || "Kein Kunde hinterlegt";
  }

  async function zeitSpeichern() {
    setMeldung("");

    if (!datum || !projekt || !stunden) {
      setMeldung("Bitte Datum, Projekt und Stunden ausfüllen.");
      return;
    }

    const berechneteStunden = Number(stunden);

    if (!Number.isFinite(berechneteStunden) || berechneteStunden <= 0) {
      setMeldung("Bitte gültige Stunden eingeben.");
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
          startzeit: null,
          endzeit: null,
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
          startzeit: null,
          endzeit: null,
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
    setStunden("");
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
    setStunden(String(zeit.stunden || ""));
    setPause(String(zeit.pause || ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bearbeitungAbbrechen() {
    setBearbeitenId(null);
    setDatum("");
    setProjekt("");
    setStunden("");
    setPause("");
  }

  function toggleTag(key: string) {
    setOffeneTage((aktuell) =>
      aktuell.includes(key)
        ? aktuell.filter((item) => item !== key)
        : [...aktuell, key]
    );
  }

  function toggleDetails(key: string) {
    setOffeneDetails((aktuell) =>
      aktuell.includes(key)
        ? aktuell.filter((item) => item !== key)
        : [...aktuell, key]
    );
  }

  function gruppierteArbeitszeiten() {
    const tageMap = new Map<string, any>();

    zeiten.forEach((zeit) => {
      const datumKey = zeit.datum || "Ohne Datum";
      const projektKey = zeit.projekt || "Ohne Projekt";

      if (!tageMap.has(datumKey)) {
        tageMap.set(datumKey, {
          datum: datumKey,
          gesamt: 0,
          pauseGesamt: 0,
          projekte: new Map<string, any>(),
        });
      }

      const tag = tageMap.get(datumKey);
      tag.gesamt += Number(zeit.stunden || 0);
      tag.pauseGesamt += Number(zeit.pause || 0);

      if (!tag.projekte.has(projektKey)) {
        tag.projekte.set(projektKey, {
          name: projektKey,
          stunden: 0,
          pauseGesamt: 0,
          eintraege: [],
        });
      }

      const projektGruppe = tag.projekte.get(projektKey);
      projektGruppe.stunden += Number(zeit.stunden || 0);
      projektGruppe.pauseGesamt += Number(zeit.pause || 0);
      projektGruppe.eintraege.push(zeit);
    });

    return Array.from(tageMap.values()).map((tag) => ({
      ...tag,
      projekte: Array.from(tag.projekte.values()),
    }));
  }

  function datumFormatieren(datumWert: string) {
    if (!datumWert || datumWert === "Ohne Datum") return datumWert;

    return new Date(datumWert).toLocaleDateString("de-CH", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const vorschauStunden = Number(stunden || 0);
  const gruppierteTage = gruppierteArbeitszeiten();

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
          Arbeitszeiten einfach nach Projekt und Stunden erfassen
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">
              {bearbeitenId ? "Arbeitszeit bearbeiten" : "Arbeitszeit erfassen"}
            </h2>
            <p className="mt-1 text-white/55">
              Datum, Projekt, Stunden und Pause eintragen
            </p>
          </div>

          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
            <span className="text-sm text-white/60">Eingetragen</span>{" "}
            <span className="font-black text-orange-500">
              {vorschauStunden}h
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
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

          <Field label="Stunden">
            <input
              type="number"
              step="0.25"
              min="0"
              placeholder="z.B. 3 oder 4.5"
              value={stunden}
              onChange={(e) => setStunden(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Pause Min.">
            <input
              type="number"
              min="0"
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
            <h2 className="text-2xl font-black text-white">Zusammenfassung</h2>
            <p className="mt-1 text-white/55">
              Tage einklappen. Klick auf den Tag öffnet die Projektübersicht.
            </p>
          </div>

          <div className="text-sm text-white/50">
            {zeiten.length} Buchungen · {gruppierteTage.length} Tage
          </div>
        </div>

        {gruppierteTage.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
            Noch keine Arbeitszeiten vorhanden.
          </div>
        )}

        <div className="space-y-4">
          {gruppierteTage.map((tag) => {
            const tagOffen = offeneTage.includes(tag.datum);

            return (
              <div
                key={tag.datum}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/25"
              >
                <button
                  type="button"
                  onClick={() => toggleTag(tag.datum)}
                  className="flex w-full flex-col justify-between gap-3 bg-black/25 px-5 py-5 text-left transition hover:bg-white/[0.03] md:flex-row md:items-center"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-2xl font-black text-orange-500">
                      {tagOffen ? "▾" : "▸"}
                    </div>

                    <div>
                      <div className="text-sm font-bold uppercase tracking-widest text-orange-500">
                        {datumFormatieren(tag.datum)}
                      </div>

                      <div className="mt-1 text-white/50">
                        {tag.projekte.length} Bereiche ·{" "}
                        {tag.projekte.reduce(
                          (sum: number, p: any) =>
                            sum + Number(p.eintraege.length || 0),
                          0
                        )}{" "}
                        Buchungen
                        {Number(tag.pauseGesamt || 0) > 0 &&
                          ` · Pause ${tag.pauseGesamt} Min.`}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-orange-600 px-4 py-2 text-lg font-black text-white shadow-lg shadow-orange-600/25">
                    Gesamt {Number(tag.gesamt || 0).toFixed(2)}h
                  </div>
                </button>

                {tagOffen && (
                  <div className="divide-y divide-white/10 border-t border-white/10">
                    {tag.projekte.map((projektGruppe: any) => {
                      const detailKey = `${tag.datum}-${projektGruppe.name}`;
                      const detailsOffen = offeneDetails.includes(detailKey);
                      const kunde = kundeFuerProjekt(projektGruppe.name);

                      return (
                        <div key={detailKey} className="px-5 py-4">
                          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div>
                              <div className="text-xl font-black text-white">
                                {projektGruppe.name}
                              </div>

                              <div className="mt-1 text-sm text-white/50">
                                Kunde:{" "}
                                <span className="font-bold text-white/75">
                                  {kunde}
                                </span>
                              </div>

                              <div className="mt-1 text-sm text-white/45">
                                {projektGruppe.eintraege.length} Buchung
                                {projektGruppe.eintraege.length === 1
                                  ? ""
                                  : "en"}
                                {Number(projektGruppe.pauseGesamt || 0) > 0 &&
                                  ` · Pause ${projektGruppe.pauseGesamt} Min.`}
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div className="text-3xl font-black text-orange-500">
                                {Number(projektGruppe.stunden || 0).toFixed(2)}h
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleDetails(detailKey)}
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white transition hover:border-orange-500/40 hover:text-orange-500"
                              >
                                {detailsOffen
                                  ? "Details ausblenden"
                                  : "Details anzeigen"}
                              </button>
                            </div>
                          </div>

                          {detailsOffen && (
                            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {projektGruppe.eintraege.map((zeit: any) => (
                                <div
                                  key={zeit.id}
                                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="text-sm text-white/50">
                                        Arbeitszeit
                                      </div>

                                      <div className="mt-1 text-sm text-white/50">
                                        Pause {zeit.pause || 0} Min.
                                      </div>
                                    </div>

                                    <div className="font-black text-white">
                                      {Number(zeit.stunden || 0).toFixed(2)}h
                                    </div>
                                  </div>

                                  <div className="mt-4 grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => bearbeitungStarten(zeit)}
                                      className="rounded-lg bg-white/[0.06] px-3 py-2 text-sm font-bold text-white transition hover:bg-white/[0.10]"
                                    >
                                      Bearbeiten
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => zeitLoeschen(zeit.id)}
                                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-500"
                                    >
                                      Löschen
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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