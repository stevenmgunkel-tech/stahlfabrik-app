"use client";

import { useEffect, useState } from "react";

import {
  Users,
  Clock3,
  Plane,
  TriangleAlert,
  Activity,
  FolderKanban,
} from "lucide-react";

import { supabase } from "../lib/supabase";

export default function HomePage() {
  const [mitarbeiter, setMitarbeiter] =
    useState<any[]>([]);

  const [arbeitszeiten, setArbeitszeiten] =
    useState<any[]>([]);

  const [urlaub, setUrlaub] =
    useState<any[]>([]);

  const [projekte, setProjekte] =
    useState<any[]>([]);

  const [userRole, setUserRole] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [meldung, setMeldung] =
    useState("");

  const monat = new Date()
    .toISOString()
    .slice(0, 7);

  useEffect(() => {
    async function ladeDashboard() {
      setLoading(true);
      setMeldung("");

      const userData =
        await supabase.auth.getUser();

      const user =
        userData.data.user;

      if (!user) {
        window.location.href =
          "/login";

        return;
      }

      const {
        data: eigenerMitarbeiter,
        error:
          mitarbeiterCheckError,
      } = await supabase
        .from("mitarbeiter")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (mitarbeiterCheckError) {
        setMeldung(
          mitarbeiterCheckError.message
        );

        console.log(
          mitarbeiterCheckError
        );

        setLoading(false);

        return;
      }

      const rolle =
        eigenerMitarbeiter?.rolle ||
        "";

      const isAdmin =
        rolle === "Admin";

      setUserRole(rolle);

      const start = `${monat}-01`;

      const ende = new Date(
        Number(monat.slice(0, 4)),
        Number(monat.slice(5, 7)),
        0
      )
        .toISOString()
        .split("T")[0];

      const {
        data: mitarbeiterData,
        error: mitarbeiterError,
      } = await supabase
        .from("mitarbeiter")
        .select(
          isAdmin
            ? "*"
            : "id, name, rolle"
        )
        .order("id", {
          ascending: false,
        });

      let arbeitszeitenQuery =
        supabase
          .from("arbeitszeiten")
          .select("*")
          .gte("datum", start)
          .lte("datum", ende)
          .order("id", {
            ascending: false,
          });

      let urlaubQuery =
        supabase
          .from("urlaub")
          .select("*")
          .gte("von", start)
          .lte("bis", ende)
          .order("id", {
            ascending: false,
          });

      if (!isAdmin) {
        arbeitszeitenQuery =
          arbeitszeitenQuery.eq(
            "user_id",
            user.id
          );

        urlaubQuery =
          urlaubQuery.eq(
            "user_id",
            user.id
          );
      }

      const {
        data: arbeitszeitenData,
        error: arbeitszeitenError,
      } = await arbeitszeitenQuery;

      const {
        data: urlaubData,
        error: urlaubError,
      } = await urlaubQuery;

      const {
        data: projekteData,
        error: projekteError,
      } = isAdmin
        ? await supabase
            .from("projekte")
            .select("*")
            .order("id", {
              ascending: false,
            })
        : {
            data: [],
            error: null,
          };

      const fehler =
        mitarbeiterError ||
        arbeitszeitenError ||
        urlaubError ||
        projekteError;

      if (fehler) {
        setMeldung(fehler.message);

        console.log(fehler);
      }

      setMitarbeiter(
        mitarbeiterData || []
      );

      setArbeitszeiten(
        arbeitszeitenData || []
      );

      setUrlaub(urlaubData || []);

      setProjekte(
        projekteData || []
      );

      setLoading(false);
    }

    ladeDashboard();
  }, [monat]);

  const isAdmin =
    userRole === "Admin";

  const gesamtstunden =
    arbeitszeiten.reduce(
      (sum, eintrag) =>
        sum +
        Number(
          eintrag.stunden || 0
        ),
      0
    );

  const offeneUrlaube =
    urlaub.filter(
      (eintrag) =>
        eintrag.typ ===
          "Urlaub" &&
        eintrag.status ===
          "Beantragt"
    ).length;

  const krankmeldungen =
    urlaub.filter(
      (eintrag) =>
        eintrag.typ === "Krank"
    ).length;

  const letzteArbeitszeit =
    arbeitszeiten[0];

  const letzterUrlaub =
    urlaub[0];

  const letztesProjekt =
    projekte[0];

  const letzterMitarbeiter =
    mitarbeiter[0];

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
          StahlFabrik Swiss Made
        </span>

        <h1 className="text-4xl font-black tracking-tight text-zinc-900 md:text-6xl">
          Dashboard
        </h1>

        <p className="text-sm text-zinc-500 md:text-base">
          Willkommen zurück 👋
        </p>
      </div>

      {meldung && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {meldung}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Teammitglieder
              </p>

              <h2 className="mt-4 text-5xl font-black tracking-tight text-zinc-900">
                {loading
                  ? "..."
                  : mitarbeiter.length}
              </h2>
            </div>

            <div className="rounded-2xl bg-zinc-100 p-3">
              <Users
                size={24}
                className="text-zinc-900"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                {isAdmin
                  ? "Arbeitsstunden"
                  : "Meine Stunden"}
              </p>

              <h2 className="mt-4 text-5xl font-black tracking-tight text-zinc-900">
                {loading
                  ? "..."
                  : `${gesamtstunden.toFixed(
                      1
                    )}h`}
              </h2>
            </div>

            <div className="rounded-2xl bg-orange-100 p-3">
              <Clock3
                size={24}
                className="text-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Offene Urlaube
              </p>

              <h2 className="mt-4 text-5xl font-black tracking-tight text-zinc-900">
                {loading
                  ? "..."
                  : offeneUrlaube}
              </h2>
            </div>

            <div className="rounded-2xl bg-blue-100 p-3">
              <Plane
                size={24}
                className="text-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Krankmeldungen
              </p>

              <h2 className="mt-4 text-5xl font-black tracking-tight text-zinc-900">
                {loading
                  ? "..."
                  : krankmeldungen}
              </h2>
            </div>

            <div className="rounded-2xl bg-red-100 p-3">
              <TriangleAlert
                size={24}
                className="text-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-zinc-100 p-3">
              <Activity
                size={22}
                className="text-zinc-900"
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-zinc-900">
                Letzte Aktivitäten
              </h2>

              <p className="text-sm text-zinc-500">
                Aktuelle Übersicht
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {letzteArbeitszeit && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Arbeitszeit
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-zinc-900">
                      {
                        letzteArbeitszeit.projekt
                      }
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      Letzter Eintrag
                    </p>
                  </div>

                  <div className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white">
                    {
                      letzteArbeitszeit.stunden
                    }
                    h
                  </div>
                </div>
              </div>
            )}

            {letzterUrlaub && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Abwesenheit
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-zinc-900">
                      {
                        letzterUrlaub.typ
                      }
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      {
                        letzterUrlaub.status
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white">
                    Status
                  </div>
                </div>
              </div>
            )}

            {!loading &&
              !letzteArbeitszeit &&
              !letzterUrlaub && (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-zinc-500">
                  Noch keine
                  Aktivitäten vorhanden.
                </div>
              )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-zinc-100 p-3">
              <FolderKanban
                size={22}
                className="text-zinc-900"
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-zinc-900">
                Schnellübersicht
              </h2>

              <p className="text-sm text-zinc-500">
                Live Infos
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl bg-zinc-50 p-5">
              <p className="text-sm text-zinc-500">
                Projekte
              </p>

              <h3 className="mt-2 text-4xl font-black tracking-tight text-zinc-900">
                {projekte.length}
              </h3>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-5">
              <p className="text-sm text-zinc-500">
                Monat
              </p>

              <h3 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
                {monat}
              </h3>
            </div>

            {isAdmin &&
              letzterMitarbeiter && (
                <div className="rounded-2xl bg-orange-50 p-5">
                  <p className="text-sm text-orange-500">
                    Letzter Mitarbeiter
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
                    {
                      letzterMitarbeiter.name
                    }
                  </h3>
                </div>
              )}
          </div>
        </div>
      </div>
    </main>
  );
}