"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, Trophy, User } from "lucide-react";
import { cx } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/dashboard", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[var(--color-void)]/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cx(
                  "flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[10px] font-medium transition",
                  active ? "text-[var(--color-ink)]" : "text-[var(--color-ink-faint)]"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} className={active ? "text-[var(--color-violet)]" : ""} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
