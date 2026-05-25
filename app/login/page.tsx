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

    setMeldung(
      "Account erstellt. Bitte prüfe ggf. deine E-Mails."
    );
  }

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-extrabold text-zinc-900 mb-3 text-center">
          Login
        </h1>

        <p className="text-zinc-700 text-lg mb-10 font-medium text-center">
          Anmeldung bei StahlFabrik
        </p>

        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">
            Zugang
          </h2>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-zinc-300 rounded-xl p-3 text-zinc-900"
            />

            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-zinc-300 rounded-xl p-3 text-zinc-900"
            />

            <button
              type="button"
              onClick={login}
              disabled={loadingLogin}
              className="w-full bg-zinc-900 hover:bg-orange-500 transition text-white p-3 rounded-xl font-bold disabled:opacity-50"
            >
              {loadingLogin ? "Einloggen..." : "Einloggen"}
            </button>

            <button
              type="button"
              onClick={signup}
              disabled={loadingSignup}
              className="w-full bg-zinc-700 hover:bg-orange-500 transition text-white p-3 rounded-xl font-bold disabled:opacity-50"
            >
              {loadingSignup ? "Registrieren..." : "Registrieren"}
            </button>

            {meldung && (
              <div className="rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
                {meldung}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}