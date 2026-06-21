"use client";

import { useState } from "react";
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

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !isBusy) {
      login();
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070a0d] px-5 py-8 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.11),transparent_30%),radial-gradient(circle_at_top_right,rgba(148,163,184,0.08),transparent_30%),linear-gradient(135deg,#070a0d,#0b1118_48%,#030405)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.72)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.72)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-6 shadow-2xl shadow-black/40 lg:p-8">
            <div className="pointer-events-none absolute inset-0 opacity-[0.38]">
              <div
                className="h-full w-full bg-cover bg-[center_20%]"
                style={{
                  backgroundImage: "url('/berg.png')",
                  filter: "brightness(1.65) contrast(1.05)",
                }}
              />
            </div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />

            <div className="relative z-10 flex min-h-[520px] flex-col justify-between">
              <div>
                <div className="inline-flex rounded-full border border-slate-400/25 bg-slate-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-slate-200">
                  ODZ SILVER · V1.1
                </div>

                <div className="mt-8 flex items-center gap-5">
                  <img
                    src="/odz-app-icon-original.png"
                    alt="ODZ."
                    className="h-20 w-20 rounded-[1.6rem] border border-white/10 object-cover shadow-2xl shadow-sky-950/40"
                  />

                  <div>
                    <div className="text-5xl font-black uppercase leading-none tracking-[0.16em] text-white sm:text-6xl">
                      ODZ.
                    </div>
                    <div className="mt-2 text-xs font-black uppercase tracking-[0.28em] text-slate-300">
                      StahlFabrik
                    </div>
                  </div>
                </div>

                <h1 className="mt-9 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Kommandozentrale für deinen Betrieb.
                </h1>

                <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-white/65 sm:text-base">
                  Zeit, Projekte, Personal und Kontrolle in einem ruhigen, klaren und hochwertigen System.
                </p>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
                  <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
                  <span className="text-xs font-black uppercase tracking-widest text-white/70">
                    Sicher anmelden
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <MiniKpi value="ODZ." label="Plattform" />
                  <MiniKpi value="V1.1" label="Version" />
                  <MiniKpi value="ERP" label="System" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-5 text-slate-100 shadow-2xl shadow-black/40 lg:p-7">
            <div className="rounded-[2rem] border border-white/10 bg-black/25 p-6 shadow-xl shadow-black/25 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[42px] font-black uppercase leading-none tracking-[0.12em] text-white">
                    ODZ.
                  </div>

                  <div className="mt-2 inline-flex rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-100">
                    v1.1
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black leading-none tracking-tight">
                    <span className="text-white">Stahl</span>
                    <span className="text-orange-500">Fabrik</span>
                  </div>
                  <div className="mt-2 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
                    Built on ODZ.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/25 backdrop-blur-xl">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Zugriff
                </div>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
                  Willkommen zurück
                </h2>
                <p className="mt-2 text-sm font-semibold text-white/50">
                  Melde dich an und öffne deine Kommandozentrale.
                </p>
              </div>

              <div className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-white/45">
                    E-Mail
                  </span>
                  <input
                    type="email"
                    placeholder="name@firma.ch"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="dark-login-input"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-white/45">
                    Passwort
                  </span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="dark-login-input"
                  />
                </label>

                <button
                  type="button"
                  onClick={login}
                  disabled={isBusy}
                  className="w-full rounded-2xl border border-sky-300/25 bg-sky-300/10 px-5 py-4 text-base font-black text-sky-100 shadow-lg shadow-sky-950/20 transition-colors hover:border-sky-300/35 hover:bg-sky-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingLogin ? "Einloggen..." : "Einloggen"}
                </button>

                <button
                  type="button"
                  onClick={signup}
                  disabled={isBusy}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base font-black text-slate-200 shadow-sm shadow-black/10 transition-colors hover:border-sky-300/25 hover:bg-sky-300/5 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingSignup ? "Registrieren..." : "Registrieren"}
                </button>

                {meldung && (
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm font-bold text-slate-200">
                    {meldung}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-center shadow-xl shadow-black/20">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                © 2026 ODZ.
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                All Rights Reserved
              </p>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        .dark-login-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.28);
          padding: 1rem;
          color: white;
          font-weight: 800;
          outline: none;
          transition: 0.2s ease;
        }

        .dark-login-input:focus {
          border-color: rgba(125, 211, 252, 0.45);
          box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.1);
          background: rgba(0, 0, 0, 0.38);
        }

        .dark-login-input::placeholder {
          color: rgba(255, 255, 255, 0.32);
        }
      `}</style>
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
