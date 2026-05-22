import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      password,
      rolle,
      wochenstunden,
      urlaubstage,
    } = body;

    if (!name || !email || !password) {
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

    const userId = authData.user.id;

    const { error: mitarbeiterError } = await supabaseAdmin
      .from("mitarbeiter")
      .insert([
        {
          name,
          rolle,
          wochenstunden,
          urlaubstage,
          status: "Aktiv",
          user_id: userId,
          ueberstunden_start: 0,
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
      message: "Mitarbeiter wurde erstellt.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Serverfehler beim Erstellen des Mitarbeiters." },
      { status: 500 }
    );
  }
}