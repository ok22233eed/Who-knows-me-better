import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { quiz_id, device_fingerprint_hash } = body ?? {};

  if (!quiz_id) {
    return NextResponse.json({ error: "quiz_id is required" }, { status: 400 });
  }

  // Best-effort IP extraction. Nullable downstream — a missing signal
  // never blocks anyone from taking the quiz.
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  const userAgent = request.headers.get("user-agent");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("start_participation", {
    p_quiz_id: quiz_id,
    p_device_fingerprint_hash: device_fingerprint_hash ?? null,
    p_ip_address: ip,
    p_user_agent: userAgent,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ participation: data });
}
