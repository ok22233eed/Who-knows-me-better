export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older/locked-down browsers without Clipboard API.
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

export function quizUrl(slug: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/q/${slug}`;
}

export function profileUrl(username: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/profile/${username}`;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
