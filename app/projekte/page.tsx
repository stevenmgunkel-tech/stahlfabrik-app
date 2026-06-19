"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

export default function ProjektePage() {
  const [projekte, setProjekte] = useState<any[]>([]);
  const [kunde, setKunde] = useState("");
  const [kommission, setKommission] = useState("");
  const [projektname, setProjektname] = useState("");
  const [status, setStatus] = useState("Aktiv");
  const [ausgewaehlteBereiche, setAusgewaehlteBereiche] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [seiteGeprueft, setSeiteGeprueft] = useState(false);
  const [uebersichtOffen, setUebersichtOffen] = useState(true);
  const [bearbeitungOffen, setBearbeitungOffen] = useState(false);
  const [suche, setSuche] = useState("");

  const alleBereiche = [
    "Werkstatt",
    "Montage",
    "Logistik",
    "Planung",
    "Lieferung",
    "Aufräumen",
    "Sonstiges",
  ];

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
      .order("kunde", { ascending: true })
      .order("kommission", { ascending: true });

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setProjekte((data || []).filter((projekt) => projekt.status !== "Abgeschlossen"));
  }

  useEffect(() => {
    ladeProjekte();
  }, []);

  function anzeigeBauen(kundeWert: string, kommissionWert: string) {
    const saubererKunde = kundeWert.trim();
    const saubereKommission = kommissionWert.trim();

    if (!saubererKunde && !saubereKommission) return "";
    if (!saubererKunde) return saubereKommission;
    if (!saubereKommission) return saubererKunde;
    if (saubererKunde === "Intern") return saubereKommission;

    return `${saubererKunde} - ${saubereKommission}`;
  }

  function bereichUmschalten(bereich: string) {
    setAusgewaehlteBereiche((aktuell) =>
      aktuell.includes(bereich)
        ? aktuell.filter((item) => item !== bereich)
        : [...aktuell, bereich]
    );
  }

  async function projektBereicheSpeichern(projektId: number) {
    const { error: deleteError } = await supabase
      .from("projekt_bereiche")
      .delete()
      .eq("projekt_id", projektId);

    if (deleteError) {
      setMeldung(deleteError.message);
      console.log(deleteError);
      return false;
    }

    if (ausgewaehlteBereiche.length === 0) return true;

    const datensaetze = ausgewaehlteBereiche.map((bereich) => ({
      projekt_id: projektId,
      bereich,
    }));

    const { error: insertError } = await supabase
      .from("projekt_bereiche")
      .insert(datensaetze);

    if (insertError) {
      setMeldung(insertError.message);
      console.log(insertError);
      return false;
    }

    return true;
  }

  async function projektBereicheLaden(projektId: number) {
    const { data, error } = await supabase
      .from("projekt_bereiche")
      .select("bereich")
      .eq("projekt_id", projektId);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      setAusgewaehlteBereiche([]);
      return;
    }

    setAusgewaehlteBereiche((data || []).map((eintrag) => eintrag.bereich));
  }

  async function projektSpeichern() {
    if (!isAdmin) {
      setMeldung("Keine Berechtigung.");
      return;
    }

    setMeldung("");

    if (!bearbeitenId) {
      setMeldung("Bitte zuerst ein bestehendes Projekt aus der Übersicht zum Bearbeiten auswählen. Neue Projekte werden im Chef Dashboard erstellt.");
      return;
    }

    if (!kunde.trim()) {
      setMeldung("Bitte Kunde eingeben.");
      return;
    }

    if (!kommission.trim()) {
      setMeldung("Bitte Kommission eingeben.");
      return;
    }

    if (!projektname.trim()) {
      setMeldung("Bitte Projektname eingeben.");
      return;
    }

    if (ausgewaehlteBereiche.length === 0) {
      setMeldung("Bitte mindestens einen Bereich auswählen.");
      return;
    }

    const name = anzeigeBauen(kunde, kommission);
    setLoading(true);

    const { error } = await supabase
      .from("projekte")
      .update({
        name,
        kunde: kunde.trim(),
        kommission: kommission.trim(),
        projektname: projektname.trim(),
        status,
      })
      .eq("id", bearbeitenId);

    if (error) {
      setLoading(false);
      setMeldung(error.message);
      console.log(error);
      return;
    }

    const bereicheOk = await projektBereicheSpeichern(bearbeitenId);

    if (!bereicheOk) {
      setLoading(false);
      return;
    }

    setMeldung("Projekt aktualisiert.");
    bearbeitungAbbrechen();
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

  async function bearbeitungStarten(projekt: any) {
    setBearbeitenId(projekt.id);
    setKunde(projekt.kunde || "");
    setKommission(projekt.kommission || "");
    setProjektname(projekt.projektname || projekt.name || "");
    setStatus(projekt.status || "Aktiv");
    setBearbeitungOffen(true);
    await projektBereicheLaden(Number(projekt.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bearbeitungAbbrechen() {
    setBearbeitenId(null);
    setKunde("");
    setKommission("");
    setProjektname("");
    setStatus("Aktiv");
    setAusgewaehlteBereiche([]);
  }

  function statusFarbe(status: string) {
    if (status === "Aktiv") return "border-green-400/30 bg-green-500/10 text-green-300";
    if (status === "Pausiert") return "border-sky-300/30 bg-sky-300/10 text-sky-200";
    if (status === "Abgeschlossen") return "border-white/15 bg-white/[0.06] text-white/65";
    return "border-slate-300/30 bg-slate-300/10 text-slate-200";
  }

  const aktiveProjekte = projekte.filter((p) => p.status === "Aktiv").length;
  const pausierteProjekte = projekte.filter((p) => p.status === "Pausiert").length;
  const abgeschlosseneProjekte = projekte.filter((p) => p.status === "Abgeschlossen").length;

  const gefilterteProjekte = projekte.filter((projekt) => {
    const suchText = suche.toLowerCase();

    return (
      projekt.kunde?.toLowerCase().includes(suchText) ||
      projekt.kommission?.toLowerCase().includes(suchText) ||
      projekt.projektname?.toLowerCase().includes(suchText) ||
      projekt.name?.toLowerCase().includes(suchText) ||
      projekt.status?.toLowerCase().includes(suchText)
    );
  });

  if (!seiteGeprueft) {
    return (
      <main className="space-y-6 text-slate-100">
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
              ODZ SILVER · Projekte
            </div>

            <h1 className="mt-5 text-5xl font-black tracking-tight text-white lg:text-7xl">
              Projektübersicht
            </h1>

            <p className="mt-4 max-w-2xl text-lg font-medium text-white/65">
              Projekte werden im Chef Dashboard erstellt. Hier werden bestehende Projekte verwaltet, geprüft und angepasst.
            </p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
              <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
              <span className="text-sm font-black uppercase tracking-widest text-white/70">
                {aktiveProjekte} aktive Projekte
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-black/25 p-4 text-center backdrop-blur-xl">
            <HeroMini label="Aktiv" value={aktiveProjekte} green />
            <HeroMini label="Pausiert" value={pausierteProjekte} blue />
            <HeroMini label="Archiv" value={abgeschlosseneProjekte} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ActionCard href="#uebersicht" label="Übersicht" title="📋 Projekte" onClick={() => setUebersichtOffen(true)} />
        <ActionCard href="#bearbeiten" label="Bearbeiten" title="✏️ Bestehende Projekte" onClick={() => setBearbeitungOffen(true)} />
        <ActionCard href="/projektarchiv" label="Archiv" title="🗄️ Projektarchiv" />
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <KpiCard label="Aktive Projekte" value={aktiveProjekte} green />
        <KpiCard label="Pausiert" value={pausierteProjekte} blue />
        <KpiCard label="Archiv" value={abgeschlosseneProjekte} />
      </section>

      {meldung && (
        <div className="rounded-xl border border-slate-200/20 bg-slate-200/10 p-4 text-sm font-bold text-slate-100">
          {meldung}
        </div>
      )}

      <DropdownPanel
        id="bearbeiten"
        title="Projekt bearbeiten"
        eyebrow="Bestehende Projekte · Status · Bereiche"
        description="Neue Projekte werden im Chef Dashboard erstellt. Hier bearbeitest du bestehende Projektinformationen und erlaubte Bereiche."
        open={bearbeitungOffen}
        onToggle={() => setBearbeitungOffen(!bearbeitungOffen)}
      >
        {bearbeitenId ? (
          <>
            <div className="mb-5 rounded-xl border border-sky-300/25 bg-sky-300/10 px-4 py-3 text-sm font-black text-sky-200">
              Bearbeitungsmodus aktiv · {anzeigeBauen(kunde, kommission) || projektname || "Projekt"}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="Kunde">
                <input type="text" placeholder="z.B. Firma" value={kunde} onChange={(e) => setKunde(e.target.value)} className="dark-input" />
              </Field>

              <Field label="Kommission">
                <input type="text" placeholder="z.B. Baustelle" value={kommission} onChange={(e) => setKommission(e.target.value)} className="dark-input" />
              </Field>

              <Field label="Projektname">
                <input type="text" placeholder="z.B. Zaunanlage" value={projektname} onChange={(e) => setProjektname(e.target.value)} className="dark-input" />
              </Field>

              <Field label="Status">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="dark-input">
                  <option value="Aktiv">Aktiv</option>
                  <option value="Pausiert">Pausiert</option>
                  <option value="Abgeschlossen">Abgeschlossen</option>
                </select>
              </Field>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="mb-4">
                <h3 className="text-lg font-black text-white">Erlaubte Bereiche</h3>
                <p className="mt-1 text-sm text-white/50">
                  Diese Bereiche erscheinen später in der Zeiterfassung für dieses Projekt.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
                {alleBereiche.map((bereich) => {
                  const aktiv = ausgewaehlteBereiche.includes(bereich);

                  return (
                    <button
                      key={bereich}
                      type="button"
                      onClick={() => bereichUmschalten(bereich)}
                      className={`rounded-xl border px-4 py-3 text-sm font-black transition-all duration-300 hover:-translate-y-1 ${
                        aktiv
                          ? "border-sky-300/40 bg-sky-300/10 text-sky-100 shadow-lg shadow-sky-300/10"
                          : "border-white/10 bg-white/[0.04] text-white/60 hover:border-sky-300/25 hover:bg-sky-300/5 hover:text-sky-100"
                      }`}
                    >
                      {aktiv ? "✓ " : ""}
                      {bereich}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">
              Anzeige in Arbeitszeiten:{" "}
              <span className="font-black text-sky-200">{anzeigeBauen(kunde, kommission) || "-"}</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={projektSpeichern}
                disabled={loading}
                className="rounded-2xl border border-slate-200/30 bg-slate-200/10 px-5 py-3 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/10 hover:shadow-sky-300/10 disabled:opacity-50"
              >
                {loading ? "Speichern..." : "Änderung speichern"}
              </button>

              <button
                type="button"
                onClick={bearbeitungAbbrechen}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/5 hover:text-sky-200"
              >
                Bearbeiten abbrechen
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-sky-300/20 bg-sky-300/5 px-4 py-3 text-sm font-bold text-sky-100">
            Wähle ein Projekt aus der Projektübersicht aus, um Status, Kunde, Kommission, Projektname oder erlaubte Bereiche zu bearbeiten. Neue Projekte werden im Chef Dashboard angelegt.
          </div>
        )}
      </DropdownPanel>

      <DropdownPanel
        id="uebersicht"
        title="Projektübersicht"
        eyebrow="Aktiv · Pausiert · Bearbeiten"
        description="Alle aktiven und pausierten Projekte. Abgeschlossene Projekte gehören ins Projektarchiv."
        open={uebersichtOffen}
        onToggle={() => setUebersichtOffen(!uebersichtOffen)}
      >
        <div className="mb-6">
          <input
            type="text"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="🔍 Projekt suchen..."
            className="dark-input"
          />
        </div>

        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="text-sm text-white/50">
            {gefilterteProjekte.length} angezeigt · {aktiveProjekte} aktiv · {pausierteProjekte} pausiert
          </div>

          <div className="rounded-full border border-slate-300/20 bg-slate-300/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-200">
            Erstellen nur im Chef Dashboard
          </div>
        </div>

        {gefilterteProjekte.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
            Keine Projekte gefunden.
          </div>
        )}

        <div className="space-y-4 md:hidden">
          {gefilterteProjekte.map((projekt) => (
            <ProjektMobileCard
              key={projekt.id}
              projekt={projekt}
              statusFarbe={statusFarbe}
              onBearbeiten={bearbeitungStarten}
              onLoeschen={projektLoeschen}
            />
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-5 border-b border-white/10 bg-black/20 px-5 py-4 text-sm font-bold uppercase tracking-wide text-white/50">
                <div>Kunde</div>
                <div>Kommission</div>
                <div>Projektname</div>
                <div>Status</div>
                <div>Aktion</div>
              </div>

              {gefilterteProjekte.map((projekt) => (
                <div
                  key={projekt.id}
                  className="grid grid-cols-5 items-center border-b border-white/10 px-5 py-4 text-white/80 transition hover:bg-sky-300/5 hover:text-white"
                >
                  <div className="font-black text-white">{projekt.kunde || "-"}</div>
                  <div>{projekt.kommission || "-"}</div>
                  <div>{projekt.projektname || projekt.name || "-"}</div>
                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(projekt.status)}`}>
                      {projekt.status || "Aktiv"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => bearbeitungStarten(projekt)}
                      className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 font-bold text-white transition hover:border-sky-300/25 hover:bg-sky-300/10"
                    >
                      Bearbeiten
                    </button>

                    <button
                      type="button"
                      onClick={() => projektLoeschen(projekt.id)}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 font-bold text-red-300 transition hover:bg-red-500/15"
                    >
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
      `}</style>
    </main>
  );
}

function ProjektMobileCard({
  projekt,
  statusFarbe,
  onBearbeiten,
  onLoeschen,
}: {
  projekt: any;
  statusFarbe: (status: string) => string;
  onBearbeiten: (projekt: any) => void;
  onLoeschen: (id: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-white">{projekt.kunde || "-"}</div>
          <div className="mt-2 text-sm text-white/60">Kommission: {projekt.kommission || "-"}</div>
          <div className="mt-3 text-lg font-black text-sky-200">{projekt.projektname || projekt.name || "-"}</div>
        </div>

        <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(projekt.status)}`}>
          {projekt.status || "Aktiv"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onBearbeiten(projekt)}
          className="rounded-xl border border-white/10 bg-white/[0.06] p-3 font-bold text-white transition hover:border-sky-300/25 hover:bg-sky-300/10"
        >
          Bearbeiten
        </button>

        <button
          type="button"
          onClick={() => onLoeschen(projekt.id)}
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-bold text-red-300 transition hover:bg-red-500/15"
        >
          Löschen
        </button>
      </div>
    </div>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-white/70">{label}</label>
      {children}
    </div>
  );
}

function HeroMini({ label, value, blue, green }: { label: string; value: string | number; blue?: boolean; green?: boolean }) {
  const color = blue ? "text-sky-200" : green ? "text-green-400" : "text-slate-100";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}</div>
    </div>
  );
}

function KpiCard({ label, value, green, blue }: { label: string; value: string | number; green?: boolean; blue?: boolean }) {
  const color = green ? "text-green-400" : blue ? "text-sky-200" : "text-slate-100";

  return (
    <div className="group overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 shadow-2xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-2xl hover:shadow-sky-300/10">
      <div className={`text-5xl font-black ${color}`}>{value}</div>
      <div className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-white/45">{label}</div>
      <div className="mt-5 h-1 w-16 rounded-full bg-slate-200/40 transition-all duration-300 group-hover:w-24 group-hover:bg-sky-200/70" />
    </div>
  );
}
