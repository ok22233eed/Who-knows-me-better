"use client";

import { useRef, useState } from "react";
import { Share2 } from "lucide-react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { SecondaryButton } from "./ui";
import { playShare } from "@/lib/sound";
import { editable } from "@/lib/copy";

export function ShareCard({
  name,
  percentage,
  caption,
  url,
  fileNamePrefix = "friend-quiz",
}: {
  name: string;
  percentage?: number | null;
  caption: string;
  url: string;
  fileNamePrefix?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ensureQr() {
    if (qrDataUrl) return qrDataUrl;
    const data = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#0b0a18", light: "#f5f3ff" } });
    setQrDataUrl(data);
    return data;
  }

  async function generateImage(): Promise<string | null> {
    await ensureQr();
    // Give the QR <img> a tick to paint before we rasterize.
    await new Promise((r) => setTimeout(r, 60));
    if (!cardRef.current) return null;
    return toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
  }

  async function handleShare() {
    setBusy(true);
    playShare();
    try {
      const dataUrl = await generateImage();
      if (dataUrl && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `${fileNamePrefix}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: caption, url });
          setBusy(false);
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ text: caption, url });
        setBusy(false);
        return;
      }
      // Desktop / unsupported fallback: download the image directly.
      if (dataUrl) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${fileNamePrefix}.png`;
        a.click();
      }
    } catch {
      // user cancelled the share sheet — not an error
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Off-screen full-resolution card used only for rasterizing */}
      <div className="pointer-events-none absolute -left-[9999px] -top-[9999px]" aria-hidden>
        <div
          ref={cardRef}
          style={{
            width: 360,
            height: 640,
            background: "radial-gradient(ellipse 120% 80% at 50% -10%, #191534 0%, #0b0a18 55%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "48px 32px",
            fontFamily: "Inter, sans-serif",
            color: "#f5f3ff",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 15, color: "#a8a3c0", marginBottom: 8 }}>{name}'s Friendship Quiz</p>
            <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>{caption}</p>
          </div>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: percentage != null ? 120 : 40,
              fontWeight: 700,
              textAlign: "center",
              backgroundImage: "linear-gradient(135deg, #7c5cff, #e13bff 55%, #ff7a45)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {percentage != null ? `${percentage}%` : "Take the quiz →"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {qrDataUrl && (
              <img src={qrDataUrl} width={110} height={110} style={{ borderRadius: 12 }} alt="" />
            )}
            <p style={{ fontSize: 12, color: "#6b6684" }}>Scan to take the quiz</p>
          </div>
        </div>
      </div>

      <SecondaryButton onClick={handleShare} disabled={busy}>
        <span className="flex items-center justify-center gap-2">
          <Share2 size={16} />
          {busy ? "…" : editable.shareFallback}
        </span>
      </SecondaryButton>
    </div>
  );
}
