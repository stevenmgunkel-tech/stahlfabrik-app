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
  zeiterfassung_ab?: string | null;
  pensum_prozent?: number | string | null;
  arbeitstage_pro_woche?: number | string | null;
  freier_wochentag?: string | null;
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

function formatWochenstunden(value: number | string | null | undefined) {
  const zahl = Number(value || 0);

  if (!zahl) return "-";

  return `${zahl.toLocaleString("de-CH", {
    minimumFractionDigits: Number.isInteger(zahl) ? 0 : 1,
    maximumFractionDigits: 2,
  })} Std.`;
}

function formatDatum(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("de-CH");
}

function berechneUrlaubstage(
  eintritt: string,
  wochen: string,
  arbeitstageProWoche: string | number | null | undefined,
) {
  const tageProWoche = Number(arbeitstageProWoche || 5) || 5;
  const ferienTageProJahr = Number(wochen || 0) * tageProWoche;
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

function formatPensum(person: Mitarbeiter) {
  const pensum = Number(person.pensum_prozent || 0);

  if (pensum > 0) return `${pensum}%`;

  const wochenstunden = Number(person.wochenstunden || 0);
  if (wochenstunden === 34) return "80%";
  if (wochenstunden === 42.5) return "100%";

  return "Manuell";
}

function formatArbeitstage(person: Mitarbeiter) {
  const tage = Number(person.arbeitstage_pro_woche || 0);

  if (tage > 0) return tage;

  const pensum = Number(person.pensum_prozent || 0);
  if (pensum === 80) return 4;

  return 5;
}

function formatTagessoll(person: Mitarbeiter) {
  const tage = formatArbeitstage(person);
  const wochenstunden = Number(person.wochenstunden || 0);

  if (!tage || !wochenstunden) return "-";

  return formatStunden(wochenstunden / tage);
}

function formatFreierWochentag(value: string | null | undefined) {
  const wert = String(value || "").trim();
  if (!wert) return "-";

  const lower = wert.toLowerCase();
  const mapping: Record<string, string> = {
    "1": "Montag",
    mo: "Montag",
    montag: "Montag",
    "2": "Dienstag",
    di: "Dienstag",
    dienstag: "Dienstag",
    "3": "Mittwoch",
    mi: "Mittwoch",
    mittwoch: "Mittwoch",
    "4": "Donnerstag",
    do: "Donnerstag",
    donnerstag: "Donnerstag",
    "5": "Freitag",
    fr: "Freitag",
    freitag: "Freitag",
  };

  return mapping[lower] || wert;
}

function arbeitsmodellAusPerson(person: Mitarbeiter) {
  const pensum = Number(person.pensum_prozent || 0);
  const wochenstunden = Number(person.wochenstunden || 0);
  const arbeitstage = Number(person.arbeitstage_pro_woche || 0);

  if (pensum === 80 || (wochenstunden === 34 && arbeitstage === 4)) return "80";
  if (
    pensum === 100 ||
    (wochenstunden === 42.5 && (!arbeitstage || arbeitstage === 5))
  )
    return "100";

  return "Manuell";
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
  const [arbeitsmodell, setArbeitsmodell] = useState("100");
  const [pensumProzent, setPensumProzent] = useState("100");
  const [arbeitstageProWoche, setArbeitstageProWoche] = useState("5");
  const [freierWochentag, setFreierWochentag] = useState("");
  const [zeiterfassungAb, setZeiterfassungAb] = useState("");

  useEffect(() => {
    ladeMitarbeiter(true);
  }, []);

  useEffect(() => {
    setUrlaubstage(
      berechneUrlaubstage(eintrittsdatum, ferienwochen, arbeitstageProWoche),
    );
  }, [eintrittsdatum, ferienwochen, arbeitstageProWoche]);

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
  const probezeit = mitarbeiter.filter((p) =>
    istInProbezeit(p.probezeit_bis),
  ).length;
  const gesamtWochenstunden = mitarbeiter.reduce(
    (sum, person) => sum + Number(person.wochenstunden || 0),
    0,
  );

  const achtzigProzent = mitarbeiter.filter(
    (person) => Number(person.pensum_prozent || 0) === 80,
  ).length;

  function arbeitsmodellAendern(value: string) {
    setArbeitsmodell(value);

    if (value === "100") {
      setPensumProzent("100");
      setWochenstunden("42.5");
      setArbeitstageProWoche("5");
      setFreierWochentag("");
      return;
    }

    if (value === "80") {
      setPensumProzent("80");
      setWochenstunden("34");
      setArbeitstageProWoche("4");
      setFreierWochentag((aktuell) => aktuell || "Freitag");
      return;
    }

    setPensumProzent("");
  }

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
    const modell = arbeitsmodellAusPerson(person);
    setArbeitsmodell(modell);
    setPensumProzent(
      String(
        person.pensum_prozent ||
          (modell === "80" ? 80 : modell === "100" ? 100 : ""),
      ),
    );
    setArbeitstageProWoche(
      String(person.arbeitstage_pro_woche || (modell === "80" ? 4 : 5)),
    );
    setFreierWochentag(
      person.freier_wochentag || (modell === "80" ? "Freitag" : ""),
    );
    setZeiterfassungAb(person.zeiterfassung_ab || "");
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
    setArbeitsmodell("100");
    setPensumProzent("100");
    setArbeitstageProWoche("5");
    setFreierWochentag("");
    setZeiterfassungAb("");
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
      zeiterfassung_ab: zeiterfassungAb || null,
      pensum_prozent: Number(pensumProzent || 0) || null,
      arbeitstage_pro_woche: Number(arbeitstageProWoche || 0) || null,
      freier_wochentag: freierWochentag || null,
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
    <main className="mitarbeiter-v12 space-y-6 text-slate-950">
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
              ODZ V1.2 · Personal
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Mitarbeiter
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-950/65 sm:text-base">
              Teamübersicht, Rollen, Verträge, Ferien, Probezeit und Stärken in
              einer sauberen Personal-Zentrale.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
              <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
              <span className="text-xs font-black uppercase tracking-widest text-white/70">
                Personalverwaltung
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-4">
            <HeroMini
              label="Team"
              value={
                pageLoading ? "—" : String(mitarbeiter.length).padStart(2, "0")
              }
            />
            <HeroMini
              label="Aktiv"
              value={pageLoading ? "—" : String(aktive).padStart(2, "0")}
              green={!pageLoading && aktive > 0}
            />
            <HeroMini
              label="80%"
              value={
                pageLoading ? "—" : String(achtzigProzent).padStart(2, "0")
              }
              blue={!pageLoading && achtzigProzent > 0}
            />
            <HeroMini
              label="Admin"
              value={pageLoading ? "—" : String(admins).padStart(2, "0")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/60 bg-white/35 p-2 shadow-[0_14px_44px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <ActionCard
            href="#team"
            label="Übersicht"
            title="👥 Team"
            onClick={() => setTeamOffen(true)}
          />
          <ActionCard
            href="#details"
            label="Details"
            title="📋 Personalakte"
            onClick={() => setDetailsOffen(true)}
          />
          <ActionCard
            href="#bearbeiten"
            label="Verwalten"
            title="✎ Bearbeiten"
            onClick={() => selected && formularFuellen(selected)}
          />
          <ActionCard
            href="#staerken"
            label="Entwicklung"
            title="🎯 Stärken"
            onClick={() => setDetailsOffen(true)}
          />
        </div>
      </section>

      {meldung && (
        <div className="rounded-xl border border-orange-200/40 bg-orange-100/60 p-4 text-sm font-bold text-slate-950">
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
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/60 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
            <div className="border-b border-white/70 p-5 sm:p-6">
              <h2 className="text-xl font-black text-slate-950">Team</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Mitarbeiter auswählen und Details bearbeiten.
              </p>

              <input
                type="text"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Mitarbeiter suchen..."
                className="warm-input mt-5"
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
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition-colors hover:border-orange-300/40 hover:bg-orange-300/5 ${
                        aktiv
                          ? "border-orange-300/50 bg-orange-100/60 shadow-lg shadow-orange-900/10"
                          : "border-white/70 bg-white/55"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-black text-slate-950">
                            {person.name || "Ohne Name"}
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-500">
                            {person.vertragsart || "Vertrag offen"}
                          </div>
                        </div>

                        <RoleBadge rolle={person.rolle || "Mitarbeiter"} />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <MiniStat label="Pensum" value={formatPensum(person)} />
                        <MiniStat
                          label="Woche"
                          value={formatWochenstunden(person.wochenstunden)}
                        />
                        <MiniStat
                          label="Frei"
                          value={formatFreierWochentag(person.freier_wochentag)}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {pageLoading ? (
              <div className="min-h-[420px] rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-sm font-bold text-slate-500 shadow-xl shadow-black/20 backdrop-blur-xl">
                Personalakte wird vorbereitet.
              </div>
            ) : !selected ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-slate-500 shadow-xl shadow-black/20 backdrop-blur-xl">
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
                        <h2 className="text-3xl font-black text-slate-950">
                          {selected.name}
                        </h2>
                        <RoleBadge rolle={selected.rolle || "Mitarbeiter"} />
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-500">
                        {selected.vertragsart || "Vertrag offen"} · Eintritt{" "}
                        {formatDatum(selected.eintrittsdatum)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => formularFuellen(selected)}
                        className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-4 py-3 text-sm font-black text-orange-800 transition-colors hover:border-orange-300/50 hover:bg-orange-100/80"
                      >
                        Bearbeiten
                      </button>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InfoCard
                        label="Woche"
                        value={formatWochenstunden(selected.wochenstunden)}
                      />
                      <InfoCard
                        label="Ferienwochen"
                        value={`${selected.ferienwochen || 4} Wochen`}
                      />
                      <InfoCard
                        label="Urlaubstage"
                        value={selected.urlaubstage || 0}
                      />
                      <InfoCard
                        label="Ü-Start"
                        value={formatStunden(selected.ueberstunden_start)}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InfoCard
                        label="Eintritt"
                        value={formatDatum(selected.eintrittsdatum)}
                      />
                      <InfoCard
                        label="Zeiterfassung ab"
                        value={formatDatum(selected.zeiterfassung_ab)}
                      />
                      <InfoCard
                        label="Probezeit bis"
                        value={formatDatum(selected.probezeit_bis)}
                      />
                      <InfoCard
                        label="Austritt"
                        value={formatDatum(selected.austrittsdatum)}
                        tone={selected.austrittsdatum ? "red" : undefined}
                      />
                    </div>

                    <div
                      id="staerken"
                      className="rounded-[1.5rem] border border-white/70 bg-white/55 p-5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="text-xl font-black text-slate-950">
                            Mitarbeiter-Stärken
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Vorbereitet für die spätere Auswertung.
                          </p>
                        </div>
                        <span className="rounded-full border border-orange-200/50 bg-orange-100/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-800">
                          Bald aktiv
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <Strength
                          label="Metallbauer"
                          value={selected.rolle === "Lehrling" ? 35 : 80}
                        />
                        <Strength
                          label="Werkstatt"
                          value={selected.rolle === "Admin" ? 55 : 85}
                        />
                        <Strength
                          label="Montage"
                          value={selected.rolle === "Admin" ? 45 : 75}
                        />
                        <Strength
                          label="Planung / AVOR"
                          value={selected.rolle === "Admin" ? 90 : 40}
                        />
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
                        <Field label="Name">
                          <Input value={name} onChange={setName} />
                        </Field>
                        <Field label="Rolle">
                          <Select
                            value={rolle}
                            onChange={setRolle}
                            options={[
                              "Mitarbeiter",
                              "Admin",
                              "Lehrling",
                              "Temporär",
                              "Aushilfe",
                            ]}
                          />
                        </Field>
                        <Field label="Vertragsart">
                          <Select
                            value={vertragsart}
                            onChange={setVertragsart}
                            options={[
                              "Unbefristet",
                              "Befristet",
                              "Temporär",
                              "Lehre",
                              "Aushilfe",
                            ]}
                          />
                        </Field>

                        <Field label="Arbeitsmodell">
                          <Select
                            value={arbeitsmodell}
                            onChange={arbeitsmodellAendern}
                            options={["100", "80", "Manuell"]}
                          />
                        </Field>
                        <Field label="Pensum %">
                          <Input
                            type="number"
                            step="1"
                            value={pensumProzent}
                            onChange={setPensumProzent}
                            readOnly={arbeitsmodell !== "Manuell"}
                          />
                        </Field>
                        <Field label="Wochenstunden">
                          <Input
                            type="number"
                            step="0.5"
                            value={wochenstunden}
                            onChange={setWochenstunden}
                            readOnly={arbeitsmodell !== "Manuell"}
                          />
                        </Field>
                        <Field label="Arbeitstage/Woche">
                          <Input
                            type="number"
                            step="1"
                            value={arbeitstageProWoche}
                            onChange={setArbeitstageProWoche}
                            readOnly={arbeitsmodell !== "Manuell"}
                          />
                        </Field>
                        <Field label="Freier Wochentag">
                          <Select
                            value={freierWochentag}
                            onChange={setFreierWochentag}
                            options={[
                              "",
                              "Montag",
                              "Dienstag",
                              "Mittwoch",
                              "Donnerstag",
                              "Freitag",
                            ]}
                          />
                        </Field>
                        <Field label="Zeiterfassung ab">
                          <Input
                            type="date"
                            value={zeiterfassungAb}
                            onChange={setZeiterfassungAb}
                          />
                        </Field>

                        <Field label="Ferienwochen">
                          <Input
                            type="number"
                            step="0.5"
                            value={ferienwochen}
                            onChange={setFerienwochen}
                          />
                        </Field>
                        <Field label="Urlaubstage automatisch">
                          <Input
                            type="number"
                            step="0.01"
                            value={urlaubstage}
                            onChange={setUrlaubstage}
                            readOnly
                          />
                        </Field>
                        <Field label="Überstunden Start">
                          <Input
                            type="number"
                            step="0.5"
                            value={ueberstundenStart}
                            onChange={setUeberstundenStart}
                          />
                        </Field>
                        <Field label="Eintrittsdatum">
                          <Input
                            type="date"
                            value={eintrittsdatum}
                            onChange={setEintrittsdatum}
                          />
                        </Field>
                        <Field label="Probezeit bis">
                          <Input
                            type="date"
                            value={probezeitBis}
                            onChange={setProbezeitBis}
                          />
                        </Field>
                        <Field label="Austrittsdatum">
                          <Input
                            type="date"
                            value={austrittsdatum}
                            onChange={setAustrittsdatum}
                          />
                        </Field>
                      </div>

                      <div className="rounded-2xl border border-orange-200/50 bg-orange-100/50 p-4 text-sm font-bold text-orange-800">
                        100% = 42.5 h / 5 Tage · 80% = 34 h / 4 Tage à 8.5 h.
                        Der freie Wochentag zählt später nicht als Solltag.
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={mitarbeiterSpeichern}
                          disabled={saving}
                          className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-5 py-3 font-black text-orange-800 transition-colors hover:border-orange-300/50 hover:bg-orange-100/80 disabled:opacity-50"
                        >
                          {saving ? "Speichern..." : "Änderung speichern"}
                        </button>

                        <button
                          type="button"
                          onClick={formularLeeren}
                          className="rounded-2xl border border-white/70 bg-white/55 px-5 py-3 font-bold text-slate-950 transition-colors hover:border-orange-300/40 hover:bg-orange-300/5"
                        >
                          Abbrechen
                        </button>

                        <button
                          type="button"
                          onClick={() => mitarbeiterLoeschen(selected.id)}
                          className="rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-3 font-bold text-red-800 transition-colors hover:bg-red-500/15"
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

        .warm-input option {
          background: #ffffff;
          color: #020617;
        }

        .warm-input:read-only {
          background: rgba(255, 255, 255, 0.62);
          color: rgba(15, 23, 42, 0.72);
        }

        .warm-input::-webkit-datetime-edit,
        .warm-input::-webkit-datetime-edit-fields-wrapper,
        .warm-input::-webkit-datetime-edit-text,
        .warm-input::-webkit-datetime-edit-month-field,
        .warm-input::-webkit-datetime-edit-day-field,
        .warm-input::-webkit-datetime-edit-year-field,
        .warm-input::-webkit-datetime-edit-hour-field,
        .warm-input::-webkit-datetime-edit-minute-field,
        .warm-input::-webkit-datetime-edit-ampm-field {
          color: #020617;
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

        .mitarbeiter-v12 .v12-hero .text-slate-950,
        .mitarbeiter-v12 .v12-hero .text-slate-600,
        .mitarbeiter-v12 .v12-hero .text-slate-500 {
          color: rgba(255, 255, 255, 0.72) !important;
        }

        .mitarbeiter-v12 .v12-hero h1 {
          color: #ffffff !important;
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-center transition hover:border-orange-200/40 hover:bg-orange-300/10">
      <div
        className={`text-xl font-black leading-tight md:text-2xl ${
          red
            ? "text-red-300"
            : green
              ? "text-emerald-300"
              : blue
                ? "text-orange-200"
                : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/50">
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
      className="group block w-full rounded-2xl border border-white/70 bg-white/55 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-lg hover:shadow-orange-900/10"
    >
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-base font-black text-slate-950">{title}</div>
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
    <section
      id={id}
      className="overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/[0.08] to-white/[0.025] shadow-2xl shadow-slate-900/10"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col justify-between gap-4 p-6 text-left transition hover:bg-orange-300/5 lg:flex-row lg:items-center lg:p-7"
      >
        <div>
          <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-800">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-slate-500">{description}</p>
        </div>

        <div className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-5 py-3 text-sm font-black text-slate-950 transition hover:border-orange-300/40 hover:bg-orange-300/10 hover:text-orange-700">
          {open ? "Schließen ▲" : "Öffnen ▼"}
        </div>
      </button>

      {open && (
        <div className="space-y-6 border-t border-white/70 p-6 lg:p-7">
          {children}
        </div>
      )}
    </section>
  );
}


function RoleBadge({ rolle }: { rolle: string }) {
  const style =
    rolle === "Admin"
      ? "border-slate-300/70 bg-slate-100/80 text-slate-800"
      : rolle === "Lehrling"
        ? "border-orange-300/50 bg-orange-100/70 text-orange-800"
        : rolle === "Temporär"
          ? "border-violet-300/50 bg-violet-100/70 text-violet-800"
          : rolle === "Aushilfe"
            ? "border-fuchsia-300/50 bg-fuchsia-100/70 text-fuchsia-800"
            : "border-emerald-300/50 bg-emerald-100/70 text-emerald-800";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-black ${style}`}
    >
      {rolle}
    </span>
  );
}


function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-black text-orange-800">
        {value}
      </div>
    </div>
  );
}


function InfoCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "red";
}) {
  const color = tone === "red" ? "text-red-800" : "text-orange-800";

  return (
    <div className="min-w-0 rounded-[1.5rem] border border-white/70 bg-white/55 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80">
      <div className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className={`mt-3 truncate text-2xl font-black ${color}`}>
        {value}
      </div>
    </div>
  );
}


function Strength({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-black text-slate-950">{label}</div>
        <div className="text-sm font-black text-orange-800">{value}%</div>
      </div>
      <div className="mt-3 overflow-hidden rounded-full bg-stone-900/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-orange-300 to-emerald-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}


function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  step,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      step={step}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className="warm-input"
    />
  );
}


function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="warm-input"
    >
      {options.map((option) => (
        <option
          key={option || "leer"}
          value={option}
          className="bg-white text-slate-950"
        >
          {option || "Kein freier Tag"}
        </option>
      ))}
    </select>
  );
}


function EmptyState({ text }: { text: string }) {
  return (
    <div className="min-h-[360px] p-6 text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}
