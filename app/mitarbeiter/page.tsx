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
  const [saving, setSaving] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [suche, setSuche] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
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
    ladeMitarbeiter();
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
    setSeiteGeprueft(true);
    return true;
  }

  async function ladeMitarbeiter() {
    setLoading(true);
    setMeldung("");

    const erlaubt = await pruefeAdmin();
    if (!erlaubt) return;

    const { data, error } = await supabase
      .from("mitarbeiter")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setMeldung(error.message);
      setLoading(false);
      return;
    }

    const liste = (data || []) as Mitarbeiter[];
    setMitarbeiter(liste);

    if (!selectedId && liste.length > 0) {
      setSelectedId(liste[0].id);
    }

    setLoading(false);
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
    await ladeMitarbeiter();
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
    await ladeMitarbeiter();
  }

  if (!seiteGeprueft) {
    return (
      <main className="min-h-screen bg-[#0b0f14] p-6 text-white">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-6 font-black shadow-2xl shadow-black/30 backdrop-blur-xl">
          Berechtigung wird geprüft...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(148,163,184,0.10),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-300/10 via-transparent to-slate-400/5" />

            <div className="relative grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
              <div>
                <div className="inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-sky-100">
                  ODZ Personal
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Mitarbeiter
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                  Teamübersicht, Rollen, Verträge, Ferien, Probezeit und Stärken in einer sauberen Personal-Zentrale.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                <HeroKpi label="Team" value={mitarbeiter.length} />
                <HeroKpi label="Aktiv" value={aktive} tone="green" />
                <HeroKpi label="Probezeit" value={probezeit} tone="sky" />
                <HeroKpi label="Woche" value={formatStunden(gesamtWochenstunden)} />
              </div>
            </div>
          </div>
        </section>

        {meldung && (
          <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-5 text-sm font-bold text-sky-100">
            {meldung}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Teammitglieder" value={mitarbeiter.length} />
          <KpiCard label="Aktive Mitarbeiter" value={aktive} tone="green" />
          <KpiCard label="In Probezeit" value={probezeit} tone="sky" />
          <KpiCard label="Admins" value={admins} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="border-b border-white/10 p-5 sm:p-6">
              <h2 className="text-xl font-black text-white">Team</h2>
              <p className="mt-1 text-sm leading-6 text-white/50">Mitarbeiter auswählen und Details bearbeiten.</p>

              <input
                type="text"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Mitarbeiter suchen..."
                className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-sky-300/40 focus:bg-black/40 focus:ring-4 focus:ring-sky-300/10"
              />
            </div>

            {loading ? (
              <EmptyState text="Team wird geladen..." />
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
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10 ${
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
            {!selected ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-white/55 shadow-xl shadow-black/20 backdrop-blur-xl">
                Wähle links einen Mitarbeiter aus.
              </div>
            ) : (
              <>
                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl">
                  <div className="border-b border-white/10 p-5 sm:p-6">
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
                          onClick={() => setDetailsOffen(!detailsOffen)}
                          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
                        >
                          {detailsOffen ? "▲ Schließen" : "▼ Öffnen"}
                        </button>
                        <button
                          type="button"
                          onClick={() => formularFuellen(selected)}
                          className="rounded-2xl border border-sky-300/25 bg-sky-300/10 px-4 py-3 text-sm font-black text-sky-100 transition hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/15 hover:shadow-lg hover:shadow-sky-300/10"
                        >
                          Bearbeiten
                        </button>
                      </div>
                    </div>
                  </div>

                  {detailsOffen && (
                    <div className="space-y-5 p-5 sm:p-6">
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

                      <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
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
                  )}
                </section>

                {bearbeitenOffen && (
                  <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl">
                    <div className="border-b border-white/10 p-5 sm:p-6">
                      <h2 className="text-xl font-black text-white">Mitarbeiter bearbeiten</h2>
                      <p className="mt-1 text-sm text-white/50">Neue Mitarbeiter werden weiterhin im Chef Dashboard erstellt.</p>
                    </div>

                    <div className="space-y-5 p-5 sm:p-6">
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
                          className="rounded-2xl border border-sky-300/25 bg-sky-300/10 px-5 py-3 font-black text-sky-100 transition hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/15 hover:shadow-lg hover:shadow-sky-300/10 disabled:opacity-50"
                        >
                          {saving ? "Speichern..." : "Änderung speichern"}
                        </button>

                        <button
                          type="button"
                          onClick={formularLeeren}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5"
                        >
                          Abbrechen
                        </button>

                        <button
                          type="button"
                          onClick={() => mitarbeiterLoeschen(selected.id)}
                          className="rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-3 font-bold text-red-200 transition hover:-translate-y-1 hover:bg-red-500/15"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroKpi({ label, value, tone }: { label: string; value: string | number; tone?: "green" | "sky" }) {
  const color = tone === "green" ? "text-green-300" : tone === "sky" ? "text-sky-100" : "text-white";
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
      <div className={`break-words text-2xl font-black ${color}`}>{value}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{label}</div>
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string | number; tone?: "green" | "sky" }) {
  const color = tone === "green" ? "text-green-300" : tone === "sky" ? "text-sky-100" : "text-white";
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-white/40">{label}</div>
      <div className={`mt-4 break-words text-4xl font-black leading-tight ${color}`}>{value}</div>
    </div>
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
    <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
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
      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-sky-300/40 focus:bg-black/40 focus:ring-4 focus:ring-sky-300/10 disabled:opacity-50"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40 focus:ring-4 focus:ring-sky-300/10"
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
  return <div className="p-6 text-sm font-bold text-white/55">{text}</div>;
}
