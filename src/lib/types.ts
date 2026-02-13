export type Profile = {
  id: string;
  display_name: string;
  created_at: string;
};

export type CaseRow = {
  id: string;

  specialty: "MED" | "SUR";
  subspecialty: string;

  hospital: "QMH" | "TWH";
  ward: string;
  bed: string;

  name: string;
  age: number;
  sex: "M" | "F";

  date_of_admission: string; // YYYY-MM-DD
  date_of_discharge: string | null; // YYYY-MM-DD | null

  clerkable: boolean;
  high_yield: boolean;

  conditions: string;
  signs: string;
  remarks: string | null;

  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;

  created_by_profile?: { display_name: string } | null;
  updated_by_profile?: { display_name: string } | null;
};
