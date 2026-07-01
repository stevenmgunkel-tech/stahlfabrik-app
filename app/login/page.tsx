"use client";

import { useState, type KeyboardEvent } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);

  const [meldung, setMeldung] = useState("");

  const isBusy = loadingLogin || loadingSignup;

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

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !isBusy) {
      login();
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#ece5da] px-5 py-8 text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.08),transparent_30%),linear-gradient(135deg,#f7f2ea,#e9dfd2_48%,#d9cdbc)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(15,23,42,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.14)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-[#302720]/90 via-[#26272a]/90 to-[#161719]/95 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)] lg:p-7">
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

            <div className="relative z-10 flex min-h-[520px] flex-col justify-between">
              <div>
                <div className="inline-flex rounded-full border border-orange-200/30 bg-orange-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-100">
                  ODZ V1.2 · Warm Steel
                </div>

                <div className="mt-8 flex items-center gap-5">
                  <img
                    src="/odz-app-icon-original.png"
                    alt="ODZ."
                    className="h-20 w-20 rounded-[1.6rem] border border-white/10 object-cover shadow-2xl shadow-black/30"
                  />

                  <div>
                    <div className="text-5xl font-black uppercase leading-none tracking-[0.16em] text-white sm:text-6xl">
                      ODZ.
                    </div>
                    <div className="mt-2 text-xs font-black uppercase tracking-[0.28em] text-orange-100/80">
                      StahlFabrik
                    </div>
                  </div>
                </div>

                <h1 className="mt-9 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Kommandozentrale für deinen Betrieb.
                </h1>

                <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-white/70 sm:text-base">
                  Zeit, Projekte, Personal und Kontrolle in einem ruhigen, klaren und hochwertigen System.
                </p>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
                  <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-lg shadow-emerald-900/20" />
                  <span className="text-xs font-black uppercase tracking-widest text-white/70">
                    Sicher anmelden
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <MiniKpi value="ODZ." label="Plattform" />
                  <MiniKpi value="V1.2" label="Version" />
                  <MiniKpi value="ERP" label="System" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/45 p-3 text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-2xl lg:p-4">
            <div className="rounded-[2rem] border border-white/70 bg-white/65 p-6 shadow-[0_14px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[42px] font-black uppercase leading-none tracking-[0.12em] text-slate-950">
                    ODZ.
                  </div>

                  <div className="mt-2 inline-flex rounded-full border border-orange-200/50 bg-orange-100/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-orange-800">
                    v1.2
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black leading-none tracking-tight">
                    <span className="text-slate-950">Stahl</span>
                    <span className="text-orange-600">Fabrik</span>
                  </div>
                  <div className="mt-2 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
                    Built on ODZ.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_14px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-800">
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
                    onKeyDown={handleKeyDown}
                    className="warm-login-input"
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
                    onKeyDown={handleKeyDown}
                    className="warm-login-input"
                  />
                </label>

                <button
                  type="button"
                  onClick={login}
                  disabled={isBusy}
                  className="w-full rounded-2xl border border-orange-200/50 bg-orange-100/70 px-5 py-4 text-base font-black text-slate-950 shadow-lg shadow-orange-900/10 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/60 hover:bg-orange-100/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingLogin ? "Einloggen..." : "Einloggen"}
                </button>

                <button
                  type="button"
                  onClick={signup}
                  disabled={isBusy}
                  className="w-full rounded-2xl border border-white/70 bg-white/60 px-5 py-4 text-base font-black text-slate-700 shadow-sm shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingSignup ? "Registrieren..." : "Registrieren"}
                </button>

                {meldung && (
                  <div className="rounded-2xl border border-orange-200/40 bg-orange-100/60 p-4 text-sm font-bold text-slate-950">
                    {meldung}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/70 bg-white/55 p-5 text-center shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                © 2026 ODZ.
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                All Rights Reserved
              </p>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        .warm-login-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.72);
          background: rgba(255, 255, 255, 0.82);
          padding: 1rem;
          color: #020617;
          font-weight: 800;
          outline: none;
          transition: 0.2s ease;
          color-scheme: light;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
        }

        .warm-login-input:focus {
          border-color: rgba(251, 146, 60, 0.55);
          box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.72);
          background: rgba(255, 255, 255, 0.94);
        }

        .warm-login-input::placeholder {
          color: rgba(15, 23, 42, 0.45);
        }
      `}</style>
    </main>
  );
}

function MiniKpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-center backdrop-blur-xl transition hover:border-orange-200/40 hover:bg-orange-300/10">
      <div className="text-xl font-black text-white">{value}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
        {label}
      </div>
    </div>
  );
}
