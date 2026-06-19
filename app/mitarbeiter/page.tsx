"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

export default function MitarbeiterPage() {
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [seiteGeprueft, setSeiteGeprueft] = useState(false);

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

  const [loading, setLoading] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null);
  const [suche, setSuche] = useState("");
  const [formularOffen, setFormularOffen] = useState(false);
  const [teamOffen, setTeamOffen] = useState(true);

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
    const erlaubt = await pruefeAdmin();
    if (!erlaubt) return;

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

  useEffect(() => {
    setUrlaubstage(berechneUrlaubstage(eintrittsdatum, ferienwochen));
  }, [eintrittsdatum, ferienwochen]);

  function istInProbezeit(probezeit_bis: string | null) {
    if (!probezeit_bis) return false;
    const heute = new Date();
    const ende = new Date(probezeit_bis);
    return ende >= heute;
  }

  function formularLeeren() {
    setBearbeitenId(null);
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
    if (!isAdmin) {
      setMeldung("Keine Berechtigung.");
      return;
    }

    setMeldung("");

    if (!name.trim()) {
      setMeldung("Bitte Namen eingeben.");
      return;
    }

    setLoading(true);

    const daten = {
      name,
      rolle,
      wochenstunden: Number(wochenstunden),
      ferienwochen: Number(ferienwochen || 0),
      urlaubstage: Number(urlaubstage || 0),
      ueberstunden_start: Number(ueberstundenStart || 0),
      eintrittsdatum: eintrittsdatum || null,
      probezeit_bis: probezeitBis || null,
      austrittsdatum: austrittsdatum || null,
      vertragsart,
    };

    if (!bearbeitenId) {
      setLoading(false);
      setMeldung("Bitte zuerst einen Mitarbeiter aus der Teamübersicht zum Bearbeiten auswählen. Neue Mitarbeiter werden im Chef Dashboard erstellt.");
      return;
    }

    const { error } = await supabase
      .from("mitarbeiter")
      .update(daten)
      .eq("id", bearbeitenId);

    if (error) {
      setLoading(false);
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setMeldung("Mitarbeiter aktualisiert.");

    formularLeeren();
    await ladeMitarbeiter();
    setLoading(false);
  }

  async function mitarbeiterLoeschen(id: number) {
    if (!isAdmin) {
      setMeldung("Keine Berechtigung.");
      return;
    }

    const bestaetigen = confirm("Mitarbeiter wirklich löschen?");
    if (!bestaetigen) return;

    const { error } = await supabase.from("mitarbeiter").delete().eq("id", id);

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
    setFerienwochen(String(person.ferienwochen || 4));
    setUrlaubstage(String(person.urlaubstage || ""));
    setUeberstundenStart(String(person.ueberstunden_start || 0));
    setEintrittsdatum(person.eintrittsdatum || "");
    setProbezeitBis(person.probezeit_bis || "");
    setAustrittsdatum(person.austrittsdatum || "");
    setVertragsart(person.vertragsart || "Unbefristet");
    setFormularOffen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function rollenFarbe(rolle: string) {
    if (rolle === "Admin") return "border-slate-200/30 bg-slate-200/10 text-slate-100";
    if (rolle === "Lehrling") return "border-sky-300/30 bg-sky-300/10 text-sky-200";
    if (rolle === "Temporär") return "border-violet-300/30 bg-violet-300/10 text-violet-200";
    if (rolle === "Aushilfe") return "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-200";
    return "border-green-400/30 bg-green-500/10 text-green-300";
  }

  const admins = mitarbeiter.filter((p) => p.rolle === "Admin").length;
  const aktive = mitarbeiter.filter((p) => !p.austrittsdatum).length;
  const probezeit = mitarbeiter.filter((p) => istInProbezeit(p.probezeit_bis)).length;

  const gefilterteMitarbeiter = mitarbeiter.filter((person) => {
    const suchText = suche.toLowerCase();

    return (
      person.name?.toLowerCase().includes(suchText) ||
      person.rolle?.toLowerCase().includes(suchText) ||
      person.vertragsart?.toLowerCase().includes(suchText)
    );
  });

  if (!seiteGeprueft) {
    return (
      <main className="text-slate-100">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 font-bold text-white shadow-2xl shadow-black/30">
          Berechtigung wird geprüft...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8 text-slate-100">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-7 shadow-2xl shadow-black/30 lg:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.34]">
          <div
            className="h-full w-full bg-cover bg-[center_20%]"
            style={{
              backgroundImage: "url('/berg.png')",
              filter: "brightness(1.55) contrast(1.05)",
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
          <div>
            <div className="inline-flex rounded-full border border-slate-400/25 bg-slate-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-slate-200">
              ODZ SILVER · Personal
            </div>

            <h1 className="mt-5 text-5xl font-black tracking-tight text-white lg:text-7xl">
              Mitarbeiter
            </h1>

            <p className="mt-4 max-w-2xl text-lg font-medium text-white/65">
              Team, Rollen, Verträge, Ferien und Zugänge zentral verwalten.
            </p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
              <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
              <span className="text-sm font-black uppercase tracking-widest text-white/70">
                {aktive} aktive Mitarbeiter
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-black/25 p-4 text-center backdrop-blur-xl">
            <HeroMini label="Team" value={mitarbeiter.length} />
            <HeroMini label="Aktiv" value={aktive} green />
            <HeroMini label="Probezeit" value={probezeit} blue />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ActionCard href="#team" label="Übersicht" title="📋 Team" onClick={() => setTeamOffen(true)} />
        <ActionCard href="#team" label="Entwicklung" title="🎯 Stärken vorbereitet" onClick={() => setTeamOffen(true)} />
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Teammitglieder" value={mitarbeiter.length} />
        <KpiCard label="Aktiv" value={aktive} green />
        <KpiCard label="Probezeit" value={probezeit} blue />
        <KpiCard label="Admins" value={admins} />
      </section>

      {meldung && (
        <div className="rounded-xl border border-slate-200/20 bg-slate-200/10 p-4 text-sm font-bold text-slate-100">
          {meldung}
        </div>
      )}

      <DropdownPanel
        id="formular"
        title="Mitarbeiter bearbeiten"
        eyebrow="Stammdaten · Vertrag · Ferien"
        description="Bestehende Mitarbeiter aus der Teamübersicht auswählen, Rolle ändern, Vertrag pflegen und speichern."
        open={formularOffen}
        onToggle={() => setFormularOffen(!formularOffen)}
      >
        {bearbeitenId && (
          <div className="mb-5 rounded-xl border border-sky-300/25 bg-sky-300/10 px-4 py-3 text-sm font-black text-sky-200">
            Bearbeitungsmodus aktiv
          </div>
        )}

        {!bearbeitenId && (
          <div className="mb-5 rounded-xl border border-sky-300/20 bg-sky-300/5 px-4 py-3 text-sm font-bold text-sky-100">
            Neue Mitarbeiter werden zentral im Chef Dashboard erstellt. Wähle hier einen Mitarbeiter aus der Teamübersicht aus, um Rolle, Vertrag, Wochenstunden, Ferien oder Austritt zu ändern.
          </div>
        )}

        {bearbeitenId && (
          <>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="dark-input" />
          </Field>

          <Field label="Rolle">
            <select value={rolle} onChange={(e) => setRolle(e.target.value)} className="dark-input">
              <option value="Mitarbeiter">Mitarbeiter</option>
              <option value="Admin">Admin</option>
              <option value="Lehrling">Lehrling</option>
              <option value="Temporär">Temporär</option>
              <option value="Aushilfe">Aushilfe</option>
            </select>
          </Field>

          <Field label="Vertragsart">
            <select value={vertragsart} onChange={(e) => setVertragsart(e.target.value)} className="dark-input">
              <option value="Unbefristet">Unbefristet</option>
              <option value="Befristet">Befristet</option>
              <option value="Temporär">Temporär</option>
              <option value="Lehre">Lehre</option>
              <option value="Aushilfe">Aushilfe</option>
            </select>
          </Field>

          <Field label="Wochenstunden">
            <input type="number" step="0.5" value={wochenstunden} onChange={(e) => setWochenstunden(e.target.value)} placeholder="42.5" className="dark-input" />
          </Field>

          <Field label="Ferienwochen">
            <input type="number" step="0.5" value={ferienwochen} onChange={(e) => setFerienwochen(e.target.value)} placeholder="4" className="dark-input" />
          </Field>

          <Field label="Urlaubstage automatisch">
            <input type="number" step="0.01" value={urlaubstage} readOnly className="dark-input opacity-70" />
          </Field>

          <Field label="Überstunden Start">
            <input type="number" step="0.5" value={ueberstundenStart} onChange={(e) => setUeberstundenStart(e.target.value)} placeholder="0" className="dark-input" />
          </Field>

          <Field label="Eintrittsdatum">
            <input type="date" value={eintrittsdatum} onChange={(e) => setEintrittsdatum(e.target.value)} className="dark-input" />
          </Field>

          <Field label="Probezeit bis">
            <input type="date" value={probezeitBis} onChange={(e) => setProbezeitBis(e.target.value)} className="dark-input" />
          </Field>

          <Field label="Austrittsdatum">
            <input type="date" value={austrittsdatum} onChange={(e) => setAustrittsdatum(e.target.value)} className="dark-input" />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={mitarbeiterSpeichern}
            disabled={loading}
            className="rounded-2xl border border-slate-200/30 bg-slate-200/10 px-5 py-3 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/10 hover:shadow-sky-300/10 disabled:opacity-50"
          >
            {loading ? "Speichern..." : "Änderung speichern"}
          </button>

          <button
            type="button"
            onClick={formularLeeren}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/5 hover:text-sky-200"
          >
            Abbrechen
          </button>
        </div>
          </>
        )}
      </DropdownPanel>

      <DropdownPanel
        id="team"
        title="Teamübersicht"
        eyebrow="Suche · Verträge · Rollen"
        description="Alle Mitarbeiter mit Vertrags-, Ferien- und Rolleninformationen im ODZ Premium Look."
        open={teamOffen}
        onToggle={() => setTeamOffen(!teamOffen)}
      >
        <div className="mb-6">
          <input
            type="text"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="🔍 Mitarbeiter suchen..."
            className="dark-input"
          />
        </div>

        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="text-sm text-white/50">
            {gefilterteMitarbeiter.length} angezeigt · {admins} Admin · {mitarbeiter.length} Gesamt
          </div>

          <div className="rounded-full border border-slate-300/20 bg-slate-300/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-200">
            Stärken vorbereitet
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {gefilterteMitarbeiter.map((person) => (
            <div key={person.id} className="rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-black text-white">{person.name}</div>
                  <div className="mt-2 text-sm text-white/60">{person.vertragsart || "-"}</div>
                </div>

                <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${rollenFarbe(person.rolle)}`}>
                  {person.rolle}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-white/70">
                <Info label="Eintritt" value={person.eintrittsdatum || "-"} />
                <Info label="Probezeit" value={person.probezeit_bis || "-"} />
                <Info label="Woche" value={`${person.wochenstunden || 0}h`} />
                <Info label="Ferien" value={`${person.ferienwochen || 4} Wochen`} />
                <Info label="Urlaub" value={person.urlaubstage || 0} />
                <Info label="Ü-Start" value={`${Number(person.ueberstunden_start || 0).toFixed(2)}h`} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${istInProbezeit(person.probezeit_bis) ? "border-sky-300/30 bg-sky-300/10 text-sky-200" : "border-green-400/30 bg-green-500/10 text-green-300"}`}>
                  {istInProbezeit(person.probezeit_bis) ? "Probezeit" : person.status || "Aktiv"}
                </span>

                <span className="inline-flex rounded-full border border-slate-400/25 bg-slate-300/10 px-3 py-1 text-sm font-bold text-slate-200">
                  Stärke: {person.rolle === "Admin" ? "Führung" : person.rolle === "Lehrling" ? "Lernphase" : "Team"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => mitarbeiterBearbeiten(person)} className="rounded-xl border border-white/10 bg-white/[0.06] p-3 font-bold text-white transition hover:border-sky-300/25 hover:bg-sky-300/10">
                  Bearbeiten
                </button>

                <button onClick={() => mitarbeiterLoeschen(person.id)} className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-bold text-red-300 transition hover:bg-red-500/15">
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <div className="overflow-x-auto">
            <div className="min-w-[1500px]">
              <div className="grid grid-cols-11 border-b border-white/10 bg-black/20 px-5 py-4 text-sm font-bold uppercase tracking-wide text-white/50">
                <div>Name</div>
                <div>Rolle</div>
                <div>Vertrag</div>
                <div>Eintritt</div>
                <div>Probezeit</div>
                <div>Woche</div>
                <div>Ferien</div>
                <div>Urlaub</div>
                <div>Ü-Start</div>
                <div>Status</div>
                <div>Aktion</div>
              </div>

              {gefilterteMitarbeiter.map((person) => (
                <div key={person.id} className="grid grid-cols-11 items-center border-b border-white/10 px-5 py-4 text-white/80 transition hover:bg-sky-300/5 hover:text-white">
                  <div className="font-black text-white">{person.name}</div>

                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${rollenFarbe(person.rolle)}`}>
                      {person.rolle}
                    </span>
                  </div>

                  <div>{person.vertragsart || "-"}</div>
                  <div>{person.eintrittsdatum || "-"}</div>
                  <div>{person.probezeit_bis || "-"}</div>
                  <div>{person.wochenstunden}h</div>
                  <div>{person.ferienwochen || 4}</div>
                  <div className="font-black text-slate-100">{person.urlaubstage}</div>
                  <div>{Number(person.ueberstunden_start || 0).toFixed(2)}h</div>

                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${istInProbezeit(person.probezeit_bis) ? "border-sky-300/30 bg-sky-300/10 text-sky-200" : "border-green-400/30 bg-green-500/10 text-green-300"}`}>
                      {istInProbezeit(person.probezeit_bis) ? "Probezeit" : person.status || "Aktiv"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => mitarbeiterBearbeiten(person)} className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 font-bold text-white transition hover:border-sky-300/25 hover:bg-sky-300/10">
                      Bearbeiten
                    </button>

                    <button onClick={() => mitarbeiterLoeschen(person.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 font-bold text-red-300 transition hover:bg-red-500/15">
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
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

function ActionCard({ href, label, title, onClick }: { href: string; label: string; title: string; onClick?: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
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
  const color = blue ? "text-sky-200" : green ? "text-green-400" : "text-slate-100";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
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

function KpiCard({
  label,
  value,
  green,
  blue,
}: {
  label: string;
  value: string | number;
  green?: boolean;
  blue?: boolean;
}) {
  const color = green ? "text-green-400" : blue ? "text-sky-200" : "text-slate-100";

  return (
    <div className="group overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 shadow-2xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-2xl hover:shadow-sky-300/10">
      <div className={`text-5xl font-black ${color}`}>{value}</div>

      <div className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>

      <div className="mt-5 h-1 w-16 rounded-full bg-slate-200/40 transition-all duration-300 group-hover:w-24 group-hover:bg-sky-200/70" />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3 transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div className="text-xs text-white/45">{label}</div>
      <div className="mt-1 font-bold text-white">{value}</div>
    </div>
  );
}
