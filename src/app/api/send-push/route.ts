import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { notificationCopy } from "@/lib/copy";

// This route is called BY SUPABASE (a Database Webhook on INSERT into
// `notifications`), not by the browser — see README "Push
// notifications" for exactly how to wire that up. It authenticates the
// caller with a shared secret rather than a user session.

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:example@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (!process.env.PUSH_WEBHOOK_SECRET || secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const record = body?.record;
  if (!record?.recipient_profile_id || !record?.notification_type) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const copy = notificationCopy[record.notification_type];
  if (!copy) {
    // Unknown type (e.g. something added later without matching
    // copy) — acknowledge so Supabase doesn't retry forever, but do
    // nothing.
    return NextResponse.json({ skipped: true });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token, push_notifications_enabled")
    .eq("id", record.recipient_profile_id)
    .maybeSingle();

  if (!profile?.push_notifications_enabled || !profile.push_token) {
    return NextResponse.json({ skipped: true, reason: "not subscribed" });
  }

  let subscription;
  try {
    subscription = JSON.parse(profile.push_token);
  } catch {
    return NextResponse.json({ skipped: true, reason: "malformed subscription" });
  }

  const title = copy.title(record.payload ?? {});

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title,
        body: copy.action,
        notificationType: record.notification_type,
        url: "/dashboard",
      })
    );
    return NextResponse.json({ sent: true });
  } catch (err: any) {
    // 404/410 = the subscription is dead (uninstalled, permissions
    // revoked, etc.) — clear it so we stop trying.
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await supabase.from("profiles").update({ push_token: null, push_notifications_enabled: false }).eq("id", record.recipient_profile_id);
    }
    console.error("Push send failed:", err?.message ?? err);
    return NextResponse.json({ error: "send failed" }, { status: 500 });
  }
}
