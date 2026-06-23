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
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, E-Mail und Passwort sind erforderlich." },
        { status: 400 }
      );
    }

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
        wochenstunden: wochenstunden || 42.5,
        ferienwochen: ferienwochen || 5,
        urlaubstage: urlaubstage || 25,
        ueberstunden_start: ueberstunden_start || 0,
        eintrittsdatum: eintrittsdatum || null,
        probezeit_bis: probezeit_bis || null,
        austrittsdatum: austrittsdatum || null,
        vertragsart: vertragsart || "Unbefristet",
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