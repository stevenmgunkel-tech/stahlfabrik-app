"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProjektePage() {
  const [projekte, setProjekte] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [kunde, setKunde] = useState("");
  const [status, setStatus] = useState("Aktiv");

  const [loading, setLoading] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [seiteGeprueft, setSeiteGeprueft] = useState(false);

  async function pruefeAdmin() {
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return false;
    }

    const { data, error } = await supabase
      .from("mitarbeiter")
      .select("rolle")
      .eq("user_id", user.id)
      .single();

    if (error || data?.rolle !== "Admin") {
      window.location.href = "/";
      return false;
    }

    setIsAdmin(true);
    setSeiteGeprueft(true);

    return true;
  }

  async function ladeProjekte() {
    const erlaubt = await pruefeAdmin();
    if (!erlaubt) return;

    const { data, error } = await supabase
      .from("projekte")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setProjekte(data || []);
  }

  useEffect(() => {
    ladeProjekte();
  }, []);

  async function projektSpeichern() {
    if (!isAdmin) {
      setMeldung("Keine Berechtigung.");
      return;
    }

    setMeldung("");

    if (!name.trim()) {
      setMeldung("Bitte Projektname eingeben.");
      return;
    }

    setLoading(true);

    if (bearbeitenId) {
      const { error } = await supabase
        .from("projekte")
        .update({
          name: name.trim(),
          kunde: kunde.trim(),
          status,
        })
        .eq("id", bearbeitenId);

      if (error) {
        setLoading(false);
        setMeldung(error.message);
        console.log(error);
        return;
      }

      setMeldung("Projekt aktualisiert.");
    } else {
      const { error } = await supabase.from("projekte").insert([
        {
          name: name.trim(),
          kunde: kunde.trim(),
          status,
        },
      ]);

      if (error) {
        setLoading(false);
        setMeldung(error.message);
        console.log(error);
        return;
      }

      setMeldung("Projekt gespeichert.");
    }

    setName("");
    setKunde("");
    setStatus("Aktiv");
    setBearbeitenId(null);

    await ladeProjekte();
    setLoading(false);
  }

  async function projektLoeschen(id: number) {
    if (!isAdmin) {
      setMeldung("Keine Berechtigung.");
      return;
    }

    const bestaetigen = confirm("Projekt wirklich löschen?");
    if (!bestaetigen) return;

    const { error } = await supabase.from("projekte").delete().eq("id", id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    await ladeProjekte();
    setMeldung("Projekt gelöscht.");
  }

  function bearbeitungStarten(projekt: any) {
    setBearbeitenId(projekt.id);
    setName(projekt.name || "");
    setKunde(projekt.kunde || "");
    setStatus(projekt.status || "Aktiv");
  }

  function bearbeitungAbbrechen() {
    setBearbeitenId(null);
    setName("");
    setKunde("");
    setStatus("Aktiv");
  }

  function statusFarbe(status: string) {
    if (status === "Aktiv") {
      return "border-green-400/30 bg-green-500/10 text-green-300";
    }

    if (status === "Pausiert") {
      return "border-yellow-400/30 bg-yellow-500/10 text-yellow-300";
    }

    if (status === "Abgeschlossen") {
      return "border-white/15 bg-white/[0.06] text-white/65";
    }

    return "border-orange-400/30 bg-orange-500/10 text-orange-400";
  }

  const aktiveProjekte = projekte.filter((p) => p.status === "Aktiv").length;
  const pausierteProjekte = projekte.filter((p) => p.status === "Pausiert").length;
  const abgeschlosseneProjekte = projekte.filter(
    (p) => p.status === "Abgeschlossen"
  ).length;

  if (!seiteGeprueft) {
    return (
      <main className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 font-bold text-white shadow-2xl shadow-black/30">
          Berechtigung wird geprüft...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <div>
        <div className="mb-3 text-sm font-medium uppercase tracking-widest text-white/60">
          Verwaltung
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl">
          Projekte
        </h1>

        <p className="mt-3 text-white/60">
          Projekt- & Kundenverwaltung
        </p>
      </div>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <KpiCard label="Aktive Projekte" value={aktiveProjekte} color="green" />
        <KpiCard label="Pausiert" value={pausierteProjekte} color="yellow" />
        <KpiCard label="Abgeschlossen" value={abgeschlosseneProjekte} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">
              {bearbeitenId ? "Projekt bearbeiten" : "Projekt hinzufügen"}
            </h2>
            <p className="mt-1 text-white/55">
              Projektname, Kunde und Status verwalten
            </p>
          </div>

          {bearbeitenId && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-400">
              Bearbeitungsmodus aktiv
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Projektname">
            <input
              type="text"
              placeholder="Projektname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Kunde">
            <input
              type="text"
              placeholder="Kunde"
              value={kunde}
              onChange={(e) => setKunde(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="dark-input"
            >
              <option value="Aktiv">Aktiv</option>
              <option value="Pausiert">Pausiert</option>
              <option value="Abgeschlossen">Abgeschlossen</option>
            </select>
          </Field>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={projektSpeichern}
              disabled={loading}
              className="rounded-xl bg-orange-600 p-3 font-black text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-500 disabled:opacity-50"
            >
              {loading
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
              Projektübersicht
            </h2>
            <p className="mt-1 text-white/55">
              Alle angelegten Projekte und Kunden
            </p>
          </div>

          <div className="text-sm text-white/50">
            {projekte.length} Projekte
          </div>
        </div>

        {projekte.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
            Noch keine Projekte angelegt.
          </div>
        )}

        <div className="space-y-4 md:hidden">
          {projekte.map((projekt) => (
            <div
              key={projekt.id}
              className="rounded-2xl border border-white/10 bg-black/25 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-black text-white">
                    {projekt.name}
                  </div>

                  <div className="mt-2 text-sm text-white/60">
                    Kunde: {projekt.kunde || "-"}
                  </div>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(
                    projekt.status
                  )}`}
                >
                  {projekt.status || "Aktiv"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => bearbeitungStarten(projekt)}
                  className="rounded-xl bg-white/[0.06] p-3 font-bold text-white transition hover:bg-white/[0.10]"
                >
                  Bearbeiten
                </button>

                <button
                  type="button"
                  onClick={() => projektLoeschen(projekt.id)}
                  className="rounded-xl bg-red-600 p-3 font-bold text-white transition hover:bg-red-500"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <div className="grid min-w-[900px] grid-cols-4 border-b border-white/10 bg-black/20 px-5 py-4 text-sm font-bold uppercase tracking-wide text-white/50">
            <div>Projekt</div>
            <div>Kunde</div>
            <div>Status</div>
            <div>Aktion</div>
          </div>

          <div className="overflow-x-auto">
            {projekte.map((projekt) => (
              <div
                key={projekt.id}
                className="grid min-w-[900px] grid-cols-4 items-center border-b border-white/10 px-5 py-4 text-white/80 transition hover:bg-white/[0.03]"
              >
                <div className="font-black text-white">{projekt.name}</div>

                <div>{projekt.kunde || "-"}</div>

                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(
                      projekt.status
                    )}`}
                  >
                    {projekt.status || "Aktiv"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => bearbeitungStarten(projekt)}
                    className="rounded-lg bg-white/[0.06] px-4 py-2 font-bold text-white transition hover:bg-white/[0.10]"
                  >
                    Bearbeiten
                  </button>

                  <button
                    type="button"
                    onClick={() => projektLoeschen(projekt.id)}
                    className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-500"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
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

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: "green" | "yellow";
}) {
  const valueColor =
    color === "green"
      ? "text-green-400"
      : color === "yellow"
      ? "text-yellow-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.025] p-6 shadow-2xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/40">
      <div className="text-sm font-bold uppercase tracking-widest text-white/45">
        {label}
      </div>

      <div className={`mt-5 text-5xl font-black ${valueColor}`}>{value}</div>
    </div>
  );
}