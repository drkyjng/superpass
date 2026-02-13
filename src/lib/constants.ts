export const HOSPITALS = ["QMH", "TWH"] as const;
export type Hospital = (typeof HOSPITALS)[number];

export const SPECIALTIES = ["MED", "SUR"] as const;
export type Specialty = (typeof SPECIALTIES)[number];

export const MED_SUBS = ["CARD", "RESP", "ABDO", "NEUR", "SPOT"] as const;
export const SUR_SUBS = ["PRS", "VAS", "ABDO", "H&N", "ECS", "BR", "ORTH"] as const;

export type MedSub = (typeof MED_SUBS)[number];
export type SurSub = (typeof SUR_SUBS)[number];

export const SEXES = ["M", "F"] as const;
export type Sex = (typeof SEXES)[number];

export const subspecialtiesFor = (specialty: Specialty) =>
  specialty === "MED" ? MED_SUBS : SUR_SUBS;
