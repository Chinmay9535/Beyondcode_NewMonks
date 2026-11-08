"use client";

import { Camera, Image as ImageIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { Lang } from "@/lib/api";
import { tr } from "@/lib/i18n";
import Simulator, { type Look } from "./Simulator";
import { cx } from "./ui";

const DepthSimulator = dynamic(() => import("./DepthSimulator"), { ssr: false });

/** "See it for yourself": the street scene, or the patient's own photo with real depth. */
export default function SeeIt({ looks, initial, lang, nearCm }: { looks: Look[]; initial?: string; lang: Lang; nearCm: number }) {
  const [mode, setMode] = useState<"scene" | "photo">("photo");
  const tab = (m: "scene" | "photo", label: string, Icon: React.ComponentType<{ size?: number }>) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
      className={cx("inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full text-[0.875rem] font-medium", mode === m ? "bg-ink text-bg" : "text-muted")}>
      <Icon size={16} /> {label}
    </button>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-full border border-line p-1" role="tablist">
        {tab("photo", tr(lang, "ownPhoto"), Camera)}
        {tab("scene", tr(lang, "useScene"), ImageIcon)}
      </div>
      {mode === "photo" ? <DepthSimulator looks={looks} initial={initial} lang={lang} /> : <Simulator looks={looks} initial={initial} lang={lang} nearCm={nearCm} />}
    </div>
  );
}
