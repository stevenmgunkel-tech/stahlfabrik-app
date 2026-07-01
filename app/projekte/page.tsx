"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

type ProjektStatus = "Alle" | "Aktiv" | "Pausiert" | "Abgeschlossen";

type Projekt = {
  id: number | string;
  kunde?: string | null;
  kommission?: string | null;
  projektname?: string | null;
  name?: string | null;
  projekt_name?: string | null;
  status?: string | null;
  erlaubte_bereiche?: string[] | string | null;
  bereiche?: string[] | string | null;
};

type ProjektBereich = {
  projekt_id: number | string | null;
  bereich: string | null;
};

export default function ProjektePage() {
  const [projekte, setProjekte] = useState<Projekt[]>([]);
  const [projektBereiche, setProjektBereiche] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [meldung, setMeldung] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [seiteGeprueft, setSeiteGeprueft] = useState(false);
  const [uebersichtOffen, setUebersichtOffen] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProjektStatus>("Alle");
  const [suche, setSuche] = useState("");

  useEffect(() => {
    ladeProjekte(true);
  }, []);

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

    if (error || String(data?.rolle || "").trim().toLowerCase() !== "admin") {
      window.location.href = "/";
      return false;
    }

    setIsAdmin(true);
    return true;
  }

  async function ladeProjekte(initial = false) {
    if (initial) setInitialLoading(true);
    setLoading(true);
    setMeldung("");

    const erlaubt = await pruefeAdmin();

    if (!erlaubt) {
      setLoading(false);
      if (initial) setInitialLoading(false);
      return;
    }

    const { data: projektData, error: projektError } = await supabase
      .from("projekte")
      .select("*")
      .order("kunde", { ascending: true })
      .order("kommission", { ascending: true });

    if (projektError) {
      setMeldung(projektError.message);
      console.log(projektError);
      setSeiteGeprueft(true);
      setLoading(false);
      if (initial) setInitialLoading(false);
      return;
    }

    const { data: bereicheData, error: bereicheError } = await supabase
      .from("projekt_bereiche")
      .select("projekt_id, bereich");

    if (bereicheError) {
      console.log("PROJEKT BEREICHE LADEN FEHLER:", bereicheError);
    }

    const map: Record<string, string[]> = {};

    ((bereicheData || []) as ProjektBereich[]).forEach((eintrag) => {
      const id = String(eintrag.projekt_id || "");
      const bereich = String(eintrag.bereich || "").trim();

      if (!id || !bereich) return;
      if (!map[id]) map[id] = [];
      if (!map[id].includes(bereich)) map[id].push(bereich);
    });

    setProjekte((projektData || []) as Projekt[]);
    setProjektBereiche(map);
    setSeiteGeprueft(true);
    setLoading(false);
    if (initial) setInitialLoading(false);
  }

  function projektTitel(projekt: Projekt) {
    return (
      projekt.name ||
      projekt.projektname ||
      projekt.projekt_name ||
      projekt.kommission ||
      "Ohne Projekt"
    );
  }

  function istSystemProjekt(projekt: Projekt) {
    const titel = projektTitel(projekt).toLowerCase();
    const kunde = String(projekt.kunde || "").toLowerCase();

    return titel.includes("betriebsunterhalt") || kunde === "intern";
  }

  function statusSortWert(status: string) {
    if (status === "Aktiv") return 1;
    if (status === "Pausiert") return 2;
    if (status === "Abgeschlossen") return 3;
    return 4;
  }

  function bereicheNormalisieren(wert: unknown): string[] {
    if (Array.isArray(wert)) {
      return wert.map((eintrag) => String(eintrag || "").trim()).filter(Boolean);
    }

    if (typeof wert === "string") {
      const sauber = wert.trim();
      if (!sauber) return [];

      try {
        const parsed = JSON.parse(sauber);
        if (Array.isArray(parsed)) {
          return parsed.map((eintrag) => String(eintrag || "").trim()).filter(Boolean);
        }
      } catch {
        // Normale Komma-Liste
      }

      return sauber
        .split(",")
        .map((eintrag) => eintrag.trim())
        .filter(Boolean);
    }

    return [];
  }

  function bereicheFuerProjekt(projekt: Projekt) {
    const id = String(projekt.id || "");
    const ausTabelle = id ? projektBereiche[id] || [] : [];
    if (ausTabelle.length > 0) return ausTabelle;

    const erlaubte = bereicheNormalisieren(projekt.erlaubte_bereiche);
    if (erlaubte.length > 0) return erlaubte;

    const bereiche = bereicheNormalisieren(projekt.bereiche);
    if (bereiche.length > 0) return bereiche;

    return [];
  }

  function statusWert(projekt: Projekt) {
    return projekt.status || "Aktiv";
  }

  function statusFarbe(status: string) {
    if (status === "Aktiv") return "border-emerald-300/50 bg-emerald-100/70 text-emerald-800";
    if (status === "Pausiert") return "border-orange-300/50 bg-orange-100/70 text-orange-800";
    if (status === "Abgeschlossen") return "border-slate-300/60 bg-slate-100/70 text-slate-700";
    return "border-slate-300/60 bg-slate-100/70 text-slate-700";
  }

  async function projektAbschliessen(projekt: Projekt) {
    if (!isAdmin) {
      setMeldung("Keine Berechtigung.");
      return;
    }

    if (!projekt.id) {
      setMeldung("Projekt konnte nicht gefunden werden.");
      return;
    }

    const aktuellerStatus = statusWert(projekt);

    if (aktuellerStatus === "Abgeschlossen") {
      setMeldung("Projekt ist bereits abgeschlossen.");
      return;
    }

    const titel = projektTitel(projekt);

    if (istSystemProjekt(projekt)) {
      setMeldung("Interne Systemprojekte dürfen hier nicht abgeschlossen werden.");
      return;
    }

    const bestaetigt = window.confirm(`Projekt "${titel}" wirklich auf abgeschlossen setzen?`);

    if (!bestaetigt) return;

    setLoading(true);
    setMeldung("");

    const { error } = await supabase
      .from("projekte")
      .update({ status: "Abgeschlossen" })
      .eq("id", projekt.id);

    if (error) {
      setLoading(false);
      setMeldung(error.message || "Projekt konnte nicht abgeschlossen werden.");
      console.log(error);
      return;
    }

    setProjekte((aktuell) =>
      aktuell.map((eintrag) =>
        String(eintrag.id) === String(projekt.id)
          ? { ...eintrag, status: "Abgeschlossen" }
          : eintrag
      )
    );

    setStatusFilter("Alle");
    setLoading(false);
    setMeldung(`Projekt "${titel}" wurde abgeschlossen.`);
  }

  const aktiveProjekte = useMemo(
    () => projekte.filter((projekt) => statusWert(projekt) === "Aktiv").length,
    [projekte]
  );

  const pausierteProjekte = useMemo(
    () => projekte.filter((projekt) => statusWert(projekt) === "Pausiert").length,
    [projekte]
  );

  const abgeschlosseneProjekte = useMemo(
    () => projekte.filter((projekt) => statusWert(projekt) === "Abgeschlossen").length,
    [projekte]
  );

  const gefilterteProjekte = useMemo(() => {
    const suchText = suche.trim().toLowerCase();

    return projekte
      .filter((projekt) => {
        const status = statusWert(projekt);
        const passtStatus = statusFilter === "Alle" || status === statusFilter;

        if (!passtStatus) return false;
        if (!suchText) return true;

        const bereiche = bereicheFuerProjekt(projekt).join(" ");
        const text = [
          projekt.kunde,
          projekt.kommission,
          projekt.name,
          projekt.projektname,
          projekt.projekt_name,
          status,
          bereiche,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(suchText);
      })
      .sort((a, b) => {
        const statusVergleich = statusSortWert(statusWert(a)) - statusSortWert(statusWert(b));
        if (statusVergleich !== 0) return statusVergleich;

        return projektTitel(a).localeCompare(projektTitel(b), "de-CH");
      });
  }, [projekte, projektBereiche, suche, statusFilter]);

  const pageLoading = !seiteGeprueft || initialLoading;

  return (
    <main className="projekte-v12 space-y-6 text-slate-950">
      <section className="v12-hero relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-[#302720]/90 via-[#26272a]/90 to-[#161719]/95 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)] lg:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.46]">
          <div
            className="h-full w-full bg-cover bg-[center_20%]"
            style={{
              backgroundImage: "url('/berg.png')",
              filter: "brightness(1.45) contrast(1.04) saturate(0.92)",
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1a1512]/90 via-[#26231f]/60 to-[#f4eee5]/10" />

        <div className="relative z-10 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <div className="inline-flex rounded-full border border-orange-200/30 bg-orange-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-100">
              ODZ V1.2 · Projekte
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Projektübersicht
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/65 sm:text-base">
              Saubere Übersicht über aktive, pausierte und abgeschlossene Projekte. Projekte können hier schnell abgeschlossen werden, alles andere bleibt im Chef Dashboard.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
                <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
                <span className="text-xs font-black uppercase tracking-widest text-white/70">
                  Übersicht · Schnell abschließen
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3">
            <HeroMini label="Aktiv" value={pageLoading ? "—" : String(aktiveProjekte).padStart(2, "0")} green={!pageLoading && aktiveProjekte > 0} />
            <HeroMini label="Pausiert" value={pageLoading ? "—" : String(pausierteProjekte).padStart(2, "0")} blue={!pageLoading && pausierteProjekte > 0} />
            <HeroMini label="Archiv" value={pageLoading ? "—" : String(abgeschlosseneProjekte).padStart(2, "0")} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/60 bg-white/35 p-2 shadow-[0_14px_44px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <ActionCard href="#uebersicht" label="Übersicht" title="📋 Projekte" onClick={() => setUebersichtOffen(true)} />
          <ActionCard href="/chef-dashboard" label="Zentrale" title="➕ Chef Dash" />
          <ActionCard href="/projektanalyse" label="Auswertung" title="📊 Analyse" />
          <ActionCard href="#uebersicht" label="Refresh" title={loading ? "⏳ Lädt" : "↻ Aktualisieren"} onClick={() => ladeProjekte(false)} />
        </div>
      </section>

      {meldung && (
        <div className="rounded-xl border border-orange-200/40 bg-orange-100/60 p-4 text-sm font-bold text-slate-950">
          {meldung}
        </div>
      )}

      <DropdownPanel
        id="uebersicht"
        title="Projektübersicht"
        eyebrow="Aktiv · Pausiert · Archiv"
        description="Diese Seite zeigt den Überblick. Projekte kannst du hier per Klick abschließen, alles Weitere machst du im Chef Dashboard."
        open={uebersichtOffen}
        onToggle={() => setUebersichtOffen(!uebersichtOffen)}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-600">Suche</span>
            <input
              type="text"
              value={suche}
              onChange={(event) => setSuche(event.target.value)}
              placeholder="🔍 Kunde, Projekt, Kommission, Bereich suchen..."
              className="warm-input"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {(["Alle", "Aktiv", "Pausiert", "Abgeschlossen"] as ProjektStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-2xl border px-4 py-3 text-sm font-black transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-300/5 hover:shadow-lg hover:shadow-orange-900/10 ${
                  statusFilter === status
                    ? "border-orange-300/50 bg-orange-100/60 text-slate-950 shadow-lg shadow-orange-900/10"
                    : "border-white/70 bg-white/55 text-slate-500"
                }`}
              >
                {status === "Abgeschlossen" ? "Archiv" : status}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="Aktiv" value={aktiveProjekte} subvalue="laufende Projekte" green />
          <KpiCard label="Pausiert" value={pausierteProjekte} subvalue="wartet / gestoppt" blue />
          <KpiCard label="Archiv" value={abgeschlosseneProjekte} subvalue="abgeschlossen" />
        </div>

        <div className="rounded-2xl border border-orange-200/50 bg-orange-100/55 p-4 text-sm font-bold text-orange-900">
          Hinweis: Projekt abschließen ist hier erlaubt. Projekt erstellen, bearbeiten, löschen und Bereiche ändern läuft im Chef Dashboard.
        </div>

        {pageLoading ? (
          <EmptyState text="Projektübersicht wird vorbereitet." />
        ) : gefilterteProjekte.length === 0 ? (
          <EmptyState text="Keine Projekte gefunden." />
        ) : (
          <>
            <div className="space-y-4 md:hidden">
              {gefilterteProjekte.map((projekt) => (
                <ProjektMobileCard
                  key={projekt.id}
                  projekt={projekt}
                  bereiche={bereicheFuerProjekt(projekt)}
                  projektTitel={projektTitel}
                  statusFarbe={statusFarbe}
                  onAbschliessen={projektAbschliessen}
                  loading={loading}
                />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-white/70 bg-white/55 shadow-[0_14px_44px_rgba(15,23,42,0.06)] md:block">
              <div className="overflow-x-auto">
                <div className="min-w-[1180px]">
                  <div className="grid grid-cols-[1.1fr_1.1fr_1.3fr_1fr_1.4fr_0.9fr] border-b border-white/70 bg-stone-900/5 px-5 py-4 text-sm font-black uppercase tracking-wide text-slate-500">
                    <div>Kunde</div>
                    <div>Kommission</div>
                    <div>Projekt</div>
                    <div>Status</div>
                    <div>Bereiche</div>
                    <div>Aktion</div>
                  </div>

                  {gefilterteProjekte.map((projekt) => {
                    const bereiche = bereicheFuerProjekt(projekt);
                    const status = statusWert(projekt);

                    return (
                      <div
                        key={projekt.id}
                        className="grid grid-cols-[1.1fr_1.1fr_1.3fr_1fr_1.4fr_0.9fr] items-center border-b border-white/70 px-5 py-4 text-slate-700 transition-colors last:border-b-0 hover:bg-orange-300/5 hover:text-slate-950"
                      >
                        <div className="font-black text-slate-950">{projekt.kunde || "Intern"}</div>
                        <div>{projekt.kommission || "-"}</div>
                        <div className="font-bold text-orange-800">{projektTitel(projekt)}</div>
                        <div>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(status)}`}>
                            {status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {bereiche.length === 0 ? (
                            <span className="text-sm font-bold text-slate-400">Keine Bereiche</span>
                          ) : (
                            bereiche.map((bereich) => (
                              <span
                                key={`${projekt.id}-${bereich}`}
                                className="rounded-full border border-white/70 bg-white/65 px-3 py-1 text-xs font-black text-slate-600"
                              >
                                {bereich}
                              </span>
                            ))
                          )}
                        </div>
                        <div>
                          {status === "Abgeschlossen" ? (
                            <span className="inline-flex rounded-xl border border-white/70 bg-white/55 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400">
                              Erledigt
                            </span>
                          ) : istSystemProjekt(projekt) ? (
                            <span className="inline-flex rounded-xl border border-orange-200/50 bg-orange-100/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-800">
                              System
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => projektAbschliessen(projekt)}
                              disabled={loading}
                              className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 px-4 py-2 text-sm font-black text-emerald-800 transition hover:-translate-y-1 hover:border-emerald-900/45 hover:bg-emerald-950/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              ✓ Abschließen
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </DropdownPanel>

      <style jsx global>{`
        .warm-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.72);
          background: rgba(255, 255, 255, 0.82);
          padding: 0.95rem 1rem;
          color: #020617;
          outline: none;
          transition: 0.2s ease;
          color-scheme: light;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
        }

        .warm-input:focus {
          border-color: rgba(251, 146, 60, 0.55);
          box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.72);
          background: rgba(255, 255, 255, 0.94);
        }

        .warm-input::placeholder {
          color: rgba(15, 23, 42, 0.45);
        }

        .warm-input[type="date"],
        .warm-input[type="month"],
        .warm-input[type="datetime-local"] {
          padding-right: 3rem !important;
          background-repeat: no-repeat !important;
          background-position: right 1rem center !important;
          background-size: 1.15rem 1.15rem !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23020617' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E") !important;
        }

        .warm-input[type="time"] {
          padding-right: 3rem !important;
          background-repeat: no-repeat !important;
          background-position: right 1rem center !important;
          background-size: 1.15rem 1.15rem !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23020617' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E") !important;
        }

        .warm-input::-webkit-calendar-picker-indicator {
          opacity: 0 !important;
          cursor: pointer !important;
          width: 2.75rem !important;
          height: 100% !important;
        }

        .projekte-v12 .v12-hero .text-slate-950,
        .projekte-v12 .v12-hero .text-slate-600,
        .projekte-v12 .v12-hero .text-slate-500 {
          color: rgba(255, 255, 255, 0.72) !important;
        }

        .projekte-v12 .v12-hero h1 {
          color: #ffffff !important;
        }
      `}</style>
    </main>
  );
}


function ProjektMobileCard({
  projekt,
  bereiche,
  projektTitel,
  statusFarbe,
  onAbschliessen,
  loading,
}: {
  projekt: Projekt;
  bereiche: string[];
  projektTitel: (projekt: Projekt) => string;
  statusFarbe: (status: string) => string;
  onAbschliessen: (projekt: Projekt) => void;
  loading: boolean;
}) {
  const status = projekt.status || "Aktiv";
  const titel = projektTitel(projekt).toLowerCase();
  const istSystem = titel.includes("betriebsunterhalt") || String(projekt.kunde || "").toLowerCase() === "intern";

  return (
    <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-slate-950">{projektTitel(projekt)}</div>
          <div className="mt-2 text-sm text-slate-600">Kunde: {projekt.kunde || "Intern"}</div>
          <div className="mt-1 text-sm text-slate-500">Kommission: {projekt.kommission || "-"}</div>
        </div>

        <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(status)}`}>
          {status}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {bereiche.length === 0 ? (
          <span className="text-sm font-bold text-slate-400">Keine Bereiche</span>
        ) : (
          bereiche.map((bereich) => (
            <span
              key={`${projekt.id}-${bereich}`}
              className="rounded-full border border-white/70 bg-white/65 px-3 py-1 text-xs font-black text-slate-600"
            >
              {bereich}
            </span>
          ))
        )}
      </div>

      <div className="mt-5">
        {status === "Abgeschlossen" ? (
          <div className="rounded-xl border border-white/70 bg-white/55 px-4 py-3 text-center text-sm font-black uppercase tracking-widest text-slate-400">
            Erledigt
          </div>
        ) : istSystem ? (
          <div className="rounded-xl border border-orange-200/50 bg-orange-100/60 px-4 py-3 text-center text-sm font-black uppercase tracking-widest text-orange-800">
            Systemprojekt
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAbschliessen(projekt)}
            disabled={loading}
            className="w-full rounded-xl border border-emerald-900/30 bg-emerald-950/10 px-4 py-3 font-black text-emerald-800 transition hover:-translate-y-1 hover:border-emerald-900/45 hover:bg-emerald-950/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✓ Projekt abschließen
          </button>
        )}
      </div>
    </div>
  );
}


function ActionCard({
  href,
  label,
  title,
  onClick,
}: {
  href: string;
  label: string;
  title: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group block w-full rounded-2xl border border-white/70 bg-white/55 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-lg hover:shadow-orange-900/10"
    >
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-base font-black text-slate-950">{title}</div>
    </Link>
  );
}


function DropdownPanel({
  id,
  title,
  eyebrow,
  description,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section id={id} className="overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/[0.08] to-white/[0.025] shadow-2xl shadow-slate-900/10">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col justify-between gap-4 p-6 text-left transition hover:bg-orange-300/5 lg:flex-row lg:items-center lg:p-7"
      >
        <div>
          <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-800">{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-slate-500">{description}</p>
        </div>

        <div className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-5 py-3 text-sm font-black text-slate-950 transition hover:border-orange-300/40 hover:bg-orange-300/10 hover:text-orange-700">
          {open ? "Schließen ▲" : "Öffnen ▼"}
        </div>
      </button>

      {open && <div className="space-y-6 border-t border-white/70 p-6 lg:p-7">{children}</div>}
    </section>
  );
}


function KpiCard({
  label,
  value,
  subvalue,
  blue,
  green,
}: {
  label: string;
  value: string | number;
  subvalue?: string;
  blue?: boolean;
  green?: boolean;
}) {
  const valueColor = green ? "text-emerald-700" : blue ? "text-orange-800" : "text-slate-950";

  return (
    <div className="rounded-3xl border border-white/70 bg-white/60 p-6 shadow-[0_16px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-orange-900/10">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </div>

      <div className={`mt-4 break-words text-4xl font-black leading-tight ${valueColor}`}>
        {value}
      </div>

      {subvalue && (
        <div className="mt-2 break-words text-sm font-bold text-slate-500">
          {subvalue}
        </div>
      )}
    </div>
  );
}


function HeroMini({
  label,
  value,
  blue,
  green,
}: {
  label: string;
  value: string | number;
  blue?: boolean;
  green?: boolean;
}) {
  const color = blue ? "text-orange-200" : green ? "text-emerald-300" : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-center transition hover:border-orange-200/40 hover:bg-orange-300/10">
      <div className={`text-xl font-black leading-tight md:text-2xl ${color}`}>{value}</div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/50">{label}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="min-h-[220px] rounded-xl border border-white/70 bg-white/55 p-5 text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}
