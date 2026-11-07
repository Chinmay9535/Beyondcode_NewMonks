"use client";

import { ArrowRight, Stethoscope, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Logo, ThemeToggle } from "@/components/ui";
import { api, type Meta } from "@/lib/api";

const DEMOS = [
  { code: "RAMESH", who: "Ramesh, 62 · tailor, Mysuru", lang: "ಕನ್ನಡ", what: "New patient: start the voice conversation" },
  { code: "LAKSHMI", who: "Lakshmi, 58 · Chennai", lang: "தமிழ்", what: "Conversation done, waiting for the surgeon" },
  { code: "ABDUL", who: "Abdul, 66 · auto driver, Bengaluru", lang: "हिन्दी", what: "Day 3 after surgery: drops, check-in, questions" },
];

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [down, setDown] = useState(false);
  useEffect(() => { api<Meta>("/meta").then(setMeta).catch(() => setDown(true)); }, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-6">
      <header className="flex items-center gap-3">
        <Logo />
        <div className="ml-auto flex items-center gap-2">
          {meta && <Badge tone={meta.ai === "offline" ? "neutral" : "sky"}>AI: {meta.ai}</Badge>}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-12 py-12">
        <section className="max-w-3xl">
          <p className="eyebrow mb-4">For cataract patients and their eye clinic</p>
          <h1 className="text-[clamp(40px,7vw,76px)] font-semibold leading-[0.95] tracking-[-0.045em]">
            The right lens for <span className="serif text-accent-text">the life you live.</span>
          </h1>
          <p className="mt-6 max-w-[52ch] text-[18px] leading-relaxed text-muted">
            DrishtiSaathi talks with patients in Kannada, Hindi, Tamil or English, maps their day hour by hour, and shows the surgeon how each lens would see it.
            After surgery it reminds them about drops, answers from the clinic&apos;s own guidance, and sends warning signs straight to the doctor.
          </p>
        </section>
        {down && <p className="rounded-2xl bg-danger-bg px-4 py-3 text-danger">The API is not reachable. Start the backend (see README) on port 8000.</p>}

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="flex flex-col gap-5 p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-on-accent"><UserRound size={22} /></span>
              <div><h2 className="text-[20px] font-semibold">I&apos;m a patient</h2><p className="text-[14px] text-muted">Enter the code from your clinic</p></div>
            </div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) router.push(`/p/${code.trim().toUpperCase()}`); }}>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. RAMESH" aria-label="Patient code"
                className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-5 font-mono text-[16px] uppercase tracking-[.08em] focus:border-accent focus:outline-none" />
              <Button type="submit" size="lg" aria-label="Open"><ArrowRight size={20} /></Button>
            </form>
            <div>
              <p className="eyebrow mb-2">Demo patients</p>
              <ul className="flex flex-col gap-2">
                {DEMOS.map((d) => (
                  <li key={d.code}>
                    <Link href={`/p/${d.code}`} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 transition hover:border-accent">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium">{d.who}</span>
                        <span className="block text-[13px] text-muted">{d.what}</span>
                      </span>
                      <Badge>{d.lang}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="flex flex-col gap-5 p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky text-bg"><Stethoscope size={22} /></span>
              <div><h2 className="text-[20px] font-semibold">Clinic &amp; surgeon</h2><p className="text-[14px] text-muted">Shortlists, approvals, alerts</p></div>
            </div>
            <ul className="flex flex-col gap-3 text-[15px] text-muted">
              <li>• A ranked lens shortlist built from the patient&apos;s own day, with exact reasons for every score</li>
              <li>• Defocus curves with the patient&apos;s activities placed on them, IOL power and toric check</li>
              <li>• A live alert queue: red-flag symptoms reach you first, in English and the patient&apos;s words</li>
            </ul>
            <Link href="/staff" className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-surface-2 px-5 font-medium hover:border-sky">
              Open the dashboard <ArrowRight size={18} />
            </Link>
            <p className="text-center font-mono text-[12px] text-muted">Demo PIN 2468</p>
          </Card>
        </div>
      </main>

      <footer className="border-t border-line pt-4 text-[12.5px] text-muted">
        <Link href="/safety" className="mr-2 text-ink underline underline-offset-4">Safety scorecard</Link>
        Decision support only. DrishtiSaathi never diagnoses; every lens choice is approved by the surgeon, and every answer cites the clinic&apos;s own guidance.
        {meta && <> · {meta.clinic.name}</>}
      </footer>
    </div>
  );
}
