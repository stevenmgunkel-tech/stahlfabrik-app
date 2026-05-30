"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ResturlaubPage() {
  const [urlaubstage, setUrlaubstage] = useState(0);
  const [genommenerUrlaub, setGenommenerUrlaub] = useState(0);
  const [kranktage, setKranktage] = useState(0);
  const [offeneAntraege, setOffeneAntraege] = useState(0);
  const [ueberstundenabbauTage, setUeberstundenabbauTage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState("");

  useEffect(() => {
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

      if (mitarbeiter?.urlaubstage) {
        setUrlaubstage(Number(mitarbeiter.urlaubstage));
      }

      const { data: abwesenheiten, error: abwesenheitenError } =
        await supabase
          .from("urlaub")
          .select("*")
          .eq("user_id", user.id);

      if (abwesenheitenError) {
        setMeldung(abwesenheitenError.message);
        console.log(abwesenheitenError);
      }

      if (abwesenheiten) {
        const genehmigterUrlaub = abwesenheiten
          .filter(
            (eintrag) =>
              eintrag.typ === "Urlaub" && eintrag.status === "Genehmigt"
          )
          .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

        const krank = abwesenheiten
          .filter((eintrag) => eintrag.typ === "Krank")
          .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

        const ueberstundenabbau = abwesenheiten
          .filter(
            (eintrag) =>
              eintrag.typ === "Überstundenabbau" &&
              eintrag.status === "Genehmigt"
          )
          .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

        const offen = abwesenheiten.filter(
          (eintrag) => eintrag.status === "Beantragt"
        ).length;

        setGenommenerUrlaub(genehmigterUrlaub);
        setKranktage(krank);
        setUeberstundenabbauTage(ueberstundenabbau);
        setOffeneAntraege(offen);
      }

      setLoading(false);
    }

    ladeDaten();
  }, []);

  const resturlaub = urlaubstage - genommenerUrlaub;
  const verbrauchtProzent =
    urlaubstage > 0 ? Math.min((genommenerUrlaub / urlaubstage) * 100, 100) : 0;
  const restProzent =
    urlaubstage > 0 ? Math.max((resturlaub / urlaubstage) * 100, 0) : 0;

  return (
    <main className="space-y-8">
      <div>
        <div className="mb-3 text-sm font-medium uppercase tracking-widest text-white/60">
          Urlaubskonto
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl">
          Resturlaub
        </h1>

        <p className="mt-3 text-white/60">
          Persönliche Übersicht über Urlaub, Krankheit und Überstundenabbau
        </p>
      </div>

      {meldung && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-bold text-orange-400">
          {meldung}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Jahresurlaub"
          value={loading ? "..." : urlaubstage}
          subtext="Verfügbare Tage pro Jahr"
        />

        <KpiCard
          label="Genommener Urlaub"
          value={loading ? "..." : genommenerUrlaub}
          subtext="Genehmigte Urlaubstage"
        />

        <KpiCard
          label="Resturlaub"
          value={loading ? "..." : resturlaub}
          subtext={resturlaub >= 0 ? "Noch verfügbar" : "Überzogen"}
          highlight={resturlaub >= 0 ? "green" : "red"}
        />

        <KpiCard
          label="Krankheitstage"
          value={loading ? "..." : kranktage}
          subtext="Erfasste Kranktage"
        />

        <KpiCard
          label="Überstundenabbau"
          value={loading ? "..." : ueberstundenabbauTage}
          subtext="Genehmigte Abbautage"
          highlight="orange"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white">
              Urlaubsverbrauch
            </h2>
            <p className="mt-1 text-white/55">
              Verhältnis von Jahresurlaub zu bereits genehmigtem Urlaub
            </p>
          </div>

          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-bold uppercase tracking-widest text-white/45">
                Verbraucht
              </div>
              <div className="mt-2 text-5xl font-black text-orange-500">
                {loading ? "..." : `${genommenerUrlaub}`}
              </div>
              <div className="mt-1 text-white/50">von {urlaubstage} Tagen</div>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold uppercase tracking-widest text-white/45">
                Rest
              </div>
              <div
                className={`mt-2 text-5xl font-black ${
                  resturlaub >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {loading ? "..." : resturlaub}
              </div>
              <div className="mt-1 text-white/50">Tage verfügbar</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-full border border-white/10 bg-black/35 p-1">
            <div
              className="h-4 rounded-full bg-orange-600 shadow-lg shadow-orange-600/30 transition-all"
              style={{ width: `${verbrauchtProzent}%` }}
            />
          </div>

          <div className="mt-4 flex justify-between text-sm text-white/50">
            <span>{verbrauchtProzent.toFixed(0)}% verbraucht</span>
            <span>{restProzent.toFixed(0)}% verfügbar</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white">Status</h2>
            <p className="mt-1 text-white/55">Aktuelle Antragslage</p>
          </div>

          <StatusRow label="Offene Anträge" value={offeneAntraege} />
          <StatusRow label="Genehmigter Urlaub" value={genommenerUrlaub} />
          <StatusRow label="Überstundenabbau" value={ueberstundenabbauTage} orange />
          <StatusRow
            label="Verfügbarer Urlaub"
            value={resturlaub}
            danger={resturlaub < 0}
            success={resturlaub >= 0}
          />
        </div>
      </section>
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
  highlight?: "orange" | "green" | "red";
}) {
  const color =
    highlight === "orange"
      ? "text-orange-500"
      : highlight === "green"
      ? "text-green-400"
      : highlight === "red"
      ? "text-red-400"
      : "text-white";

  const border =
    highlight === "orange"
      ? "hover:border-orange-500/50"
      : highlight === "green"
      ? "hover:border-green-400/40"
      : highlight === "red"
      ? "hover:border-red-400/40"
      : "hover:border-orange-500/40";

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.025] p-6 shadow-2xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 ${border}`}
    >
      <div className="text-sm font-bold uppercase tracking-widest text-white/45">
        {label}
      </div>

      <div className={`mt-5 text-5xl font-black ${color}`}>{value}</div>

      <div className="mt-4 text-sm text-white/50">{subtext}</div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  orange,
  danger,
  success,
}: {
  label: string;
  value: string | number;
  orange?: boolean;
  danger?: boolean;
  success?: boolean;
}) {
  const valueColor = orange
    ? "text-orange-500"
    : danger
    ? "text-red-400"
    : success
    ? "text-green-400"
    : "text-white";

  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/25 p-5 transition hover:border-orange-500/30 hover:bg-black/35">
      <div className="text-white/60">{label}</div>
      <div className={`text-3xl font-black ${valueColor}`}>{value}</div>
    </div>
  );
}