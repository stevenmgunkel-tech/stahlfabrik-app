"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { istFeiertagSG } from "../../lib/feiertage";

type Status = "Beantragt" | "Genehmigt" | "Abgelehnt";

type AdminStats = {
  iststunden: number;
  sollstunden: number;
  angerechnet: number;
  differenz: number;
  gesamtUeberstunden: number;
  resturlaub: number;
  offeneEigeneAntraege: number;
  arbeitstage: number;
  tagesSoll: number;
  pensumLabel: string;
};

const initialStats: AdminStats = {
  iststunden: 0,
  sollstunden: 0,
  angerechnet: 0,
  differenz: 0,
  gesamtUeberstunden: 0,
  resturlaub: 0,
  offeneEigeneAntraege: 0,
  arbeitstage: 0,
  tagesSoll: 8.5,
  pensumLabel: "100% · 5 Tage",
};

const wochentagMap: Record<string, number> = {
  montag: 1,
  dienstag: 2,
  mittwoch: 3,
  donnerstag: 4,
  freitag: 5,
  samstag: 6,
  sonntag: 0,
};

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDatumLokal(wert?: string | null) {
  if (!wert) return null;

  const [jahr, monat, tag] = String(wert).slice(0, 10).split("-").map(Number);
  if (!jahr || !monat || !tag) return null;

  const datum = new Date(jahr, monat - 1, tag);
  datum.setHours(0, 0, 0, 0);

  return datum;
}

function maxDatum(...werte: Array<Date | null | undefined>) {
  const gueltig = werte.filter(Boolean) as Date[];
  if (gueltig.length === 0) return null;

  return new Date(Math.max(...gueltig.map((datum) => datum.getTime())));
}

function minDatum(...werte: Array<Date | null | undefined>) {
  const gueltig = werte.filter(Boolean) as Date[];
  if (gueltig.length === 0) return null;

  return new Date(Math.min(...gueltig.map((datum) => datum.getTime())));
}

function formatStunden(value: number, mitVorzeichen = false) {
  if (!Number.isFinite(value)) return "0 min";

  const totalMinuten = Math.round(value * 60);
  const stunden = Math.floor(Math.abs(totalMinuten) / 60);
  const minuten = Math.abs(totalMinuten) % 60;
  const prefix = totalMinuten < 0 ? "-" : mitVorzeichen && totalMinuten > 0 ? "+" : "";

  if (stunden <= 0) return `${prefix}${minuten} min`;
  if (minuten === 0) return `${prefix}${stunden} h`;

  return `${prefix}${stunden} h ${minuten} min`;
}

function formatKurz(value: number) {
  if (!Number.isFinite(value)) return "+0.00 h";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} h`;
}

function formatDatumAnzeige(wert?: string | null) {
  if (!wert) return "-";
  const datum = parseDatumLokal(wert);

  if (!datum) return String(wert).slice(0, 10);

  return datum.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function arbeitsmodell(person: any) {
  const pensum = Number(person?.pensum_prozent || 100);
  const wochenstunden = Number(person?.wochenstunden || (pensum === 80 ? 34 : 42.5));
  const arbeitstageProWoche = Number(
    person?.arbeitstage_pro_woche || (pensum === 80 ? 4 : 5),
  );

  const freierWochentag = String(
    person?.freier_wochentag || (pensum === 80 || arbeitstageProWoche === 4 ? "Freitag" : ""),
  ).trim();

  const freierIndex = wochentagMap[freierWochentag.toLowerCase()] ?? null;
  const tagesSoll =
    arbeitstageProWoche > 0
      ? wochenstunden / arbeitstageProWoche
      : wochenstunden / 5;

  return {
    pensum,
    wochenstunden,
    arbeitstageProWoche,
    freierWochentag,
    freierIndex,
    tagesSoll: Number.isFinite(tagesSoll) ? tagesSoll : 8.5,
    label: `${pensum}% · ${arbeitstageProWoche} Tage${freierWochentag ? ` · frei ${freierWochentag}` : ""}`,
  };
}

function istArbeitstag(datum: Date, person: any) {
  const modell = arbeitsmodell(person);
  const wochentag = datum.getDay();
  const istWochenende = wochentag === 0 || wochentag === 6;
  const istFreierTag = modell.freierIndex !== null && wochentag === modell.freierIndex;

  if (istWochenende || istFreierTag || istFeiertagSG(datum)) return false;

  return true;
}

function zaehleArbeitstage(startDatum: Date, endDatum: Date, person: any) {
  let tage = 0;
  const aktuell = new Date(startDatum);
  aktuell.setHours(0, 0, 0, 0);

  const ende = new Date(endDatum);
  ende.setHours(0, 0, 0, 0);

  while (aktuell <= ende) {
    if (istArbeitstag(aktuell, person)) tage++;
    aktuell.setDate(aktuell.getDate() + 1);
  }

  return tage;
}

function abwesenheitsTage(eintrag: any, person: any, startGrenze?: Date, endeGrenze?: Date) {
  const von = parseDatumLokal(eintrag?.von);
  const bis = parseDatumLokal(eintrag?.bis);

  if (!von || !bis) return Number(eintrag?.tage || 0);

  const start = maxDatum(von, startGrenze);
  const ende = minDatum(bis, endeGrenze);

  if (!start || !ende || start > ende) return 0;

  return zaehleArbeitstage(start, ende, person);
}

function statusStyle(status?: string) {
  if (status === "Genehmigt") {
    return "border-green-400/25 bg-green-500/10 text-green-300";
  }

  if (status === "Abgelehnt") {
    return "border-red-400/25 bg-red-500/10 text-red-300";
  }

  return "border-orange-300/25 bg-orange-400/10 text-orange-200";
}

export default function AdminPage() {
  const [urlaub, setUrlaub] = useState<any[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
  const [eigenerMitarbeiter, setEigenerMitarbeiter] = useState<any | null>(null);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [tagespausen, setTagespausen] = useState<any[]>([]);

  const [geladen, setGeladen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [meldung, setMeldung] = useState("");

  const heute = useMemo(() => new Date(), []);
  const heuteKey = formatDateLocal(heute);
  const monatStart = new Date(heute.getFullYear(), heute.getMonth(), 1);
  const monatStartKey = formatDateLocal(monatStart);
  const jahrStart = new Date(heute.getFullYear(), 0, 1);
  const jahrEnde = new Date(heute.getFullYear(), 11, 31);

  async function ladeDaten() {
    setMeldung("");

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: admin, error: adminError } = await supabase
      .from("mitarbeiter")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (adminError || String(admin?.rolle || "").toLowerCase() !== "admin") {
      window.location.href = "/";
      return;
    }

    setIsAdmin(true);
    setEigenerMitarbeiter(admin);

    const { data: urlaubData, error: urlaubError } = await supabase
      .from("urlaub")
      .select("*")
      .order("id", { ascending: false });

    const { data: mitarbeiterData, error: mitarbeiterError } = await supabase
      .from("mitarbeiter")
      .select("*")
      .order("name", { ascending: true });

    const { data: arbeitszeitenData, error: arbeitszeitenError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .gte("datum", monatStartKey)
      .lte("datum", heuteKey);

    const { data: tagespausenData, error: tagespausenError } = await supabase
      .from("tagespausen")
      .select("*")
      .gte("datum", monatStartKey)
      .lte("datum", heuteKey);

    const fehler = urlaubError || mitarbeiterError || arbeitszeitenError || tagespausenError;

    if (fehler) {
      setMeldung(fehler.message);
      console.log(fehler);
    }

    setUrlaub(urlaubData || []);
    setMitarbeiter(mitarbeiterData || []);
    setArbeitszeiten(arbeitszeitenData || []);
    setTagespausen(tagespausenData || []);
    setGeladen(true);
  }

  useEffect(() => {
    ladeDaten();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function statusAendern(id: number, status: Status) {
    if (!isAdmin) {
      setMeldung("Keine Berechtigung.");
      return;
    }

    setMeldung("");
    setLoadingId(id);

    const { error } = await supabase.from("urlaub").update({ status }).eq("id", id);

    if (error) {
      setLoadingId(null);
      setMeldung(error.message);
      console.log(error);
      return;
    }

    await ladeDaten();
    setLoadingId(null);
    setMeldung(`Status wurde auf ${status} gesetzt.`);
  }

  const personenMap = useMemo(() => {
    const map = new Map<string, any>();

    mitarbeiter.forEach((person) => {
      if (person.user_id) map.set(String(person.user_id), person);
    });

    if (eigenerMitarbeiter?.user_id) {
      map.set(String(eigenerMitarbeiter.user_id), eigenerMitarbeiter);
    }

    return map;
  }, [mitarbeiter, eigenerMitarbeiter]);

  const stats = useMemo<AdminStats>(() => {
    if (!eigenerMitarbeiter?.user_id) return initialStats;

    const modell = arbeitsmodell(eigenerMitarbeiter);
    const berechnungAb = parseDatumLokal(
      eigenerMitarbeiter.zeiterfassung_ab || eigenerMitarbeiter.eintrittsdatum,
    );
    const effektiverMonatsStart = maxDatum(monatStart, berechnungAb) || monatStart;

    const eigeneZeiten = arbeitszeiten.filter(
      (eintrag) =>
        eintrag.user_id === eigenerMitarbeiter.user_id &&
        (!berechnungAb || String(eintrag.datum || "") >= formatDateLocal(berechnungAb)),
    );

    const brutto = eigeneZeiten.reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const pauseStunden = tagespausen
      .filter(
        (pause) =>
          pause.user_id === eigenerMitarbeiter.user_id &&
          (!berechnungAb || String(pause.datum || "") >= formatDateLocal(berechnungAb)),
      )
      .reduce((sum, pause) => sum + Number(pause.pause || 0) / 60, 0);

    const iststunden = brutto - pauseStunden;
    const arbeitstage = effektiverMonatsStart > heute ? 0 : zaehleArbeitstage(effektiverMonatsStart, heute, eigenerMitarbeiter);
    const sollstunden = arbeitstage * modell.tagesSoll;

    const eigeneAbwesenheiten = urlaub.filter((eintrag) => eintrag.user_id === eigenerMitarbeiter.user_id);

    const urlaubstageMonat = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" &&
          eintrag.status === "Genehmigt" &&
          String(eintrag.bis || "") >= formatDateLocal(effektiverMonatsStart) &&
          String(eintrag.von || "") <= heuteKey,
      )
      .reduce((sum, eintrag) => sum + abwesenheitsTage(eintrag, eigenerMitarbeiter, effektiverMonatsStart, heute), 0);

    const kranktageMonat = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Krank" &&
          String(eintrag.bis || "") >= formatDateLocal(effektiverMonatsStart) &&
          String(eintrag.von || "") <= heuteKey,
      )
      .reduce((sum, eintrag) => sum + abwesenheitsTage(eintrag, eigenerMitarbeiter, effektiverMonatsStart, heute), 0);

    const ueberstundenAbbau = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt" &&
          String(eintrag.bis || "") >= formatDateLocal(effektiverMonatsStart) &&
          String(eintrag.von || "") <= heuteKey,
      )
      .reduce(
        (sum, eintrag) =>
          sum + Number(eintrag.stunden || abwesenheitsTage(eintrag, eigenerMitarbeiter, effektiverMonatsStart, heute) * modell.tagesSoll || 0),
        0,
      );

    const abwesenheitsstunden = (urlaubstageMonat + kranktageMonat) * modell.tagesSoll;
    const angerechnet = iststunden + abwesenheitsstunden;
    const differenz = angerechnet - sollstunden - ueberstundenAbbau;

    const genehmigteUrlaubstageJahr = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" &&
          eintrag.status === "Genehmigt" &&
          String(eintrag.bis || "") >= formatDateLocal(jahrStart) &&
          String(eintrag.von || "") <= formatDateLocal(jahrEnde),
      )
      .reduce((sum, eintrag) => sum + abwesenheitsTage(eintrag, eigenerMitarbeiter, jahrStart, jahrEnde), 0);

    const resturlaub = Number(eigenerMitarbeiter.urlaubstage || 0) - genehmigteUrlaubstageJahr;
    const offeneEigeneAntraege = eigeneAbwesenheiten.filter((eintrag) => eintrag.status === "Beantragt").length;

    return {
      iststunden,
      sollstunden,
      angerechnet,
      differenz,
      gesamtUeberstunden: Number(eigenerMitarbeiter.ueberstunden_start || 0) + differenz,
      resturlaub,
      offeneEigeneAntraege,
      arbeitstage,
      tagesSoll: modell.tagesSoll,
      pensumLabel: modell.label,
    };
  }, [eigenerMitarbeiter, arbeitszeiten, tagespausen, urlaub, monatStart, heute, heuteKey, jahrStart, jahrEnde]);

  const offeneAntraege = urlaub.filter((eintrag) => eintrag.status === "Beantragt").length;
  const genehmigteAntraege = urlaub.filter((eintrag) => eintrag.status === "Genehmigt").length;
  const krankmeldungen = urlaub.filter((eintrag) => eintrag.typ === "Krank").length;

  if (!geladen) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-5 font-black shadow-2xl shadow-black/30">
          Admin Übersicht wird geladen...
        </div>
      </main>
    );
  }

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
              ODZ SILVER · Admin Übersicht
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Meine Übersicht
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/65 sm:text-base">
              Persönliche Arbeitszeit, Resturlaub und Team-Abwesenheiten kompakt an einem Ort.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
              <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
              <span className="text-xs font-black uppercase tracking-widest text-white/70">
                {eigenerMitarbeiter?.name || "Admin"} · {stats.pensumLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-4">
            <HeroMini label="Offen" value={offeneAntraege} orange={offeneAntraege > 0} />
            <HeroMini label="Genehmigt" value={genehmigteAntraege} green={genehmigteAntraege > 0} />
            <HeroMini label="Krank" value={krankmeldungen} orange={krankmeldungen > 0} />
            <HeroMini label="Ü-Std." value={formatKurz(stats.gesamtUeberstunden)} green={stats.gesamtUeberstunden >= 0} red={stats.gesamtUeberstunden < 0} />
          </div>
        </div>
      </section>

      {meldung && (
        <div className="rounded-2xl border border-slate-200/20 bg-slate-200/10 p-4 text-sm font-bold text-slate-100">
          {meldung}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Meine Iststunden" value={formatStunden(stats.iststunden)} orange />
        <KpiCard label="Meine Sollstunden" value={formatStunden(stats.sollstunden)} />
        <KpiCard
          label="Meine Überstunden"
          value={formatStunden(stats.gesamtUeberstunden, true)}
          green={stats.gesamtUeberstunden >= 0}
          red={stats.gesamtUeberstunden < 0}
        />
        <KpiCard label="Resturlaub" value={`${Math.max(0, stats.resturlaub).toFixed(1)} Tage`} green={stats.resturlaub >= 0} red={stats.resturlaub < 0} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/20 backdrop-blur-xl lg:p-7">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">
              Persönliche Kontrolle
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">Meine Arbeitszeit im Monat</h2>
            <p className="mt-1 text-sm leading-6 text-white/50">
              80% wird als 4 Tage à 8.5h gerechnet. Der freie Tag wird nicht als Minustag gezählt.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-black text-white/65">
            {formatDatumAnzeige(monatStartKey)} – {formatDatumAnzeige(heuteKey)}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoBox label="Arbeitstage" value={`${stats.arbeitstage}`} sub="Bis heute" />
          <InfoBox label="Tagessoll" value={formatStunden(stats.tagesSoll)} sub={stats.pensumLabel} />
          <InfoBox label="Angerechnet" value={formatStunden(stats.angerechnet)} sub="Ist + Urlaub/Krank" />
          <InfoBox label="Monatsdifferenz" value={formatKurz(stats.differenz)} sub="nach Abbau" green={stats.differenz >= 0} red={stats.differenz < 0} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/20 backdrop-blur-xl lg:p-7">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">
              Team-Abwesenheiten
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">Urlaub, Krankheit und Überstundenabbau</h2>
            <p className="mt-1 text-sm leading-6 text-white/50">
              Freigaben bleiben hier möglich. Die Anzeige berechnet 80%-Mitarbeiter mit freiem Wochentag sauber.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl">
            <HeroMini label="Offen" value={offeneAntraege} orange={offeneAntraege > 0} />
            <HeroMini label="Alle" value={urlaub.length} />
            <HeroMini label="Team" value={mitarbeiter.length} />
          </div>
        </div>

        {urlaub.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm font-bold text-white/45">
            Keine Abwesenheiten vorhanden.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {urlaub.map((eintrag) => {
              const person = personenMap.get(String(eintrag.user_id || ""));
              const tageBerechnet = person ? abwesenheitsTage(eintrag, person) : Number(eintrag.tage || 0);
              const modell = person ? arbeitsmodell(person) : null;
              const istUeberstundenAbbau = eintrag.typ === "Überstundenabbau";
              const umfang = istUeberstundenAbbau
                ? `${formatStunden(Number(eintrag.stunden || tageBerechnet * (modell?.tagesSoll || 8.5) || 0))}`
                : `${tageBerechnet.toFixed(1)} Tage`;

              return (
                <div
                  key={eintrag.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-sky-300/25 hover:bg-sky-300/5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="text-lg font-black text-white">
                        {person?.name || "Unbekannter Mitarbeiter"}
                      </div>
                      <div className="mt-1 text-sm font-bold text-white/50">
                        {eintrag.typ || "Urlaub"} · {formatDatumAnzeige(eintrag.von)} – {formatDatumAnzeige(eintrag.bis)}
                      </div>
                      <div className="mt-2 text-xs font-black uppercase tracking-widest text-white/35">
                        {modell?.label || "Arbeitsmodell nicht gesetzt"}
                      </div>
                    </div>

                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyle(eintrag.status)}`}>
                      {eintrag.status || "Beantragt"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <InfoBox label="Umfang" value={umfang} sub={istUeberstundenAbbau ? "Abbau" : "Arbeitstage"} />
                    <InfoBox label="Erfasst" value={String(eintrag.tage || 0)} sub="Original Tage" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={loadingId === eintrag.id}
                      onClick={() => statusAendern(eintrag.id, "Genehmigt")}
                      className="rounded-2xl border border-green-400/25 bg-green-500/10 px-4 py-3 font-black text-green-200 transition hover:-translate-y-1 hover:border-green-300/45 hover:bg-green-500/15 disabled:opacity-50"
                    >
                      Genehmigen
                    </button>

                    <button
                      type="button"
                      disabled={loadingId === eintrag.id}
                      onClick={() => statusAendern(eintrag.id, "Abgelehnt")}
                      className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 font-black text-red-200 transition hover:-translate-y-1 hover:border-red-300/45 hover:bg-red-500/15 disabled:opacity-50"
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function HeroMini({
  label,
  value,
  green,
  orange,
  red,
}: {
  label: string;
  value: string | number;
  green?: boolean;
  orange?: boolean;
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
              : orange
                ? "text-orange-300"
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

function KpiCard({
  label,
  value,
  green,
  orange,
  red,
}: {
  label: string;
  value: string | number;
  green?: boolean;
  orange?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
        {label}
      </div>
      <div
        className={`mt-3 text-3xl font-black ${
          red
            ? "text-red-400"
            : green
              ? "text-green-400"
              : orange
                ? "text-orange-300"
                : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  sub,
  green,
  red,
}: {
  label: string;
  value: string | number;
  sub?: string;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-black ${green ? "text-green-400" : red ? "text-red-400" : "text-white"}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs font-bold text-white/35">{sub}</div>}
    </div>
  );
}
