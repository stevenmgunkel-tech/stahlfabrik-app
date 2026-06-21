"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

type Mitarbeiter = {
  id: number;
  name: string | null;
  rolle: string | null;
  wochenstunden: number | string | null;
  ferienwochen: number | string | null;
  urlaubstage: number | string | null;
  ueberstunden_start: number | string | null;
  eintrittsdatum: string | null;
  probezeit_bis: string | null;
  austrittsdatum: string | null;
  vertragsart: string | null;
  status?: string | null;
};

function formatStunden(value: number | string | null | undefined) {
  const zahl = Number(value || 0);
  const totalMinuten = Math.round(zahl * 60);
  const stunden = Math.floor(totalMinuten / 60);
  const minuten = totalMinuten % 60;

  if (stunden <= 0) return `${minuten} min`;
  if (minuten === 0) return `${stunden} h`;
  return `${stunden} h ${minuten} min`;
}

function formatDatum(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("de-CH");
}

function berechneUrlaubstage(eintritt: string, wochen: string) {
  const ferienTageProJahr = Number(wochen || 0) * 5;
  if (!eintritt) return ferienTageProJahr.toFixed(2);

  const start = new Date(eintritt);
  const aktuellesJahr = new Date().getFullYear();
  const eintrittsJahr = start.getFullYear();

  if (eintrittsJahr < aktuellesJahr) return ferienTageProJahr.toFixed(2);
  if (eintrittsJahr > aktuellesJahr) return "0.00";

  const eintrittsMonat = start.getMonth() + 1;
  const monateImJahr = 13 - eintrittsMonat;
  const anteil = (ferienTageProJahr / 12) * monateImJahr;

  return anteil.toFixed(2);
}

function istInProbezeit(probezeitBis: string | null | undefined) {
  if (!probezeitBis) return false;
  return new Date(probezeitBis) >= new Date();
}

export default function MitarbeiterPage() {
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [seiteGeprueft, setSeiteGeprueft] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [suche, setSuche] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [teamOffen, setTeamOffen] = useState(true);
  const [detailsOffen, setDetailsOffen] = useState(true);
  const [bearbeitenOffen, setBearbeitenOffen] = useState(false);

  const [name, setName] = useState("");
  const [rolle, setRolle] = useState("Mitarbeiter");
  const [wochenstunden, setWochenstunden] = useState("");
  const [ferienwochen, setFerienwochen] = useState("4");
  const [urlaubstage, setUrlaubstage] = useState("");
  const [ueberstundenStart, setUeberstundenStart] = useState("");
  const [eintrittsdatum, setEintrittsdatum] = useState("");
  const [probezeitBis, setProbezeitBis] = useState("");
  const [austrittsdatum, setAustrittsdatum] = useState("");
  const [vertragsart, setVertragsart] = useState("Unbefristet");

  useEffect(() => {
    ladeMitarbeiter(true);
  }, []);

  useEffect(() => {
    setUrlaubstage(berechneUrlaubstage(eintrittsdatum, ferienwochen));
  }, [eintrittsdatum, ferienwochen]);

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
    return true;
  }

  async function ladeMitarbeiter(initial = false) {
    if (initial) {
      setInitialLoading(true);
      setLoading(true);
    }

    setMeldung("");

    const erlaubt = await pruefeAdmin();

    if (!erlaubt) {
      if (initial) {
        setInitialLoading(false);
        setLoading(false);
      }

      return;
    }

    const { data, error } = await supabase
      .from("mitarbeiter")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setMeldung(error.message);
      setSeiteGeprueft(true);

      if (initial) {
        setInitialLoading(false);
        setLoading(false);
      }

      return;
    }

    const liste = (data || []) as Mitarbeiter[];
    setMitarbeiter(liste);

    if (!selectedId && liste.length > 0) {
      setSelectedId(liste[0].id);
    }

    setSeiteGeprueft(true);
    setLoading(false);

    if (initial) setInitialLoading(false);
  }

  const gefilterteMitarbeiter = useMemo(() => {
    const suchText = suche.toLowerCase().trim();
    if (!suchText) return mitarbeiter;

    return mitarbeiter.filter((person) => {
      return (
        person.name?.toLowerCase().includes(suchText) ||
        person.rolle?.toLowerCase().includes(suchText) ||
        person.vertragsart?.toLowerCase().includes(suchText)
      );
    });
  }, [mitarbeiter, suche]);

  const selected = useMemo(() => {
    return mitarbeiter.find((person) => person.id === selectedId) || null;
  }, [mitarbeiter, selectedId]);

  const aktive = mitarbeiter.filter((p) => !p.austrittsdatum).length;
  const admins = mitarbeiter.filter((p) => p.rolle === "Admin").length;
  const probezeit = mitarbeiter.filter((p) => istInProbezeit(p.probezeit_bis)).length;
  const gesamtWochenstunden = mitarbeiter.reduce(
    (sum, person) => sum + Number(person.wochenstunden || 0),
    0
  );

  function mitarbeiterAuswaehlen(person: Mitarbeiter) {
    setSelectedId(person.id);
    setBearbeitenOffen(false);
  }

  function formularFuellen(person: Mitarbeiter) {
    setSelectedId(person.id);
    setName(person.name || "");
    setRolle(person.rolle || "Mitarbeiter");
    setWochenstunden(String(person.wochenstunden || ""));
    setFerienwochen(String(person.ferienwochen || 4));
    setUrlaubstage(String(person.urlaubstage || ""));
    setUeberstundenStart(String(person.ueberstunden_start || 0));
    setEintrittsdatum(person.eintrittsdatum || "");
    setProbezeitBis(person.probezeit_bis || "");
    setAustrittsdatum(person.austrittsdatum || "");
    setVertragsart(person.vertragsart || "Unbefristet");
    setBearbeitenOffen(true);
    setDetailsOffen(true);
  }

  function formularLeeren() {
    setBearbeitenOffen(false);
    setName("");
    setRolle("Mitarbeiter");
    setWochenstunden("");
    setFerienwochen("4");
    setUrlaubstage("");
    setUeberstundenStart("");
    setEintrittsdatum("");
    setProbezeitBis("");
    setAustrittsdatum("");
    setVertragsart("Unbefristet");
  }

  async function mitarbeiterSpeichern() {
    if (!isAdmin || !selectedId) return;

    if (!name.trim()) {
      setMeldung("Bitte Namen eingeben.");
      return;
    }

    setSaving(true);
    setMeldung("");

    const daten = {
      name,
      rolle,
      wochenstunden: Number(wochenstunden || 0),
      ferienwochen: Number(ferienwochen || 0),
      urlaubstage: Number(urlaubstage || 0),
      ueberstunden_start: Number(ueberstundenStart || 0),
      eintrittsdatum: eintrittsdatum || null,
      probezeit_bis: probezeitBis || null,
      austrittsdatum: austrittsdatum || null,
      vertragsart,
    };

    const { error } = await supabase
      .from("mitarbeiter")
      .update(daten)
      .eq("id", selectedId);

    if (error) {
      setMeldung(error.message);
      setSaving(false);
      return;
    }

    setMeldung("Mitarbeiter aktualisiert.");
    await ladeMitarbeiter(false);
    formularLeeren();
    setSaving(false);
  }

  async function mitarbeiterLoeschen(id: number) {
    if (!isAdmin) return;
    const bestaetigen = confirm("Mitarbeiter wirklich löschen?");
    if (!bestaetigen) return;

    const { error } = await supabase.from("mitarbeiter").delete().eq("id", id);

    if (error) {
      setMeldung(error.message);
      return;
    }

    setMeldung("Mitarbeiter gelöscht.");
    setSelectedId(null);
    await ladeMitarbeiter(false);
  }

  const pageLoading = !seiteGeprueft || initialLoading;

  return (
    <main className="space-y-8 text-slate-100">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-6 shadow-2xl shadow-black/30 lg:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.38]">
          <div
            className="h-full w-full bg-cover bg-[center_20%]"
            style={{
              backgroundImage: "url('/berg.png')",
              filter: "brightness(1.65) contrast(1.05)",
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <div className="inline-flex rounded-full border border-slate-400/25 bg-slate-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-slate-200">
              ODZ SILVER · Personal
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Mitarbeiter
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/65 sm:text-base">
              Teamübersicht, Rollen, Verträge, Ferien, Probezeit und Stärken in einer sauberen Personal-Zentrale.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
              <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
              <span className="text-xs font-black uppercase tracking-widest text-white/70">
                Personalverwaltung
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-4">
            <HeroMini label="Team" value={pageLoading ? "—" : String(mitarbeiter.length).padStart(2, "0")} />
            <HeroMini label="Aktiv" value={pageLoading ? "—" : String(aktive).padStart(2, "0")} green={!pageLoading && aktive > 0} />
            <HeroMini label="Probe" value={pageLoading ? "—" : String(probezeit).padStart(2, "0")} blue={!pageLoading && probezeit > 0} />
            <HeroMini label="Admin" value={pageLoading ? "—" : String(admins).padStart(2, "0")} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ActionCard href="#team" label="Übersicht" title="👥 Team" onClick={() => setTeamOffen(true)} />
        <ActionCard href="#details" label="Details" title="📋 Personalakte" onClick={() => setDetailsOffen(true)} />
        <ActionCard href="#bearbeiten" label="Verwalten" title="✎ Bearbeiten" onClick={() => selected && formularFuellen(selected)} />
        <ActionCard href="#staerken" label="Entwicklung" title="🎯 Stärken" onClick={() => setDetailsOffen(true)} />
      </section>

        {meldung && (
          <div className="rounded-xl border border-slate-200/20 bg-slate-200/10 p-4 text-sm font-bold text-slate-100">
            {meldung}
          </div>
        )}

        <DropdownPanel
          id="team"
          title="Team"
          eyebrow="Übersicht · Auswahl · Suche"
          description="Mitarbeiter auswählen und Details bearbeiten."
          open={teamOffen}
          onToggle={() => setTeamOffen(!teamOffen)}
        >
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="border-b border-white/10 p-5 sm:p-6">
              <h2 className="text-xl font-black text-white">Team</h2>
              <p className="mt-1 text-sm leading-6 text-white/50">Mitarbeiter auswählen und Details bearbeiten.</p>

              <input
                type="text"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Mitarbeiter suchen..."
                className="dark-input mt-5"
              />
            </div>

            {pageLoading || loading ? (
              <EmptyState text="Team wird vorbereitet..." />
            ) : gefilterteMitarbeiter.length === 0 ? (
              <EmptyState text="Keine Mitarbeiter gefunden." />
            ) : (
              <div className="max-h-[720px] space-y-3 overflow-y-auto p-4 sm:p-5">
                {gefilterteMitarbeiter.map((person) => {
                  const aktiv = selectedId === person.id;
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => mitarbeiterAuswaehlen(person)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition-colors hover:border-sky-300/25 hover:bg-sky-300/5 ${
                        aktiv
                          ? "border-sky-300/35 bg-sky-300/10 shadow-lg shadow-sky-300/10"
                          : "border-white/10 bg-black/25"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-black text-white">{person.name || "Ohne Name"}</div>
                          <div className="mt-1 text-sm font-bold text-white/45">{person.vertragsart || "Vertrag offen"}</div>
                        </div>

                        <RoleBadge rolle={person.rolle || "Mitarbeiter"} />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <MiniStat label="Woche" value={formatStunden(person.wochenstunden)} />
                        <MiniStat label="Ferien" value={`${person.ferienwochen || 4} W`} />
                        <MiniStat label="Status" value={istInProbezeit(person.probezeit_bis) ? "Probe" : "Aktiv"} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {pageLoading ? (
              <div className="min-h-[420px] rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-sm font-bold text-white/45 shadow-xl shadow-black/20 backdrop-blur-xl">
                Personalakte wird vorbereitet.
              </div>
            ) : !selected ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-white/55 shadow-xl shadow-black/20 backdrop-blur-xl">
                Wähle links einen Mitarbeiter aus.
              </div>
            ) : (
              <>
                <DropdownPanel
                  id="details"
                  title="Personalakte"
                  eyebrow="Details · Vertrag · Zeiten"
                  description="Rollen, Arbeitszeit, Ferien und Vertragsdaten des ausgewählten Mitarbeiters."
                  open={detailsOffen}
                  onToggle={() => setDetailsOffen(!detailsOffen)}
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-3xl font-black text-white">{selected.name}</h2>
                          <RoleBadge rolle={selected.rolle || "Mitarbeiter"} />
                        </div>
                        <p className="mt-2 text-sm font-bold text-white/45">
                          {selected.vertragsart || "Vertrag offen"} · Eintritt {formatDatum(selected.eintrittsdatum)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => formularFuellen(selected)}
                          className="rounded-2xl border border-sky-300/25 bg-sky-300/10 px-4 py-3 text-sm font-black text-sky-100 transition-colors hover:border-sky-300/35 hover:bg-sky-300/15"
                        >
                          Bearbeiten
                        </button>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <InfoCard label="Wochenstunden" value={formatStunden(selected.wochenstunden)} />
                        <InfoCard label="Ferienwochen" value={`${selected.ferienwochen || 4} Wochen`} />
                        <InfoCard label="Urlaubstage" value={selected.urlaubstage || 0} />
                        <InfoCard label="Ü-Start" value={formatStunden(selected.ueberstunden_start)} />
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <InfoCard label="Eintritt" value={formatDatum(selected.eintrittsdatum)} />
                        <InfoCard label="Probezeit bis" value={formatDatum(selected.probezeit_bis)} />
                        <InfoCard label="Austritt" value={formatDatum(selected.austrittsdatum)} tone={selected.austrittsdatum ? "red" : undefined} />
                      </div>

                      <div id="staerken" className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <h3 className="text-xl font-black text-white">Mitarbeiter-Stärken</h3>
                            <p className="mt-1 text-sm text-white/45">Vorbereitet für die spätere Auswertung.</p>
                          </div>
                          <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-sky-100">
                            Bald aktiv
                          </span>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <Strength label="Metallbauer" value={selected.rolle === "Lehrling" ? 35 : 80} />
                          <Strength label="Werkstatt" value={selected.rolle === "Admin" ? 55 : 85} />
                          <Strength label="Montage" value={selected.rolle === "Admin" ? 45 : 75} />
                          <Strength label="Planung / AVOR" value={selected.rolle === "Admin" ? 90 : 40} />
                        </div>
                      </div>
                    </div>
                </DropdownPanel>

                {bearbeitenOffen && (
                  <DropdownPanel
                    id="bearbeiten"
                    title="Mitarbeiter bearbeiten"
                    eyebrow="Verwalten · Vertrag · Ferien"
                    description="Neue Mitarbeiter werden weiterhin im Chef Dashboard erstellt."
                    open={bearbeitenOffen}
                    onToggle={() => setBearbeitenOffen(!bearbeitenOffen)}
                  >
                    <div className="space-y-5">
                      <div className="grid gap-4 lg:grid-cols-3">
                        <Field label="Name"><Input value={name} onChange={setName} /></Field>
                        <Field label="Rolle"><Select value={rolle} onChange={setRolle} options={["Mitarbeiter", "Admin", "Lehrling", "Temporär", "Aushilfe"]} /></Field>
                        <Field label="Vertragsart"><Select value={vertragsart} onChange={setVertragsart} options={["Unbefristet", "Befristet", "Temporär", "Lehre", "Aushilfe"]} /></Field>
                        <Field label="Wochenstunden"><Input type="number" step="0.5" value={wochenstunden} onChange={setWochenstunden} /></Field>
                        <Field label="Ferienwochen"><Input type="number" step="0.5" value={ferienwochen} onChange={setFerienwochen} /></Field>
                        <Field label="Urlaubstage automatisch"><Input type="number" step="0.01" value={urlaubstage} onChange={setUrlaubstage} readOnly /></Field>
                        <Field label="Überstunden Start"><Input type="number" step="0.5" value={ueberstundenStart} onChange={setUeberstundenStart} /></Field>
                        <Field label="Eintrittsdatum"><Input type="date" value={eintrittsdatum} onChange={setEintrittsdatum} /></Field>
                        <Field label="Probezeit bis"><Input type="date" value={probezeitBis} onChange={setProbezeitBis} /></Field>
                        <Field label="Austrittsdatum"><Input type="date" value={austrittsdatum} onChange={setAustrittsdatum} /></Field>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={mitarbeiterSpeichern}
                          disabled={saving}
                          className="rounded-2xl border border-sky-300/25 bg-sky-300/10 px-5 py-3 font-black text-sky-100 transition-colors hover:border-sky-300/35 hover:bg-sky-300/15 disabled:opacity-50"
                        >
                          {saving ? "Speichern..." : "Änderung speichern"}
                        </button>

                        <button
                          type="button"
                          onClick={formularLeeren}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white transition-colors hover:border-sky-300/25 hover:bg-sky-300/5"
                        >
                          Abbrechen
                        </button>

                        <button
                          type="button"
                          onClick={() => mitarbeiterLoeschen(selected.id)}
                          className="rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-3 font-bold text-red-200 transition-colors hover:bg-red-500/15"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </DropdownPanel>
                )}
              </>
            )}
          </div>
          </div>
        </DropdownPanel>

      <style jsx global>{`
        .dark-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.28);
          padding: 0.95rem 1rem;
          color: white;
          outline: none;
          transition: 0.2s ease;
        }

        .dark-input:focus {
          border-color: rgba(125, 211, 252, 0.45);
          box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.1);
          background: rgba(0, 0, 0, 0.38);
        }

        .dark-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .dark-input option {
          background: #111315;
          color: white;
        }

        .dark-input::-webkit-calendar-picker-indicator {
          filter: brightness(0) invert(1);
          opacity: 1;
          cursor: pointer;
        }
      `}</style>
    </main>
  );
}

function HeroMini({
  label,
  value,
  green,
  blue,
  red,
}: {
  label: string;
  value: string | number;
  green?: boolean;
  blue?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div
        className={`text-xl font-black leading-tight md:text-2xl ${
          red
            ? "text-red-400"
            : green
              ? "text-green-400"
              : blue
                ? "text-sky-200"
                : "text-slate-100"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
        {label}
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
    <a
      href={href}
      onClick={onClick}
      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-sky-300/25 hover:bg-sky-300/5"
    >
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-2 text-lg font-black text-white">{title}</div>
    </a>
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
    <section id={id} className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] shadow-2xl shadow-black/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col justify-between gap-4 p-6 text-left transition hover:bg-sky-300/5 lg:flex-row lg:items-center lg:p-7"
      >
        <div>
          <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
          <p className="mt-1 text-white/55">{description}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/30 bg-slate-200/10 px-5 py-3 text-sm font-black text-slate-100 transition hover:border-sky-300/35 hover:bg-sky-300/10 hover:text-sky-100">
          {open ? "Schließen ▲" : "Öffnen ▼"}
        </div>
      </button>

      {open && <div className="space-y-6 border-t border-white/10 p-6 lg:p-7">{children}</div>}
    </section>
  );
}

function RoleBadge({ rolle }: { rolle: string }) {
  const style =
    rolle === "Admin"
      ? "border-slate-200/30 bg-slate-200/10 text-slate-100"
      : rolle === "Lehrling"
      ? "border-sky-300/30 bg-sky-300/10 text-sky-200"
      : rolle === "Temporär"
      ? "border-violet-300/30 bg-violet-300/10 text-violet-200"
      : rolle === "Aushilfe"
      ? "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-200"
      : "border-green-400/30 bg-green-500/10 text-green-300";

  return <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-black ${style}`}>{rolle}</span>;
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-2 truncate text-sm font-black text-sky-100">{value}</div>
    </div>
  );
}

function InfoCard({ label, value, tone }: { label: string; value: string | number; tone?: "red" }) {
  const color = tone === "red" ? "text-red-200" : "text-sky-100";
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4 transition-colors hover:border-sky-300/25 hover:bg-sky-300/5">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">{label}</div>
      <div className={`mt-3 break-words text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}

function Strength({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-black text-white">{label}</div>
        <div className="text-sm font-black text-sky-100">{value}%</div>
      </div>
      <div className="mt-3 overflow-hidden rounded-full bg-black/40">
        <div className="h-2 rounded-full bg-gradient-to-r from-sky-200 to-green-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-white/70">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", step, readOnly }: { value: string; onChange: (value: string) => void; type?: string; step?: string; readOnly?: boolean }) {
  return (
    <input
      type={type}
      step={step}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className="dark-input"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="dark-input"
    >
      {options.map((option) => (
        <option key={option} value={option} className="bg-[#111315] text-white">
          {option}
        </option>
      ))}
    </select>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="min-h-[360px] p-6 text-sm font-bold text-white/55">{text}</div>;
}
