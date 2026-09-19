export interface FilterDefinition {
  key: "raceEthnicity" | "gender" | "ageCategory" | "education";
  label: string;
  values: readonly string[];
}

export const FILTERS: readonly FilterDefinition[] = [
  {
    key: "raceEthnicity",
    label: "Race/Ethnicity",
    // Intentional migration difference: v0 maps `pacis=TRUE` to Pacific
    // Islander but omits the corresponding dropdown option.
    values: ["Latino", "White", "Black", "Asian", "Pacific Islander", "Other/None Listed"],
  },
  { key: "gender", label: "Gender", values: ["Female", "Male"] },
  {
    key: "ageCategory",
    label: "Age Group",
    values: ["55-64", "65 and older", "55-59", "60-64", "65-69", "70-74", "75-79", "80-84", "85-89", "90+"],
  },
  {
    key: "education",
    label: "Education",
    values: ["No HS Degree", "HS Graduate", "Some College", "College Graduate"],
  },
];
