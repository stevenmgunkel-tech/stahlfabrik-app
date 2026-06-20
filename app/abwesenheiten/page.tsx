"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { istFeiertagSG } from "@/lib/feiertage";

type Abwesenheit = {
  id: number;
  mitarbeiter?: string | null;
  typ: string;
  von: string;
  bis: string;
  tage: number | string | null;
  stunden: number | string | null;
  status: string;
  user_id: string;
};

type Konto = {
  jahresurlaub: number;
  genommenerUrlaub: number;
  kranktage: number;
  offeneAntraege: number;
  ueberstundenabbauStunden: number;
  ueberstundenAktuell: number;
};


function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getErsterTagDieserMonat() {
  const heute = new Date();
  return new Date(heute.getFullYear(), heute.getMonth(), 1);
}

function zaehleArbeitstage(startDatum: Date, endDatum: Date) {
  let tage = 0;
  const aktuell = new Date(startDatum);
  aktuell.setHours(0, 0, 0, 0);

  const ende = new Date(endDatum);
  ende.setHours(0, 0, 0, 0);

  while (aktuell <= ende) {
    const wochentag = aktuell.getDay();
    const istWochenende = wochentag === 0 || wochentag === 6;
    const istFeiertag = istFeiertagSG(aktuell);

    if (!istWochenende && !istFeiertag) {
      tage++;
    }

    aktuell.setDate(aktuell.getDate() + 1);
  }

  return tage;
}

export default function AbwesenheitenPage() {
  const [abwesenheiten, setAbwesenheiten] = useState<Abwesenheit[]>([]);
  const [konto, setKonto] = useState<Konto>({
  jahresurlaub: 0,
  genommenerUrlaub: 0,
  kranktage: 0,
  offeneAntraege: 0,
  ueberstundenabbauStunden: 0,
  ueberstundenAktuell: 0,
});

  const [typ, setTyp] = useState("Urlaub");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [stunden, setStunden] = useState("");

  const loading = false;
  const [meldung, setMeldung] = useState("");
  const [formularOffen, setFormularOffen] = useState(true);
  const [uebersichtOffen, setUebersichtOffen] = useState(true);

  useEffect(() => {
    ladeDaten();
  }, []);

  async function ladeDaten() {
    
    setMeldung("");

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: mitarbeiter, error: mitarbeiterError } = await supabase
      .from("mitarbeiter")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (mitarbeiterError) {
      setMeldung(mitarbeiterError.message);
      console.log(mitarbeiterError);
    }

    const { data, error } = await supabase
      .from("urlaub")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    const { data: arbeitszeiten, error: zeitenError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .eq("user_id", user.id);

    const { data: tagespausen, error: pausenError } = await supabase
      .from("tagespausen")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      
      return;
    }

    if (zeitenError) {
      setMeldung(zeitenError.message);
      console.log(zeitenError);
    }

    if (pausenError) {
      setMeldung(pausenError.message);
      console.log(pausenError);
    }

    const eintraege = (data || []) as Abwesenheit[];

    const jahresurlaub = Number(mitarbeiter?.urlaubstage || 0);
    const ueberstundenStart = Number(mitarbeiter?.ueberstunden_start || 0);
    const wochenstunden = Number(mitarbeiter?.wochenstunden || 42.5);
    const tagesSoll = wochenstunden / 5;

    const genommenerUrlaub = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" && eintrag.status === "Genehmigt"
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const kranktage = eintraege
      .filter((eintrag) => eintrag.typ === "Krank")
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const ueberstundenabbauStunden = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt"
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const heuteDate = new Date();
    const heute = formatDateLocal(heuteDate);
    const monatsStartDate = getErsterTagDieserMonat();
    const monatsStart = formatDateLocal(monatsStartDate);

    const arbeitszeitenMonat =
      arbeitszeiten?.filter(
        (item) => item.datum >= monatsStart && item.datum <= heute
      ) || [];

    const monatBrutto = arbeitszeitenMonat.reduce(
      (sum, item) => sum + Number(item.stunden || 0),
      0
    );

    const pausenMonat =
      tagespausen
        ?.filter((pause) => pause.datum >= monatsStart && pause.datum <= heute)
        .reduce((sum, pause) => sum + Number(pause.pause || 0) / 60, 0) || 0;

    const monatIst = monatBrutto - pausenMonat;
    const monatTage = zaehleArbeitstage(monatsStartDate, heuteDate);
    const monatSoll = tagesSoll * monatTage;

    const urlaubstageMonat = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" &&
          eintrag.status === "Genehmigt" &&
          eintrag.von >= monatsStart &&
          eintrag.bis <= heute
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const kranktageMonat = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Krank" &&
          eintrag.von >= monatsStart &&
          eintrag.bis <= heute
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const ueberstundenabbauStundenMonat = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt" &&
          eintrag.von >= monatsStart &&
          eintrag.bis <= heute
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const abwesenheitsstundenMonat =
      (urlaubstageMonat + kranktageMonat) * tagesSoll;

    const angerechneteStundenMonat = monatIst + abwesenheitsstundenMonat;
    const monatDifferenz = angerechneteStundenMonat - monatSoll;
    const ueberstundenAktuell =
      ueberstundenStart + monatDifferenz - ueberstundenabbauStundenMonat;

    const offeneAntraege = eintraege.filter(
      (eintrag) => eintrag.status === "Beantragt"
    ).length;

    setAbwesenheiten(eintraege);
    setKonto({
      jahresurlaub,
      genommenerUrlaub,
      kranktage,
      offeneAntraege,
      ueberstundenabbauStunden,
      ueberstundenAktuell,
    });

    
  }

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
      
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setTyp("Urlaub");
    setVon("");
    setBis("");
    setStunden("");

    await ladeDaten();

    
    setMeldung("Abwesenheit gespeichert.");
  }

  async function abwesenheitLoeschen(id: number) {
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

    await ladeDaten();
    setMeldung("Abwesenheit gelöscht.");
  }

  function typFarbe(eintragTyp: string) {
    if (eintragTyp === "Urlaub") {
      return "border-sky-300/30 bg-sky-300/10 text-sky-200";
    }

    if (eintragTyp === "Krank") {
      return "border-red-400/30 bg-red-500/10 text-red-300";
    }

    if (eintragTyp === "Überstundenabbau") {
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

  function eintragZeitraum(eintrag: Abwesenheit) {
    if (eintrag.typ === "Überstundenabbau") {
      return eintrag.von;
    }

    return `${eintrag.von} bis ${eintrag.bis}`;
  }

  function eintragMenge(eintrag: Abwesenheit) {
    if (eintrag.typ === "Überstundenabbau") {
      return formatStunden(Number(eintrag.stunden || 0));
    }

    return `${eintrag.tage || 0} Arbeitstage`;
  }

  const resturlaub = konto.jahresurlaub - konto.genommenerUrlaub;
  const verbrauchtProzent =
    konto.jahresurlaub > 0
      ? Math.min((konto.genommenerUrlaub / konto.jahresurlaub) * 100, 100)
      : 0;
  const restProzent =
    konto.jahresurlaub > 0
      ? Math.max((resturlaub / konto.jahresurlaub) * 100, 0)
      : 0;

  const berechneteTage = berechneTage();
  const berechneteStunden = Number(stunden || 0);

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
                ODZ SILVER · Abwesenheiten
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Abwesenheiten
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-white/65 sm:text-base">
                Urlaub, Krankheit und Überstundenabbau im Überblick.
              </p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
                <span
                  className={`h-3 w-3 rounded-full ${
                    konto.offeneAntraege > 0
                      ? "bg-sky-300 shadow-lg shadow-sky-300/40"
                      : "bg-green-400 shadow-lg shadow-green-400/40"
                  }`}
                />
                <span className="text-xs font-black uppercase tracking-widest text-white/70">
                  {konto.offeneAntraege > 0
                    ? `${konto.offeneAntraege} Antrag offen`
                    : "Alles sauber"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-4">
              <HeroMini label="Ferien" value={resturlaub} green={resturlaub >= 0} red={resturlaub < 0} />
              <HeroMini
                label="Ü-Std."
                value={formatStunden(konto.ueberstundenAktuell, true)}
                green={konto.ueberstundenAktuell >= 0}
                red={konto.ueberstundenAktuell < 0}
              />
              <HeroMini label="Offen" value={konto.offeneAntraege} blue={konto.offeneAntraege > 0} />
              <HeroMini label="Krank" value={konto.kranktage} red={konto.kranktage > 0} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ActionCard href="#formular" label="Beantragen" title="✦ Neue Abwesenheit" onClick={() => setFormularOffen(true)} />
          <ActionCard href="#uebersicht" label="Status" title="▤ Meine Anträge" onClick={() => setUebersichtOffen(true)} />
          <ActionCard href="#formular" label="Konto" title="🌿 Urlaubskonto" onClick={() => setFormularOffen(true)} />
          <ActionCard href="#uebersicht" label="Verlauf" title="📊 Übersicht" onClick={() => setUebersichtOffen(true)} />
        </section>

        {meldung && (
          <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-4 text-sm font-bold text-sky-100">
            {meldung}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            label="Jahresurlaub"
            value={konto.jahresurlaub}
            subtext="Verfügbare Tage pro Jahr"
          />

          <KpiCard
            label="Genommen"
            value={konto.genommenerUrlaub}
            subtext="Genehmigte Urlaubstage"
          />

          <KpiCard
            label="Ferien"
            value={resturlaub}
            subtext={resturlaub >= 0 ? "Noch verfügbar" : "Überzogen"}
            highlight={resturlaub >= 0 ? "green" : "red"}
          />

          <KpiCard
            label="Krank"
            value={konto.kranktage}
            subtext="Erfasste Kranktage"
            highlight={konto.kranktage > 0 ? "red" : undefined}
          />

          <KpiCard
            label="Ü-Std."
            value={formatStunden(Number(konto.ueberstundenAktuell || 0), true)}
            subtext="Aktueller Stand"
            highlight={konto.ueberstundenAktuell >= 0 ? "green" : "red"}
          />

          <KpiCard
            label="Abbau"
            value={formatStunden(Number(konto.ueberstundenabbauStunden || 0))}
            subtext="Genehmigte Abbaustunden"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-7">
            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Urlaubskonto
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  Jahresurlaub, Verbrauch und Resturlaub.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-black text-white/70">
                {restProzent.toFixed(0)}% verfügbar
              </div>
            </div>

            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                  Verbraucht
                </div>
                <div className="mt-2 text-5xl font-black text-sky-100">
                  {konto.genommenerUrlaub}
                </div>
                <div className="mt-1 text-sm text-white/50">
                  von {konto.jahresurlaub} Tagen
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                  Rest
                </div>
                <div
                  className={`mt-2 text-5xl font-black ${
                    resturlaub >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {resturlaub}
                </div>
                <div className="mt-1 text-sm text-white/50">
                  Tage verfügbar
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-full border border-white/10 bg-black/35 p-1">
              <div
                className="h-4 rounded-full bg-gradient-to-r from-sky-200 to-emerald-300 shadow-lg shadow-sky-300/20 transition-all"
                style={{ width: `${verbrauchtProzent}%` }}
              />
            </div>

            <div className="mt-4 flex justify-between text-sm text-white/50">
              <span>{verbrauchtProzent.toFixed(0)}% verbraucht</span>
              <span>{restProzent.toFixed(0)}% verfügbar</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-7">
            <h2 className="text-2xl font-black text-white">Aktueller Status</h2>
            <p className="mt-1 text-sm text-white/55">Offene Anträge, Krankheit und Überstundenabbau kompakt zusammengefasst.</p>

            <div className="mt-6 grid gap-4">
              <InfoBox label="Offene Anträge" value={konto.offeneAntraege} highlight={konto.offeneAntraege > 0 ? "blue" : "green"} />
              <InfoBox label="Kranktage" value={konto.kranktage} highlight={konto.kranktage > 0 ? "red" : undefined} />
              <InfoBox label="Abbau" value={formatStunden(konto.ueberstundenabbauStunden)} />
            </div>
          </div>
        </section>

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
                Überstundenabbau wird in Stunden erfasst und später direkt vom
                Überstundenkonto abgezogen.
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
                className="rounded-2xl border border-white/10 bg-white/10 p-4 font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50"
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
              <p className="mt-1 text-white/55">
                Alle Abwesenheiten mit Status und Menge.
              </p>
            </div>

            <div className="text-sm text-white/50">
              {abwesenheiten.length} Einträge
            </div>
          </div>

          {abwesenheiten.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
              Noch keine Abwesenheiten vorhanden.
            </div>
          )}

          <div className="space-y-4 md:hidden">
            {abwesenheiten.map((eintrag) => (
              <MobileEntry
                key={eintrag.id}
                eintrag={eintrag}
                typFarbe={typFarbe}
                statusFarbe={statusFarbe}
                eintragZeitraum={eintragZeitraum}
                eintragMenge={eintragMenge}
                onDelete={() => abwesenheitLoeschen(eintrag.id)}
              />
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

                {abwesenheiten.map((eintrag) => (
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
                        onClick={() => abwesenheitLoeschen(eintrag.id)}
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

function KpiCard({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string;
  value: string | number;
  subtext: string;
  highlight?: "green" | "red";
}) {
  const color =
    highlight === "green"
      ? "text-green-400"
      : highlight === "red"
      ? "text-red-400"
      : "text-white";

  return (
    <div className="min-h-[150px] rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
        {label}
      </div>

      <div className={`mt-3 min-h-[42px] break-words text-2xl font-black leading-tight sm:text-3xl ${color}`}>
        {value}
      </div>

      <div className="mt-3 text-sm text-white/45">{subtext}</div>
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
          <div className="text-xs font-black uppercase tracking-[0.24em] text-sky-100">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
          <p className="mt-1 text-white/55">{description}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:border-sky-300/25 hover:bg-sky-300/5">
          {open ? "Schließen ▲" : "Öffnen ▼"}
        </div>
      </button>

      {open && (
        <div className="space-y-6 border-t border-white/10 p-6 lg:p-7">
          {children}
        </div>
      )}
    </section>
  );
}

function InfoBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "green" | "red" | "blue";
}) {
  const color =
    highlight === "green"
      ? "text-green-400"
      : highlight === "red"
      ? "text-red-400"
      : highlight === "blue"
      ? "text-sky-200"
      : "text-slate-100";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-black ${color}`}>{value}</div>
    </div>
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
  const color = red
    ? "text-red-400"
    : green
    ? "text-green-400"
    : blue
    ? "text-sky-200"
    : "text-slate-100";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div className={`text-xl font-black leading-tight md:text-2xl ${color}`}>
        {value}
      </div>

      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
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

function MobileEntry({
  eintrag,
  typFarbe,
  statusFarbe,
  eintragZeitraum,
  eintragMenge,
  onDelete,
}: {
  eintrag: Abwesenheit;
  typFarbe: (typ: string) => string;
  statusFarbe: (status: string) => string;
  eintragZeitraum: (eintrag: Abwesenheit) => string;
  eintragMenge: (eintrag: Abwesenheit) => string;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
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
        onClick={onDelete}
        className="mt-5 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-bold text-red-300 transition hover:bg-red-500/15"
      >
        Löschen
      </button>
    </div>
  );
}
