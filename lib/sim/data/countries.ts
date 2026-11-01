/** Rounded country profiles used as starting presets. Figures are approximate (mid-2020s). */
export interface CountryPreset {
  gdp: number; // k$ per person
  pop: number; // millions
  popg: number; // %/yr
  edu: number; // 0–100
  corr: number; // 0–100
  res: number; // 0–100
  gov: "dem" | "hybrid" | "auto";
}

export const COUNTRY_PRESETS: Record<string, CountryPreset> = {
  dk: { gdp: 68, pop: 6, popg: 0.4, edu: 92, corr: 10, res: 30, gov: "dem" },
  us: { gdp: 85, pop: 335, popg: 0.5, edu: 88, corr: 31, res: 70, gov: "dem" },
  br: { gdp: 10, pop: 216, popg: 0.5, edu: 70, corr: 64, res: 75, gov: "dem" },
  ng: { gdp: 2, pop: 225, popg: 2.4, edu: 45, corr: 75, res: 65, gov: "hybrid" },
  in: { gdp: 3, pop: 1430, popg: 0.8, edu: 60, corr: 61, res: 45, gov: "dem" },
  jp: { gdp: 34, pop: 124, popg: -0.5, edu: 93, corr: 27, res: 10, gov: "dem" },
};

export const COUNTRY_NAMES: [string, string][] = [
  ["dk", "Denmark"], ["us", "United States"], ["br", "Brazil"], ["ng", "Nigeria"], ["in", "India"], ["jp", "Japan"], ["custom", "Custom"],
];
