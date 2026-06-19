"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);

  const [meldung, setMeldung] = useState("");

  async function login() {
    setMeldung("");

    if (!email || !password) {
      setMeldung("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    setLoadingLogin(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoadingLogin(false);
      setMeldung(error.message);
      return;
    }

    window.location.href = "/";
  }

  async function signup() {
    setMeldung("");

    if (!email || !password) {
      setMeldung("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    setLoadingSignup(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoadingSignup(false);
      setMeldung(error.message);
      return;
    }

    setLoadingSignup(false);
    setMeldung("Account erstellt. Bitte prüfe ggf. deine E-Mails.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070a0d] px-5 py-8 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(226,232,240,0.08),transparent_30%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.06),transparent_30%),linear-gradient(135deg,#070a0d,#0b1014_45%,#030405)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.72)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.72)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-6 shadow-2xl shadow-black/40 lg:p-8">
            <div className="absolute inset-0 bg-[url('/hero-berg.jpg')] bg-cover bg-center opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />

            <div className="relative z-10 flex min-h-[520px] flex-col justify-between">
              <div>
                <div className="inline-flex rounded-full border border-slate-400/25 bg-slate-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-slate-200">
                  ODZ. v1.1
                </div>

                <h1 className="mt-7 text-5xl font-black uppercase leading-none tracking-tight text-white lg:text-7xl">
                  StahlFabrik
                </h1>

                <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-white/65">
                  Premium Betriebssystem für Zeit, Projekte, Personal und Kontrolle.
                </p>
              </div>

              <div>
                <div className="inline-flex rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-emerald-300">
                  ● Sicher anmelden
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <MiniKpi value="ODZ." label="Plattform" />
                  <MiniKpi value="V1.1" label="Version" />
                  <MiniKpi value="ERP" label="System" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-[#f4f7fa] p-5 text-slate-950 shadow-2xl shadow-black/40 lg:p-7">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10 ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[42px] font-black uppercase leading-none tracking-[0.12em] text-slate-950">
                    ODZ.
                  </div>

                  <div className="mt-2 inline-flex rounded-full border border-sky-300/80 bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 shadow-sm shadow-sky-300/25">
                    v1.1
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black leading-none tracking-tight">
                    <span className="text-slate-950">Stahl</span>
                    <span className="text-orange-500">Fabrik</span>
                  </div>
                  <div className="mt-2 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
                    Built on ODZ.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10 ring-1 ring-slate-200">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
                  Zugriff
                </div>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                  Willkommen zurück
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Melde dich an und öffne deine Kommandozentrale.
                </p>
              </div>

              <div className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    E-Mail
                  </span>
                  <input
                    type="email"
                    placeholder="name@firma.ch"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:shadow-lg focus:shadow-sky-300/15"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    Passwort
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:shadow-lg focus:shadow-sky-300/15"
                  />
                </label>

                <button
                  type="button"
                  onClick={login}
                  disabled={loadingLogin}
                  className="w-full rounded-2xl border border-sky-300/60 bg-gradient-to-r from-sky-500 to-sky-400 px-5 py-4 text-base font-black text-white shadow-xl shadow-sky-500/20 transition hover:-translate-y-0.5 hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingLogin ? "Einloggen..." : "Einloggen"}
                </button>

                <button
                  type="button"
                  onClick={signup}
                  disabled={loadingSignup}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-black text-slate-700 shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingSignup ? "Registrieren..." : "Registrieren"}
                </button>

                {meldung && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                    {meldung}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-xl shadow-slate-950/10 ring-1 ring-slate-200">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                © 2026 ODZ.
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                All Rights Reserved
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function MiniKpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center backdrop-blur-xl">
      <div className="text-xl font-black text-white">{value}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
    </div>
  );
}
