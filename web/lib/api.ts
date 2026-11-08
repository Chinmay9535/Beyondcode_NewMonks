export type Lang = "kn" | "hi" | "ta" | "en";

export type Option = { value: string; label: string };
export type Citation = { id: string; title: string; source: string };
export type Message = {
  id: number;
  channel: "intake" | "recovery";
  role: "patient" | "assistant";
  text: string;
  text_en: string | null;
  lang: string;
  meta: {
    topic?: string | null;
    options?: Option[];
    kind?: "safety" | "answer" | "checkin" | "checkin_ok";
    severity?: "urgent" | "soon";
    citations?: Citation[];
    found?: boolean;
    extracted?: string[];
    choice?: string | null;
    [k: string]: unknown;
  };
  created_at: string;
};

export type Activity = {
  id: string;
  label: string;
  label_local?: string | null;
  distance_cm: number;
  detail: "fine" | "normal" | "coarse";
  night: boolean;
  hours: number;
  importance: number;
  quote?: string | null;
};

export type DayRow = { activity: string; logmar: number; snellen: string; od?: number; os?: number; status: "clear" | "strain" | "glasses"; halos: boolean; utility: number };
export type EyePlan = { family: string; name: string; target: number; fixed: boolean; toric: boolean; a_constant: number; iol_power_d: number | null; refined: boolean; power_target?: number; example_models: string };
export type LensOption = {
  key: string;
  family: "monofocal" | "edof" | "trifocal";
  strategy: "bilateral" | "blended" | "single";
  eyes: { right: EyePlan; left: EyePlan };
  anisometropia_d: number;
  binocular_curve: [number, number][];
  name: string;
  toric: boolean;
  score: number;
  baseline: number;
  contributions: { factor: string; label: string; value: number; status: string | null; halos: boolean }[];
  adjustments: { value: number; reason: string }[];
  flags: { level: "info" | "caution" | "contraindicated"; text: string }[];
  excluded: boolean;
  day_map: DayRow[];
  hours_clear: number;
  hours_total: number;
  halo: number;
  cost_tier: number;
  glasses_after: string;
  example_models: string;
  curve_sources?: string[];
  a_constant: number;
  iol_power_d: number | null;
};

export type Recommendation = {
  id: number;
  status: "pending" | "approved";
  approved_lens: string | null;
  surgeon_note: string | null;
  approved_at: string | null;
  created_at: string;
  options: LensOption[];
  activities: Activity[];
  preferences: { glasses_free: number; budget: number };
  astigmatism: Astig;
  astigmatism_by_eye: { right: Astig; left: Astig };
  primary_eye: "right" | "left";
  dominant_eye: "right" | "left" | null;
  fellow_status: "planned" | "operated" | "natural";
  fellow: { family: string; actual_se: number; predicted_se: number; lens?: string; eye?: string; date?: string | null } | null;
  refinement: { prediction_error: number; target_adjustment: number; text: string } | null;
  biometry_notes: { level: string; text: string }[];
  conditions: string[];
  disclaimer: string;
};

export type Astig = { cyl: number | null; axis: number | null; toric: boolean; borderline: boolean; iol_cyl_estimate?: number };

export type Dose = { id: number; drug: string; drug_key: string; due_at: string; taken_at: string | null; status: "taken" | "upcoming" | "due" | "missed" };
export type Recovery = {
  day: number | null;
  surgery_date: string | null;
  today: Dose[];
  adherence: { taken: number; due_so_far: number; pct: number | null; missed: number };
  follow_ups: { day: number; label: string; date: string; past: boolean }[];
  course_ends: string | null;
  drugs: { key: string; name: string }[];
};

export type Clinic = { name: string; surgeon: string; phone: string; emergency_number: string };

export type PatientView = {
  id: string;
  name: string;
  language: Lang;
  stage: "intake" | "review" | "approved" | "post_op";
  eye: "right" | "left";
  consented: boolean;
  clinic: Clinic;
  activities: Activity[];
  local_labels: Record<string, string | null | undefined>;
  intake: { topic: string | null; options: Option[]; started: boolean } | null;
  plan: { lens: LensOption | null; compare: LensOption[]; activities: Activity[]; note: string | null; approved_at: string | null } | null;
  recovery: Recovery | null;
};

export type Curve = { name: string; curve: [number, number][]; halo: number };
export type Meta = {
  clinic: Clinic;
  ai: string;
  tts: boolean;
  curves: Record<string, Curve>;
  conditions: Record<string, string>;
  languages: Record<Lang, string>;
};

export type Alert = {
  id: number;
  patient_id: string;
  patient_name?: string;
  severity: "urgent" | "soon" | "info";
  category: string;
  text: string;
  text_en: string | null;
  matched: string[];
  status: "open" | "acknowledged";
  note: string | null;
  created_at: string;
  acknowledged_at: string | null;
};

export type Biometry = { axial_length: number; k1: number; k2: number; k2_axis: number | null; acd: number | null; wtw: number | null; lens_thickness: number | null; eye: string; source: string; created_at: string };

export type StaffPatientRow = {
  id: string; name: string; age: number | null; sex: string | null; city: string | null; occupation: string | null;
  language: Lang; eye: string; stage: PatientView["stage"]; surgery_date: string | null;
  open_alerts: number; urgent_alerts: number;
  lens: { name: string; score: number; approved: boolean } | null;
  adherence: Recovery["adherence"] | null; day: number | null; created_at: string;
};

export type StaffPatientDetail = {
  patient: {
    id: string; name: string; age: number | null; sex: string | null; phone: string | null; city: string | null; occupation: string | null;
    language: Lang; eye: "right" | "left"; stage: PatientView["stage"]; conditions: string[]; consent_at: string | null;
    surgery_date: string | null; created_at: string;
    dominant_eye: "right" | "left" | null; fellow_status: "planned" | "operated" | "natural";
    fellow: { family?: string; actual_se?: number; predicted_se?: number; lens?: string; eye?: string; date?: string | null };
    profile: { activities?: Activity[]; glasses_free?: number; budget?: number; occupation?: string };
  };
  biometry: Biometry | null;
  biometry_by_eye: { right: Biometry | null; left: Biometry | null };
  recommendation: Recommendation | null;
  messages: Message[];
  alerts: Alert[];
  recovery: Recovery | null;
  vision_tests: VisionResult[];
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const TOKEN_KEY = "ds-staff-token";
export const staffToken = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch {} },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch {} },
};

export async function api<T>(path: string, init: RequestInit & { json?: unknown; staff?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("Content-Type", "application/json");
  if (init.staff) {
    const t = staffToken.get();
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }
  const res = await fetch(`/api${path}`, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
  if (!res.ok) {
    let detail = res.statusText;
    try { const j = await res.json(); detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export type VisionResult = {
  id: number; eye: "right" | "left"; kind: "distance" | "near" | "amsler"; distance_cm: number | null; logmar: number | null; snellen: string | null;
  amsler_abnormal: boolean | null; amsler_cells: number[]; day: number | null; created_at: string;
  baseline_snellen?: string; vs_baseline_lines?: number; predicted_snellen?: string; predicted_logmar?: number; vs_predicted_lines?: number;
  change_lines?: number; notes?: string[];
};
