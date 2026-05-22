"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MitarbeiterPage() {
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rolle, setRolle] = useState("Mitarbeiter");
  const [wochenstunden, setWochenstunden] = useState("");
  const [urlaubstage, setUrlaubstage] = useState("");

  useEffect(() => {
    async function ladeMitarbeiter() {
      const { data, error } = await supabase
        .from("mitarbeiter")
        .select("*")
        .order("id", { ascending: false });

      if (data) setMitarbeiter(data);
      if (error) console.log(error);
    }

    ladeMitarbeiter();
  }, []);

  async function mitarbeiterHinzufuegen() {
    const response = await fetch("/api/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
        rolle,
        wochenstunden: Number(wochenstunden),
        urlaubstage: Number(urlaubstage),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error);
      return;
    }

    alert("Mitarbeiter wurde erstellt.");

    setName("");
    setEmail("");
    setPassword("");
    setRolle("Mitarbeiter");
    setWochenstunden("");
    setUrlaubstage("");

    location.reload();
  }

  async function mitarbeiterLoeschen(id: number) {
    const { error } = await supabase
      .from("mitarbeiter")
      .delete()
      .eq("id", id);

    if (!error) location.reload();

    if (error) {
      alert(error.message);
      console.log(error);
    }
  }

  return (
    <main>
      <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
        Mitarbeiter
      </h1>

      <p className="text-zinc-700 text-lg mb-10 font-medium">
        Mitarbeiter & Login-Zugänge verwalten
      </p>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Mitarbeiter mit Login erstellen
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <input
            type="password"
            placeholder="Start-Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <select
            value={rolle}
            onChange={(e) => setRolle(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          >
            <option value="Mitarbeiter">Mitarbeiter</option>
            <option value="Admin">Admin</option>
          </select>

          <input
            type="number"
            step="0.5"
            placeholder="Wochenstunden"
            value={wochenstunden}
            onChange={(e) => setWochenstunden(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <input
            type="number"
            placeholder="Urlaubstage"
            value={urlaubstage}
            onChange={(e) => setUrlaubstage(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />
        </div>

        <button
          onClick={mitarbeiterHinzufuegen}
          className="mt-6 bg-zinc-900 hover:bg-orange-500 transition text-white px-5 py-3 rounded-xl font-bold"
        >
          Mitarbeiter erstellen
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Teamübersicht
        </h2>

        <div className="grid grid-cols-6 font-bold text-zinc-800 border-b border-zinc-300 pb-4 mb-4">
          <div>Name</div>
          <div>Rolle</div>
          <div>Wochenstunden</div>
          <div>Urlaubstage</div>
          <div>Status</div>
          <div>Aktion</div>
        </div>

        {mitarbeiter.map((person) => (
          <div
            key={person.id}
            className="grid grid-cols-6 py-4 border-b border-zinc-200 items-center"
          >
            <div className="text-zinc-900 font-medium">{person.name}</div>
            <div className="text-zinc-800">{person.rolle}</div>
            <div className="text-zinc-800">{person.wochenstunden}h</div>
            <div className="text-zinc-800">{person.urlaubstage}</div>

            <div>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                {person.status}
              </span>
            </div>

            <div>
              <button
                onClick={() => mitarbeiterLoeschen(person.id)}
                className="bg-red-600 hover:bg-red-700 transition text-white px-4 py-2 rounded-lg font-semibold"
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}