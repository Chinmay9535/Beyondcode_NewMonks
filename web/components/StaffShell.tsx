"use client";

import { LogOut, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, api, staffToken, type Alert, type Meta } from "@/lib/api";
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
      <div className="grid min-h-dvh place-items-center p-6">
        <Card className="w-full max-w-sm p-7">
          <Logo />
          <h1 className="mt-6 flex items-center gap-2 text-[22px] font-semibold"><Stethoscope size={20} className="text-sky" /> Clinic sign-in</h1>
          <p className="mt-1 text-[14px] text-muted">{meta.clinic.name}</p>
          <form onSubmit={login} className="mt-6 flex flex-col gap-3">
            <input type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" aria-label="PIN"
              className="min-h-12 rounded-2xl border border-line bg-surface-2 px-4 font-mono text-[18px] tracking-[.3em] focus:border-sky focus:outline-none" />
            {err && <p className="text-[14px] text-danger">{err}</p>}
            <Button type="submit" size="lg">Sign in</Button>
            <p className="text-center font-mono text-[12px] text-muted">Demo PIN 2468</p>
          </form>
        </Card>
      </div>
    );
  }
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3">
          <Link href="/staff" className="flex items-center gap-3"><Logo size={24} /><span className="hidden font-mono text-[12px] text-muted sm:inline">/ {meta.clinic.surgeon}</span></Link>
          <div className="ml-auto flex items-center gap-2">
            <Badge tone={meta.ai === "offline" ? "neutral" : "sky"}>AI: {meta.ai}</Badge>
            <ThemeToggle />
            <button type="button" onClick={() => { staffToken.clear(); location.reload(); }} aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:text-ink"><LogOut size={17} /></button>
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
        <span className="font-mono text-[11px] text-muted">{a.category.replace(/_/g, " ")} · {ago(a.created_at)}</span>
        {showPatient && a.patient_name && <Link href={`/staff/${a.patient_id}`} className="ml-auto text-[14px] font-medium underline-offset-4 hover:underline">{a.patient_name}</Link>}
      </div>
      <p className="mt-2 text-[15px] leading-snug">&ldquo;{a.text}&rdquo;</p>
      {a.text_en && a.text_en !== a.text && <p className="mt-1 text-[13px] text-muted">{a.text_en}</p>}
      {a.status === "open" ? (
        open ? (
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); onAck(a.id, note); }}>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Action taken (e.g. called, asked to come in)" className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[14px] focus:outline-none" />
            <Button size="sm" type="submit">Done</Button>
          </form>
        ) : <Button size="sm" variant="soft" className="mt-3" onClick={() => setOpen(true)}>Acknowledge</Button>
      ) : <p className="mt-2 font-mono text-[11px] text-ok">✓ acknowledged{a.note ? ` · ${a.note}` : ""}</p>}
    </li>
  );
}
