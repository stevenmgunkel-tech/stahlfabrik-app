import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FIXPAUSE_STUNDEN = 0.25;

function berechneNetto(datum: string, startzeit: string, endzeit: string, pause: number) {
  const start = new Date(`${datum}T${startzeit}`);
  const ende = new Date(`${datum}T${endzeit}`);

  const brutto = (ende.getTime() - start.getTime()) / 1000 / 60 / 60;
  return Math.max(0, Number((brutto - pause).toFixed(2)));
}

export async function GET() {
  const { data: tage, error } = await supabaseAdmin
    .from("tageszeiten")
    .select("*")
    .eq("status", "Abgeschlossen")
    .not("endzeit", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let korrigiert = 0;

  for (const tag of tage || []) {
    const altePause = Number(tag.pause || 0);

    if (altePause !== 0) continue;

    const neuePause = FIXPAUSE_STUNDEN;
    const neueNetto = berechneNetto(
      tag.datum,
      tag.startzeit,
      tag.endzeit,
      neuePause
    );

    await supabaseAdmin
      .from("tageszeiten")
      .update({
        pause: neuePause,
        netto_stunden: neueNetto,
      })
      .eq("id", tag.id);

    const { data: projektzeiten } = await supabaseAdmin
      .from("arbeitszeiten")
      .select("*")
      .eq("user_id", tag.user_id)
      .eq("datum", tag.datum);

    const projektStunden =
      projektzeiten
        ?.filter((z) => z.projekt !== "Betriebsunterhalt")
        .reduce((sum, z) => sum + Number(z.stunden || 0), 0) || 0;

    const betriebsunterhalt = Math.max(
      0,
      Number((neueNetto - projektStunden).toFixed(2))
    );

    const vorhandenerBU = projektzeiten?.find(
      (z) => z.projekt === "Betriebsunterhalt"
    );

    if (vorhandenerBU) {
      await supabaseAdmin
        .from("arbeitszeiten")
        .update({
          stunden: betriebsunterhalt,
        })
        .eq("id", vorhandenerBU.id);
    } else if (betriebsunterhalt > 0) {
      await supabaseAdmin.from("arbeitszeiten").insert({
        user_id: tag.user_id,
        datum: tag.datum,
        projekt: "Betriebsunterhalt",
        bereich: "Betriebsunterhalt",
        stunden: betriebsunterhalt,
        auto_generiert: true,
      });
    }

    korrigiert++;
  }

  return NextResponse.json({
    message: "Fixpause rückwirkend sauber angewendet.",
    korrigiert,
  });
}