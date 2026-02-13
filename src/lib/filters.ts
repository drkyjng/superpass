export const FILTERS_STORAGE_KEY = "hku_osce_filters_v1";

export type StoredFilters = {
  specialty: "" | "MED" | "SUR";
  subspecialty: "" | string;
  hospital: "" | "QMH" | "TWH";
  ward: string;
  clerkable: "" | "true" | "false";
  high_yield: "" | "true" | "false";
  q: string;
};

export function loadFilters(): StoredFilters {
  if (typeof window === "undefined") {
    return {
      specialty: "",
      subspecialty: "",
      hospital: "",
      ward: "",
      clerkable: "",
      high_yield: "",
      q: ""
    };
  }
  const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
  if (!raw) {
    return {
      specialty: "",
      subspecialty: "",
      hospital: "",
      ward: "",
      clerkable: "",
      high_yield: "",
      q: ""
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {
      specialty: "",
      subspecialty: "",
      hospital: "",
      ward: "",
      clerkable: "",
      high_yield: "",
      q: ""
    };
  }
}
