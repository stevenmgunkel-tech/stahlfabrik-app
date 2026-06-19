"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

export default function UrlaubPage() {
  const [urlaub, setUrlaub] = useState<any[]>([]);

  const [typ, setTyp] = useState("Urlaub");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [stunden, setStunden] = useState("");

  const [loading, setLoading] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [formularOffen, setFormularOffen] = useState(true);
  const [uebersichtOffen, setUebersichtOffen] = useState(true);

  async function ladeUrlaub() {
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("urlaub")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setUrlaub(data || []);
  }

  useEffect(() => {
    ladeUrlaub();
  }, []);

  function berechneTage() {
    if (typ === "Überstundenabbau") return 0;
    if (!von || !bis) return 0;

    const start = new Date(von);
    const ende = new Date(bis);

    if (ende < start) return 0;

    let tage = 0;
    const aktuell = new Date(start);

    while (aktuell <= ende) {
      const wochentag = aktuell.getDay();

      if (wochentag !== 0 && wochentag !== 6) {
        tage++;
      }

      aktuell.setDate(aktuell.getDate() + 1);
    }

    return tage;
  }

  function formatStunden(wert: number, mitVorzeichen = false) {
    if (!Number.isFinite(wert)) return "0 min";

    const negativ = wert < 0;
    const absolut = Math.abs(wert);
    const gesamtMinuten = Math.round(absolut * 60);
    const stundenWert = Math.floor(gesamtMinuten / 60);
    const minuten = gesamtMinuten % 60;
    const prefix = negativ ? "-" : mitVorzeichen && wert > 0 ? "+" : "";

    if (stundenWert === 0) return `${prefix}${minuten} min`;
    if (minuten === 0) return `${prefix}${stundenWert} h`;

    return `${prefix}${stundenWert} h ${minuten} min`;
  }

  async function abwesenheitHinzufuegen() {
    setMeldung("");

    if (typ === "Überstundenabbau") {
      if (!von || !stunden) {
        setMeldung("Bitte Datum und Stunden eingeben.");
        return;
      }

      const stundenWert = Number(stunden);

      if (!Number.isFinite(stundenWert) || stundenWert <= 0) {
        setMeldung("Bitte gültige Stunden eingeben.");
        return;
      }
    } else {
      if (!von || !bis) {
        setMeldung("Bitte Start- und Enddatum auswählen.");
        return;
      }

      const tage = berechneTage();

      if (tage <= 0) {
        setMeldung("Bitte gültigen Zeitraum auswählen.");
        return;
      }
    }

    const tage = berechneTage();

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    let mitarbeiterName = user.email || "Unbekannt";

    const { data: mitarbeiterData } = await supabase
      .from("mitarbeiter")
      .select("name")
      .eq("user_id", user.id)
      .single();

    if (mitarbeiterData?.name) {
      mitarbeiterName = mitarbeiterData.name;
    }

    setLoading(true);

    const { error } = await supabase.from("urlaub").insert([
      {
        mitarbeiter: mitarbeiterName,
        typ,
        von,
        bis: typ === "Überstundenabbau" ? von : bis,
        tage: typ === "Überstundenabbau" ? 0 : tage,
        stunden: typ === "Überstundenabbau" ? Number(stunden) : 0,
        status: "Beantragt",
        user_id: user.id,
      },
    ]);

    if (error) {
      setLoading(false);
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setTyp("Urlaub");
    setVon("");
    setBis("");
    setStunden("");

    await ladeUrlaub();

    setLoading(false);
    setMeldung("Abwesenheit gespeichert.");
  }

  async function urlaubLoeschen(id: number) {
    const bestaetigen = confirm("Abwesenheit wirklich löschen?");
    if (!bestaetigen) return;

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase
      .from("urlaub")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    await ladeUrlaub();
    setMeldung("Abwesenheit gelöscht.");
  }

  function typFarbe(typ: string) {
    if (typ === "Urlaub") {
      return "border-sky-300/30 bg-sky-300/10 text-sky-200";
    }

    if (typ === "Krank") {
      return "border-red-400/30 bg-red-500/10 text-red-300";
    }

    if (typ === "Überstundenabbau") {
      return "border-slate-200/30 bg-slate-200/10 text-slate-100";
    }

    return "border-white/10 bg-white/[0.06] text-white/70";
  }

  function statusFarbe(status: string) {
    if (status === "Genehmigt") {
      return "border-green-400/30 bg-green-500/10 text-green-300";
    }

    if (status === "Abgelehnt") {
      return "border-red-400/30 bg-red-500/10 text-red-300";
    }

    return "border-slate-200/30 bg-slate-200/10 text-slate-100";
  }

  function eintragZeitraum(eintrag: any) {
    if (eintrag.typ === "Überstundenabbau") {
      return eintrag.von;
    }

    return `${eintrag.von} bis ${eintrag.bis}`;
  }

  function eintragMenge(eintrag: any) {
    if (eintrag.typ === "Überstundenabbau") {
      return formatStunden(Number(eintrag.stunden || 0));
    }

    return `${eintrag.tage || 0} Arbeitstage`;
  }

  const berechneteTage = berechneTage();
  const berechneteStunden = Number(stunden || 0);

  const beantragt = urlaub.filter((eintrag) => eintrag.status === "Beantragt").length;
  const genehmigt = urlaub.filter((eintrag) => eintrag.status === "Genehmigt").length;
  const urlaubstage = urlaub
    .filter((eintrag) => eintrag.typ === "Urlaub")
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);
  const kranktage = urlaub
    .filter((eintrag) => eintrag.typ === "Krank")
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);
  const ueberstundenabbau = urlaub
    .filter((eintrag) => eintrag.typ === "Überstundenabbau")
    .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

  return (
    <main className="space-y-8 text-slate-100">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-7 shadow-2xl shadow-black/30 lg:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.38]">
          <div
            className="h-full w-full bg-cover bg-[center_20%]"
            style={{
              backgroundImage: "url('/berg.png')",
              filter: "brightness(1.55) contrast(1.05)",
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
          <div>
            <div className="inline-flex rounded-full border border-slate-400/25 bg-slate-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-slate-200">
              ODZ SILVER · Abwesenheiten
            </div>

            <h1 className="mt-5 text-5xl font-black tracking-tight text-white lg:text-7xl">
              Urlaub & Krank
            </h1>

            <p className="mt-4 max-w-2xl text-lg font-medium text-white/65">
              Urlaub, Krankheit und Überstundenabbau sauber beantragen und kontrollieren.
            </p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
              <span
                className={`h-3 w-3 rounded-full ${
                  beantragt > 0
                    ? "bg-sky-300 shadow-lg shadow-sky-300/40"
                    : "bg-green-400 shadow-lg shadow-green-400/40"
                }`}
              />
              <span className="text-sm font-black uppercase tracking-widest text-white/70">
                {beantragt > 0 ? `${beantragt} Antrag offen` : "Alles sauber"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-black/25 p-4 text-center backdrop-blur-xl md:grid-cols-4">
            <HeroMini label="Einträge" value={urlaub.length} />
            <HeroMini label="Offen" value={beantragt} blue={beantragt > 0} />
            <HeroMini label="Genehmigt" value={genehmigt} green={genehmigt > 0} />
            <HeroMini label="ÜA" value={formatStunden(ueberstundenabbau)} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ActionCard href="#formular" label="Beantragen" title="✦ Abwesenheit" onClick={() => setFormularOffen(true)} />
        <ActionCard href="#uebersicht" label="Status" title="▤ Übersicht" onClick={() => setUebersichtOffen(true)} />
        <MiniKpi label="Urlaubstage" value={urlaubstage} />
        <MiniKpi label="Kranktage" value={kranktage} red={kranktage > 0} />
      </section>

      {meldung && (
        <div className="rounded-xl border border-slate-200/20 bg-slate-200/10 p-4 text-sm font-bold text-slate-100">
          {meldung}
        </div>
      )}

      <DropdownPanel
        id="formular"
        title="Abwesenheit erfassen"
        eyebrow="Urlaub · Krankheit · Überstundenabbau"
        description={
          typ === "Überstundenabbau"
            ? "Datum und Stunden für Überstundenabbau eintragen."
            : "Zeitraum auswählen und Antrag speichern."
        }
        open={formularOffen}
        onToggle={() => setFormularOffen(!formularOffen)}
      >
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-4">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
              Berechnet
            </div>
            <div className="mt-2 text-3xl font-black text-slate-100">
              {typ === "Überstundenabbau"
                ? formatStunden(berechneteStunden || 0)
                : `${berechneteTage} Tage`}
            </div>
          </div>

          {typ === "Überstundenabbau" && (
            <div className="rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4 text-sm font-medium text-sky-100">
              Überstundenabbau wird in Stunden erfasst und später direkt vom Überstundenkonto abgezogen.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Typ">
            <select
              value={typ}
              onChange={(e) => {
                setTyp(e.target.value);
                setVon("");
                setBis("");
                setStunden("");
              }}
              className="dark-input"
            >
              <option value="Urlaub">Urlaub</option>
              <option value="Krank">Krank</option>
              <option value="Überstundenabbau">Überstundenabbau</option>
            </select>
          </Field>

          {typ === "Überstundenabbau" ? (
            <>
              <Field label="Datum">
                <input
                  type="date"
                  value={von}
                  onChange={(e) => setVon(e.target.value)}
                  className="dark-input"
                />
              </Field>

              <Field label="Stunden">
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="z.B. 2.5"
                  value={stunden}
                  onChange={(e) => setStunden(e.target.value)}
                  className="dark-input"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Von">
                <input
                  type="date"
                  value={von}
                  onChange={(e) => setVon(e.target.value)}
                  className="dark-input"
                />
              </Field>

              <Field label="Bis">
                <input
                  type="date"
                  value={bis}
                  onChange={(e) => setBis(e.target.value)}
                  className="dark-input"
                />
              </Field>
            </>
          )}

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={abwesenheitHinzufuegen}
              disabled={loading}
              className="rounded-2xl border border-slate-200/30 bg-slate-200/10 p-4 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/10 hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </div>
      </DropdownPanel>

      <DropdownPanel
        id="uebersicht"
        title="Meine Abwesenheiten"
        eyebrow="Status · Verlauf · Kontrolle"
        description="Übersicht deiner Anträge, Genehmigungen und abgelehnten Einträge."
        open={uebersichtOffen}
        onToggle={() => setUebersichtOffen(!uebersichtOffen)}
      >
        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black text-white">Übersicht</h2>
            <p className="mt-1 text-white/55">Alle Abwesenheiten mit Status und Menge.</p>
          </div>

          <div className="text-sm text-white/50">{urlaub.length} Einträge</div>
        </div>

        {urlaub.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
            Noch keine Abwesenheiten vorhanden.
          </div>
        )}

        <div className="space-y-4 md:hidden">
          {urlaub.map((eintrag) => (
            <div
              key={eintrag.id}
              className="rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${typFarbe(
                      eintrag.typ
                    )}`}
                  >
                    {eintrag.typ || "Urlaub"}
                  </span>

                  <p className="mt-4 text-lg font-black text-white">
                    {eintragZeitraum(eintrag)}
                  </p>

                  <p className="mt-1 text-sm text-white/60">
                    {eintragMenge(eintrag)}
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(
                    eintrag.status
                  )}`}
                >
                  {eintrag.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => urlaubLoeschen(eintrag.id)}
                className="mt-5 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-bold text-red-300 transition hover:bg-red-500/15"
              >
                Löschen
              </button>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
          <div className="overflow-x-auto">
            <div className="min-w-[850px]">
              <div className="grid grid-cols-6 border-b border-white/10 bg-black/20 px-5 py-4 text-sm font-bold uppercase tracking-wide text-white/50">
                <div>Typ</div>
                <div>Von</div>
                <div>Bis / Datum</div>
                <div>Tage / Stunden</div>
                <div>Status</div>
                <div>Aktion</div>
              </div>

              {urlaub.map((eintrag) => (
                <div
                  key={eintrag.id}
                  className="grid grid-cols-6 items-center border-b border-white/10 px-5 py-4 text-white/80 transition hover:bg-sky-300/5"
                >
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${typFarbe(
                        eintrag.typ
                      )}`}
                    >
                      {eintrag.typ || "Urlaub"}
                    </span>
                  </div>

                  <div>{eintrag.von}</div>

                  <div>
                    {eintrag.typ === "Überstundenabbau"
                      ? eintrag.von
                      : eintrag.bis}
                  </div>

                  <div className="font-black text-slate-100">
                    {eintragMenge(eintrag)}
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(
                        eintrag.status
                      )}`}
                    >
                      {eintrag.status}
                    </span>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => urlaubLoeschen(eintrag.id)}
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

        .dark-input::-webkit-calendar-picker-indicator {
          filter: brightness(0) invert(1);
          opacity: 1;
          cursor: pointer;
        }
      `}</style>
    </main>
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
      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
    >
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-2 text-lg font-black text-white">{title}</div>
    </a>
  );
}

function MiniKpi({
  label,
  value,
  red,
}: {
  label: string;
  value: string | number;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
      <div className="text-sm text-white/50">{label}</div>
      <div className={`mt-2 text-2xl font-black ${red ? "text-red-300" : "text-slate-100"}`}>
        {value}
      </div>
    </div>
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
      className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] shadow-2xl shadow-black/30"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col justify-between gap-4 p-6 text-left transition hover:bg-sky-300/5 lg:flex-row lg:items-center lg:p-7"
      >
        <div>
          <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">
            {eyebrow}
          </div>
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
  green,
  blue,
}: {
  label: string;
  value: string | number;
  green?: boolean;
  blue?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div
        className={`text-2xl font-black md:text-3xl ${
          green ? "text-green-400" : blue ? "text-sky-200" : "text-slate-100"
        }`}
      >
        {value}
      </div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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
