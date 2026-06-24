import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function numericValue(value: unknown, fallback: number) {
  if (value === null || value === undefined || value === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      email,
      password,
      name,
      rolle,
      wochenstunden,
      ferienwochen,
      urlaubstage,
      ueberstunden_start,
      eintrittsdatum,
      probezeit_bis,
      austrittsdatum,
      vertragsart,
      zeiterfassung_ab,
      pensum_prozent,
      arbeitstage_pro_woche,
      freier_wochentag,
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, E-Mail und Passwort sind erforderlich." },
        { status: 400 }
      );
    }

    const wochenstundenAlsZahl = numericValue(wochenstunden, 42.5);
    const pensumFallback = wochenstundenAlsZahl === 34 ? 80 : 100;
    const pensum = numericValue(pensum_prozent, pensumFallback);

    const wochenstundenFinal = numericValue(
      wochenstunden,
      pensum === 80 ? 34 : 42.5
    );

    const arbeitstageFinal = numericValue(
      arbeitstage_pro_woche,
      pensum === 80 ? 4 : 5
    );

    const freierWochentagFinal =
      pensum === 80 ? freier_wochentag || "Freitag" : freier_wochentag || null;

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Auth User konnte nicht erstellt werden." },
        { status: 400 }
      );
    }

    const { data: mitarbeiter, error: mitarbeiterError } = await supabaseAdmin
      .from("mitarbeiter")
      .insert({
        name,
        rolle: rolle || "Mitarbeiter",
        user_id: userId,
        wochenstunden: wochenstundenFinal,
        ferienwochen: numericValue(ferienwochen, 5),
        urlaubstage: numericValue(urlaubstage, 25),
        ueberstunden_start: numericValue(ueberstunden_start, 0),
        eintrittsdatum: eintrittsdatum || null,
        probezeit_bis: probezeit_bis || null,
        austrittsdatum: austrittsdatum || null,
        zeiterfassung_ab: zeiterfassung_ab || null,
        vertragsart: vertragsart || "Festangestellt",
        pensum_prozent: pensum,
        arbeitstage_pro_woche: arbeitstageFinal,
        freier_wochentag: freierWochentagFinal,
        status: "Aktiv",
      })
      .select()
      .single();

    if (mitarbeiterError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: mitarbeiterError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      mitarbeiter,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unbekannter Fehler." },
      { status: 500 }
    );
  }
}
