/**
 * Country profiles used as starting points (change 0016). Figures are rounded, approximate mid-2020s values
 * from public sources (see README → Sources); no figure claims more than two significant digits.
 *
 * - gdp: income (GDP) per person, thousand US$ a year
 * - pop: people, millions · popg: population growth, % a year
 * - edu: school quality, 0–100 · life: life expectancy, years
 * - corr: corruption, 0–100 (100 − a rounded corruption-perception score)
 * - res: natural resources, 0–100 · tax: taxes, % of income · jobless: out of work, % of adults
 */
export type Gov = "dem" | "hybrid" | "auto";
export type Climate = "cold" | "mild" | "warm" | "hot" | "dry";

export interface CountryProfile {
  name: string;
  region: string;
  climate: Climate;
  gdp: number;
  pop: number;
  popg: number;
  edu: number;
  life: number;
  corr: number;
  res: number;
  tax: number;
  jobless: number;
  gov: Gov;
}

const c = (name: string, region: string, climate: Climate, gdp: number, pop: number, popg: number, edu: number, life: number, corr: number, res: number, tax: number, jobless: number, gov: Gov): CountryProfile =>
  ({ name, region, climate, gdp, pop, popg, edu, life, corr, res, tax, jobless, gov });

export const REGIONS = ["Europe", "Asia", "Middle East and Caucasus", "Africa", "Americas", "Oceania"] as const;

//                              name              region                      climate   gdp    pop   popg  edu life corr res tax jobless gov
export const COUNTRIES: Record<string, CountryProfile> = {
  dk: c("Denmark",        "Europe",                   "cold",  68,   5.9,  0.5, 92, 81, 10, 30, 47,  5, "dem"),
  se: c("Sweden",         "Europe",                   "cold",  56,  10.5,  0.6, 90, 83, 18, 45, 42,  8, "dem"),
  no: c("Norway",         "Europe",                   "cold",  88,   5.5,  0.9, 90, 83, 16, 90, 40,  4, "dem"),
  de: c("Germany",        "Europe",                   "mild",  53,    84,  0.3, 88, 81, 22, 25, 39,  3, "dem"),
  fr: c("France",         "Europe",                   "mild",  45,    68,  0.3, 85, 83, 29, 25, 46,  7, "dem"),
  gb: c("United Kingdom", "Europe",                   "mild",  49,    68,  0.6, 87, 81, 29, 35, 34,  4, "dem"),
  nl: c("Netherlands",    "Europe",                   "mild",  62,    18,  0.7, 90, 82, 21, 30, 39,  4, "dem"),
  ch: c("Switzerland",    "Europe",                   "cold",  99,   8.8,  0.8, 92, 84, 18, 10, 27,  4, "dem"),
  it: c("Italy",          "Europe",                   "warm",  38,    59, -0.2, 80, 83, 44, 20, 43,  8, "dem"),
  es: c("Spain",          "Europe",                   "warm",  33,    48,  0.6, 82, 83, 40, 20, 37, 12, "dem"),
  pl: c("Poland",         "Europe",                   "mild",  22,    37, -0.2, 85, 78, 46, 35, 35,  3, "dem"),
  ua: c("Ukraine",        "Europe",                   "mild",   5,    37, -1.0, 75, 70, 64, 55, 30, 14, "dem"),
  gr: c("Greece",         "Europe",                   "warm",  23,    10, -0.4, 78, 81, 51, 20, 39, 11, "dem"),
  cn: c("China",          "Asia",                     "mild",  13,  1410, -0.1, 80, 78, 58, 55, 20,  5, "auto"),
  in: c("India",          "Asia",                     "hot",  2.5,  1430,  0.8, 60, 72, 61, 45, 18,  4, "dem"),
  jp: c("Japan",          "Asia",                     "mild",  34,   124, -0.5, 93, 84, 27, 10, 34,  3, "dem"),
  kr: c("South Korea",    "Asia",                     "mild",  33,    52, -0.1, 92, 84, 37, 10, 28,  3, "dem"),
  id: c("Indonesia",      "Asia",                     "hot",  4.9,   278,  0.8, 65, 71, 66, 70, 11,  5, "dem"),
  vn: c("Vietnam",        "Asia",                     "hot",  4.3,    99,  0.7, 72, 74, 59, 50, 19,  2, "auto"),
  ph: c("Philippines",    "Asia",                     "hot",  3.7,   117,  1.5, 62, 72, 66, 50, 15,  4, "dem"),
  bd: c("Bangladesh",     "Asia",                     "hot",  2.6,   172,  1.0, 55, 73, 76, 30,  8,  5, "hybrid"),
  pk: c("Pakistan",       "Asia",                     "dry",  1.4,   240,  2.0, 40, 67, 71, 40, 10,  6, "hybrid"),
  th: c("Thailand",       "Asia",                     "hot",  7.2,    72,  0.1, 72, 79, 65, 40, 17,  1, "hybrid"),
  tr: c("Türkiye",        "Middle East and Caucasus", "warm",  13,    85,  0.5, 70, 78, 66, 30, 24,  9, "hybrid"),
  sa: c("Saudi Arabia",   "Middle East and Caucasus", "dry",   31,    33,  1.5, 70, 77, 48, 100, 8,  5, "auto"),
  il: c("Israel",         "Middle East and Caucasus", "warm",  52,   9.8,  1.6, 85, 83, 38, 25, 32,  4, "dem"),
  ir: c("Iran",           "Middle East and Caucasus", "dry",  4.5,    89,  0.7, 70, 75, 76, 90,  7,  9, "auto"),
  am: c("Armenia",        "Middle East and Caucasus", "mild",   8,   3.0,  0.3, 75, 76, 53, 35, 23, 13, "dem"),
  ng: c("Nigeria",        "Africa",                   "hot",  1.6,   225,  2.4, 45, 54, 75, 70,  6,  5, "hybrid"),
  eg: c("Egypt",          "Africa",                   "dry",  3.5,   113,  1.6, 60, 70, 65, 50, 13,  7, "auto"),
  za: c("South Africa",   "Africa",                   "warm", 6.2,    61,  1.2, 65, 62, 59, 75, 26, 32, "dem"),
  ke: c("Kenya",          "Africa",                   "warm", 2.0,    55,  2.0, 60, 63, 69, 40, 15,  6, "hybrid"),
  et: c("Ethiopia",       "Africa",                   "warm", 1.3,   127,  2.6, 40, 65, 63, 40,  6,  4, "auto"),
  us: c("United States",  "Americas",                 "mild",  82,   335,  0.5, 88, 77, 31, 70, 27,  4, "dem"),
  ca: c("Canada",         "Americas",                 "cold",  53,    40,  1.2, 90, 82, 24, 85, 33,  6, "dem"),
  mx: c("Mexico",         "Americas",                 "warm",  13,   129,  0.7, 68, 75, 69, 55, 17,  3, "hybrid"),
  br: c("Brazil",         "Americas",                 "hot",   10,   216,  0.5, 65, 74, 64, 75, 33,  8, "dem"),
  ar: c("Argentina",      "Americas",                 "mild",  13,    46,  0.6, 75, 77, 63, 65, 29,  6, "dem"),
  cl: c("Chile",          "Americas",                 "mild",  17,    20,  0.5, 78, 80, 34, 70, 21,  9, "dem"),
  co: c("Colombia",       "Americas",                 "warm", 6.9,    52,  0.7, 65, 77, 60, 60, 19, 10, "dem"),
  au: c("Australia",      "Oceania",                  "dry",   64,    27,  1.3, 90, 83, 25, 90, 29,  4, "dem"),
};

/** Picker options grouped by region, alphabetical inside each, then "Your own country". */
export const COUNTRY_GROUPS: [string, [string, string][]][] = [
  ...REGIONS.map((r) => [r, Object.entries(COUNTRIES).filter(([, v]) => v.region === r).map(([k, v]) => [k, v.name] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]))] as [string, [string, string][]]),
  ["Your own", [["custom", "Your own country"]]],
];

export const COUNTRY_OPTIONS: [string, string][] = COUNTRY_GROUPS.flatMap(([, o]) => o);

/** The params a profile sets. */
export function profileParams(id: string) {
  const v = COUNTRIES[id];
  if (!v) return null;
  return { gdp: v.gdp, pop: v.pop, popg: v.popg, edu: v.edu, life: v.life, corr: v.corr, res: v.res, tax: v.tax, jobless: v.jobless, gov: v.gov };
}
