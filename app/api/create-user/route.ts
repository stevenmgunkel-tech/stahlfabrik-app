import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      email,
      password,
      rolle,
      wochenstunden,
      urlaubstage,
      ueberstunden_start,
      eintrittsdatum,
      probezeit_bis,
      austrittsdatum,
      vertragsart,
    } = body;

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
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

    const userId = authData.user.id;

    const { error: mitarbeiterError } =
      await supabase.from("mitarbeiter").insert([
        {
          name,
          rolle,
          wochenstunden,
          urlaubstage,
          status: "Aktiv",
          user_id: userId,
          ueberstunden_start: Number(ueberstunden_start || 0),
          eintrittsdatum: eintrittsdatum || null,
          probezeit_bis: probezeit_bis || null,
          austrittsdatum: austrittsdatum || null,
          vertragsart: vertragsart || "Unbefristet",
        },
      ]);

    if (mitarbeiterError) {
      return NextResponse.json(
        { error: mitarbeiterError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Serverfehler",
      },
      {
        status: 500,
      }
    );
  }
}