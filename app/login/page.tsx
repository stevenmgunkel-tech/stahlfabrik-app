"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/";
  }

  async function signup() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account erstellt. Bitte prüfe ggf. deine E-Mails.");
  }

  return (
    <main className="min-h-[80vh] flex items-center justify-center">

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
              onClick={login}
              className="w-full bg-zinc-900 hover:bg-orange-500 transition text-white p-3 rounded-xl font-bold"
            >
              Einloggen
            </button>

            <button
              onClick={signup}
              className="w-full bg-zinc-700 hover:bg-orange-500 transition text-white p-3 rounded-xl font-bold"
            >
              Registrieren
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}