"use client";

import { LogOut, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ApiError, api, staffToken, type Alert, type Meta } from "@/lib/api";
import { item, stagger } from "./motion";
import { Badge, Button, Card, Logo, ThemeToggle, cx } from "./ui";

export function StaffShell({ children }: { children: (meta: Meta) => React.ReactNode }) {
  const [state, setState] = useState<"checking" | "login" | "ok">("checking");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Meta>("/meta").then(setMeta).catch(() => setErr("API not reachable"));
    if (!staffToken.get()) { setState("login"); return; }
    api("/staff/alerts", { staff: true }).then(() => setState("ok")).catch(() => { staffToken.clear(); setState("login"); });
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await api<{ token: string }>("/staff/login", { method: "POST", json: { pin } });
      staffToken.set(r.token); setState("ok"); setErr(null);
    } catch (e) { setErr(e instanceof ApiError && e.status === 401 ? "Wrong PIN" : String(e)); }
  };

  if (state === "checking" || !meta) return <div className="grid min-h-dvh place-items-center text-muted">{err || "…"}</div>;
  if (state === "login") {
    return (
      <div className="relative grid min-h-dvh place-items-center overflow-hidden p-6">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="sphere sphere-blue float absolute left-[12%] top-[18%] h-40 w-40 opacity-90" />
          <div className="sphere sphere-red float absolute right-[16%] top-[22%] h-20 w-20" style={{ animationDelay: "-2s" }} />
          <div className="sphere sphere-yellow float absolute bottom-[18%] right-[26%] h-12 w-12" style={{ animationDelay: "-4s" }} />
        </div>
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative w-full max-w-sm">
          <motion.div variants={item} className="mb-5 self-start"><div className="bubble bubble-light bubble-l inline-block text-[0.9375rem]">Good to see you, {meta.clinic.surgeon} 👋</div></motion.div>
          <motion.div variants={item}>
            <Card className="p-7">
              <Logo />
              <h1 className="display mt-7 text-[2.125rem]">Clinic sign-in</h1>
              <p className="mt-2 flex items-center gap-2 text-[0.875rem] text-muted"><Stethoscope size={15} className="text-accent-text" /> {meta.clinic.name}</p>
              <form onSubmit={login} className="mt-6 flex flex-col gap-3">
                <input type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" aria-label="PIN"
                  className="min-h-14 rounded-2xl border border-line bg-surface-2 px-4 text-[1.25rem] tracking-[.4em] focus:border-accent focus:outline-none" />
                {err && <p className="text-[0.875rem] text-danger">{err}</p>}
                <Button type="submit" size="lg" arrow>Sign in</Button>
                <p className="text-center text-[0.7812rem] text-muted">Demo PIN 2468</p>
              </form>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="min-h-dvh">
      <header className="glass-strong sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3">
          <Link href="/staff" className="flex items-center gap-3"><Logo size={24} /></Link>
          <nav className="glass ml-2 hidden items-center gap-1 rounded-xl p-1 md:flex">
            <Link href="/staff" className="rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-muted transition hover:bg-surface-2 hover:text-ink">Patients</Link>
            <Link href="/safety" className="rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-muted transition hover:bg-surface-2 hover:text-ink">Safety</Link>
            <Link href="/" className="rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-muted transition hover:bg-surface-2 hover:text-ink">Home</Link>
          </nav>
          <span className="hidden text-[0.8125rem] text-muted lg:inline">{meta.clinic.surgeon}</span>
          <div className="ml-auto flex items-center gap-2">
            <Badge tone={meta.ai === "offline" ? "neutral" : "sky"}>AI: {meta.ai}</Badge>
            <ThemeToggle />
            <button type="button" onClick={() => { staffToken.clear(); location.reload(); }} aria-label="Sign out" className="glass grid h-10 w-10 place-items-center rounded-full text-muted transition hover:text-ink"><LogOut size={17} /></button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-6">{children(meta)}</div>
    </div>
  );
}

export const SEVERITY_TONE = { urgent: "danger", soon: "warn", info: "sky" } as const;
export const STAGE: Record<string, { label: string; tone: "neutral" | "warn" | "ok" | "sky" }> = {
  intake: { label: "Talking to assistant", tone: "neutral" },
  review: { label: "Needs your review", tone: "warn" },
  approved: { label: "Lens approved", tone: "ok" },
  post_op: { label: "Recovering", tone: "sky" },
};

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function AlertItem({ a, onAck, showPatient = true }: { a: Alert; onAck: (id: number, note: string) => void; showPatient?: boolean }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <li className={cx("rounded-2xl border p-4", a.severity === "urgent" ? "border-danger/60 bg-danger-bg" : a.severity === "soon" ? "border-warn/40 bg-warn-bg" : "border-line bg-surface-2")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity.toUpperCase()}</Badge>
        <span className="text-[0.75rem] text-muted">{a.category.replace(/_/g, " ")} · {ago(a.created_at)}</span>
        {showPatient && a.patient_name && <Link href={`/staff/${a.patient_id}`} className="ml-auto text-[0.875rem] font-medium underline-offset-4 hover:underline">{a.patient_name}</Link>}
      </div>
      <p className="mt-2 text-[0.9375rem] leading-snug">&ldquo;{a.text}&rdquo;</p>
      {a.text_en && a.text_en !== a.text && <p className="mt-1 text-[0.8125rem] text-muted">{a.text_en}</p>}
      {a.status === "open" ? (
        open ? (
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); onAck(a.id, note); }}>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Action taken (e.g. called, asked to come in)" className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[0.875rem] focus:outline-none" />
            <Button size="sm" type="submit">Done</Button>
          </form>
        ) : <Button size="sm" variant="soft" className="mt-3" onClick={() => setOpen(true)}>Acknowledge</Button>
      ) : <p className="mt-2 font-mono text-[0.6875rem] text-ok">✓ acknowledged{a.note ? ` · ${a.note}` : ""}</p>}
    </li>
  );
}
