"use client";

// Best-effort device signal for the anti-cheat rule in the schema
// (participations.device_fingerprint_hash is nullable — a failure here
// must never block anyone from taking a quiz, it just means that one
// signal is missing for that attempt).

let cached: string | null = null;
let inflight: Promise<string | null> | null = null;

export async function getDeviceFingerprint(): Promise<string | null> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const FingerprintJS = (await import("@fingerprintjs/fingerprintjs")).default;
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      cached = result.visitorId;
      return cached;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
