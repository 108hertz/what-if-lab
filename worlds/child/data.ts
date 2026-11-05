import { bump, sig } from "@/lib/sim/core";

/**
 * Child world data (change 0018). The model keeps the Big Five (O C E A N) so it stays grounded in research, but every
 * surface uses kid words: Curious, Organised, Outgoing, Kind and Calm (= 100 − N, flipped so higher is always calmer).
 * All effects are rough, research-inspired shifts in "trait points" (0–100 scale), kept modest on purpose.
 */

export const TRAITS = ["O", "C", "E", "A", "N"] as const;
export type Trait = (typeof TRAITS)[number];
export type TraitDelta = Partial<Record<Trait, number>>;

/** Display order and words. Index matches TRAITS; the fifth is shown as Calm (100 − N). */
export const SHOW = ["O", "C", "E", "A", "Calm"] as const;
export type Show = (typeof SHOW)[number];
export const WORD: Record<Show, string> = { O: "Curious", C: "Organised", E: "Outgoing", A: "Kind", Calm: "Calm" };
/** The science name, shown once, small, in "About the science". */
export const SCIENCE: Record<Show, string> = { O: "openness", C: "conscientiousness", E: "extraversion", A: "agreeableness", Calm: "low neuroticism" };
/** Line colours for the dark stage and charts (none is the what-if yellow or the no-change periwinkle). */
export const COLOR: Record<Show, string> = { O: "#7FB2F8", C: "#A3CF7A", E: "#F49A6B", A: "#E58FB0", Calm: "#6FD3C2" };
/** The two ends of each trait scale, in plain words. */
export const ENDS: Record<Show, [less: string, more: string]> = {
  O: ["sticks to what they know", "very curious"],
  C: ["goes with the flow, a bit messy", "very organised"],
  E: ["quiet, a bit shy", "very outgoing"],
  A: ["says what they think, likes to win", "very kind"],
  Calm: ["worries a lot", "very calm"],
};
/** The two ends of each trait's meter on the stage, in one or two words (change 0019). */
export const TRACK: Record<Show, [less: string, more: string]> = {
  O: ["likes the usual", "curious"], C: ["messy", "organised"], E: ["shy", "outgoing"], A: ["own way", "kind"], Calm: ["worried", "calm"],
};
/** Short words for the "less" end, used for counts ("12 of 100 are quiet"). */
export const LOW_WORD: Record<Show, string> = { O: "stick to what they know", C: "go with the flow", E: "are quiet", A: "say what they think", Calm: "worry a lot" };
export const LOW_KEY: Record<Show, string> = { O: "sticks to what they know", C: "goes with the flow", E: "quiet", A: "says what they think", Calm: "worries a lot" };
/** Five steps per trait, for parents (10 / 30 / 50 / 70 / 90 on the display scale). */
export const STEPS: Record<Show, [string, string, string, string, string]> = {
  O: ["sticks to the familiar", "not very curious", "in between", "a bit curious", "very curious"],
  C: ["very messy", "a bit messy", "in between", "a bit organised", "very organised"],
  E: ["very shy", "a bit shy", "in between", "a bit outgoing", "very outgoing"],
  A: ["very stubborn", "a bit stubborn", "in between", "quite kind", "very kind"],
  Calm: ["worries a lot", "worries a bit", "in between", "quite calm", "very calm"],
};
export const STEP_VALUES = [10, 30, 50, 70, 90];
export const stepOf = (v: number) => Math.max(0, Math.min(4, Math.round((v - 10) / 20)));
/** "more X" / "less X" comparatives for sentences. */
export const MORE: Record<Show, [less: string, more: string]> = {
  O: ["less curious", "more curious"],
  C: ["less organised", "more organised"],
  E: ["quieter", "more outgoing"],
  A: ["less kind", "kinder"],
  Calm: ["more worried", "calmer"],
};
/** Short phrases for "Meet the child" (high, low). */
export const PHRASE: Record<Show, [low: string, high: string]> = {
  O: ["likes things they know", "curious about everything"],
  C: ["a bit messy", "keeps things tidy"],
  E: ["enjoys quiet time", "loves being with people"],
  A: ["says what they think", "kind to others"],
  Calm: ["sometimes worries", "stays calm"],
};
export const HIGH = 65, LOW = 35;

/* ───────────── home ───────────── */

/** Parenting style (ids kept from before change 0018). */
export const STYLE: Record<string, TraitDelta> = {
  authoritative: { C: 6, A: 4, N: -5, O: 2 },
  authoritarian: { C: 3, N: 6, A: -2, O: -3 },
  permissive: { C: -5, E: 3, N: 1 },
  neglectful: { C: -6, N: 8, A: -5, E: -2 },
};
/** Siblings: "0", "1", "2" still parse (old links); "1" is one younger. */
export const SIBLINGS: Record<string, TraitDelta> = { "0": { E: -1, A: -1 }, older: { A: 1, C: -1, E: 1 }, "1": { A: 1, C: 1 }, "2": { A: 2, E: 2 } };
export const HOME: Record<string, TraitDelta> = { stable: {}, busy: { C: -1, E: 1, N: 1 }, unstable: { N: 6, C: -3 } };
export const MONEY: Record<string, TraitDelta> = { tight: { N: 3, C: 1, O: -1 }, ok: {}, comfy: { N: -1, O: 1 } };
export const PLACE: Record<string, TraitDelta> = { city: { O: 1, E: 1 }, town: {}, country: { N: -1, A: 1 } };
export const SCHOOL: Record<string, TraitDelta> = { crowded: { C: -1, N: 1 }, ordinary: {}, great: { O: 2, C: 2 } };
export const SCREENS: Record<string, TraitDelta> = { strict: { C: 1, E: 1 }, some: {}, none: { C: -3, N: 2, E: -1 } };
/** Family shape and time together (change 0019). */
export const SHAPE: Record<string, TraitDelta> = { two: {}, one: { C: 1, N: 1 }, twohomes: { N: 2, O: 1 }, big: { A: 2, E: 1, N: -1 } };
export const TIME: Record<string, TraitDelta> = { long: { N: 1, C: 1, A: -1 }, ordinary: {}, lots: { A: 2, N: -2, O: 1 } };
/**
 * What they were like as a baby (temperament, change 0019): moves every kid's start a little; most of it fades with age,
 * a part stays. "Mixed" = each kid different (no shift).
 */
export const BABY: Record<string, TraitDelta> = { mixed: {}, easy: { N: -5, E: 2, C: 1 }, slow: { E: -5, N: 3, O: -2 }, energy: { E: 5, C: -3, N: 1, O: 2 } };
/** How sensitive the kids are: the range of each kid's "how strongly life affects them" (orchids and dandelions). */
export const SENS: Record<string, [lo: number, span: number]> = { same: [1, 0], some: [0.5, 1], all: [1, 0.8] };

type Opt = [value: string, label: string, help: string];
export const HOME_OPTIONS: [id: string, label: string, opts: Opt[]][] = [
  ["baby", "What were they like as a baby?", [
    ["mixed", "Each one different", "Some easy-going, some shy, some full of energy."],
    ["easy", "Easy-going", "Calm, happy babies. Most stay a bit calmer as they grow."],
    ["slow", "Slow to warm up", "Careful with new people and places at first. Many stay a bit quieter."],
    ["energy", "Full of energy", "Lively, loud and always moving. Many stay outgoing."],
  ]],
  ["shape", "Who they live with", [
    ["two", "Two parents", "Mum and dad, two mums or two dads, at home together."],
    ["one", "One parent", "One parent does it all: kids often help out a bit more."],
    ["twohomes", "Two homes", "Parents live apart; kids go back and forth."],
    ["big", "A big family under one roof", "Grandparents, aunts or uncles live with them too: lots of help."],
  ]],
  ["time", "Time together", [
    ["long", "Parents work long hours", "Less time together at home."],
    ["ordinary", "Ordinary", "Some time together most days."],
    ["lots", "Lots of family time", "Lots of time to play and talk together: a bit calmer and kinder."],
  ]],
  ["style", "How the parents raise them", [
    ["authoritative", "Warm and firm", "Lots of love and clear rules. Kids tend to be a bit more organised and calmer."],
    ["authoritarian", "Strict", "Many rules, not much warmth. Kids tend to be organised but more worried."],
    ["permissive", "Easy-going", "Lots of love, few rules. Kids tend to be outgoing but less organised."],
    ["neglectful", "Distant", "Parents are busy and far away. Kids tend to worry more and be less organised."],
  ]],
  ["sib", "Brothers and sisters", [
    ["0", "None", "An only child: a little less practice at sharing."],
    ["older", "One older", "A big brother or sister to look up to."],
    ["1", "One younger", "A little one to look after: a bit kinder, a bit more organised."],
    ["2", "Two or more", "A busy house full of kids: more sharing, more chatting."],
  ]],
  ["home", "Home life", [
    ["stable", "Calm", "A peaceful home."],
    ["busy", "Busy", "Always something going on: a bit more outgoing, a bit less tidy."],
    ["unstable", "Lots of arguing", "Grown-ups often argue. Kids tend to worry more."],
  ]],
  ["money", "Money at home", [
    ["tight", "Tight", "Money is often short. Kids worry a bit more."],
    ["ok", "OK", "Enough for what they need."],
    ["comfy", "Comfortable", "Enough for extras like trips and lessons."],
  ]],
  ["place", "Where they live", [
    ["city", "City", "Lots of people and new things around."],
    ["town", "Town", "A bit of both."],
    ["country", "Countryside", "Quiet, with lots of nature."],
  ]],
  ["school", "School", [
    ["crowded", "Crowded", "Big classes; teachers have little time for each kid."],
    ["ordinary", "Ordinary", "A normal school."],
    ["great", "Great teachers", "Teachers who spark interest: a bit more curious and organised."],
  ]],
  ["screens", "Screen rules", [
    ["strict", "Strict", "Screens only now and then."],
    ["some", "Some", "Some screen time every day."],
    ["none", "No rules", "Screens whenever they like: a bit less organised, more worried."],
  ]],
];
export const HOME_DEFAULTS: Record<string, string> = { baby: "mixed", shape: "two", time: "ordinary", style: "authoritarian", sib: "0", home: "stable", money: "ok", place: "town", school: "ordinary", screens: "some" };
export const HOME_TABLES: Record<string, Record<string, TraitDelta>> = { shape: SHAPE, time: TIME, style: STYLE, sib: SIBLINGS, home: HOME, money: MONEY, place: PLACE, school: SCHOOL, screens: SCREENS };

/* ───────────── families ───────────── */

/** Ready-made families. Values are model values (O C E A N, N = worry) for parent A and parent B. */
export const FAMILIES: Record<string, { name: string; a: number[]; b: number[] }> = {
  everyday: { name: "A curious parent and an organised one", a: [70, 55, 40, 65, 45], b: [50, 75, 65, 50, 35] },
  calm: { name: "Two calm, organised parents", a: [50, 80, 45, 65, 20], b: [55, 75, 50, 60, 25] },
  lively: { name: "Two lively, outgoing parents", a: [70, 40, 85, 60, 45], b: [65, 45, 80, 55, 40] },
  worrier: { name: "One worrier, one easy-going", a: [55, 65, 35, 60, 80], b: [60, 40, 60, 70, 20] },
  artists: { name: "Curious artists", a: [90, 35, 55, 60, 55], b: [85, 45, 45, 65, 50] },
  average: { name: "Average parents", a: [50, 50, 50, 50, 50], b: [50, 50, 50, 50, 50] },
};
export const FAMILY_IDS = Object.keys(FAMILIES);

/* ───────────── growing up ───────────── */

/** Maturity principle: average change of each trait with age. */
export const MATURATION: Record<Trait, (age: number) => number> = {
  O: (a) => 5 * bump(a, 20, 6),
  C: (a) => 10 * sig((a - 22) / 5) - 4 * bump(a, 15, 3) - 3,
  A: (a) => 8 * sig((a - 25) / 7) - 2,
  E: (a) => -4 * bump(a, 14, 3),
  N: (a) => 6 * bump(a, 15, 3.5) - 6 * sig((a - 25) / 6),
};

/* ───────────── things that can happen (what-ifs) ───────────── */

export type ChangeKind = "home" | "school" | "activity" | "move" | "luck";
export interface Change {
  q: string;          // the question on the button
  txt: string;        // timeline line (stable text)
  past: string;       // for the story: "When <past> at 4, …"
  cap: string;        // stage caption: "Age 8 — <cap>"
  kind: ChangeKind;
  d: TraitDelta;      // effect in trait points at "medium"
  pf: number;         // how much lasts (0–1)
  style?: string;     // parenting-style changes: the effect is the difference from the current style
  len: number;        // how long it usually goes on, in years (0 = a moment, FOREVER = for good) (change 0019)
  stop: string;       // timeline line when you stop it (stable text)
  min?: number;       // youngest age it can happen at; an earlier click waits for this age (change 0019)
}
/** "For good": a length longer than any life in the model. */
export const FOREVER = 999;
/** "How long" settings (used by your next click); "usual" takes each change's own length. */
export const LEN: Record<string, number> = { moment: 0, year: 1, few: 3, good: FOREVER };
export const LEN_WORD: Record<string, string> = { usual: "The usual", moment: "A moment", year: "About a year", few: "A few years", good: "For good" };
/** "for about a year", "for good"… for a length in years. */
export const lenWord = (len: number) => (len >= FOREVER ? "for good" : len <= 0 ? "just once" : len <= 1 ? "for about a year" : `for about ${Math.round(len)} years`);

export const CHANGES: Record<string, Change> = {
  authoritative: { q: "What if the parents became warm and firm?", txt: "Parents become warm and firm: clear rules, lots of love", past: "the parents became warm and firm", cap: "parents become warm and firm", kind: "home", d: {}, pf: 0.5, style: "authoritative", len: FOREVER, stop: "The parents stop being so warm and firm" },
  strict: { q: "What if the parents got much stricter?", txt: "Parents get much stricter", past: "the parents got stricter", cap: "parents get stricter", kind: "home", d: {}, pf: 0.5, style: "authoritarian", len: FOREVER, stop: "The parents stop being so strict" },
  sibling: { q: "What if a little brother or sister arrived?", txt: "A little brother or sister arrives", past: "a little brother or sister arrived", cap: "a little brother or sister arrives", kind: "home", d: { A: 3, N: 2, E: 1 }, pf: 0.6, len: FOREVER, stop: "The little brother or sister moves out" },
  divorce: { q: "What if the parents separated?", txt: "The parents separate and set up two homes", past: "the parents separated", cap: "the parents separate", kind: "home", d: { N: 6, A: -2, C: -2 }, pf: 0.35, len: 0, stop: "The parents get back together" },
  grandparent: { q: "What if a grandparent moved in?", txt: "A grandparent moves in", past: "a grandparent moved in", cap: "a grandparent moves in", kind: "home", d: { A: 3, N: -2, O: 1 }, pf: 0.6, len: FOREVER, stop: "The grandparent moves out" },
  pet: { q: "What if the family got a dog?", txt: "The family gets a dog", past: "the family got a dog", cap: "the family gets a dog", kind: "home", d: { A: 3, N: -2, C: 1, E: 1 }, pf: 0.6, len: FOREVER, stop: "The dog goes to live on a farm" },
  money: { q: "What if money got tight for a few years?", txt: "Money gets tight for a few years", past: "money got tight", cap: "money gets tight for a while", kind: "home", d: { N: 4, C: 1, O: -2 }, pf: 0.3, len: 3, stop: "Money is OK again" },
  illness: { q: "What if a parent got seriously ill for a year?", txt: "A parent is seriously ill for a year, then gets better", past: "a parent was ill for a year", cap: "a parent is ill for a year", kind: "home", d: { N: 4, A: 2, C: 2 }, pf: 0.4, len: 1, stop: "The parent is well again" },
  bullied: { q: "What if they were bullied for a year?", txt: "Bullied at school for a year", past: "they were bullied for a year", cap: "bullied at school for a year", kind: "school", d: { N: 6, E: -4, A: -1 }, pf: 0.4, len: 1, stop: "The bullying stops", min: 5 },
  bestfriend: { q: "What if they found a best friend?", txt: "Finds a best friend", past: "they found a best friend", cap: "finds a best friend", kind: "school", d: { E: 4, N: -3, A: 2 }, pf: 0.6, len: 5, stop: "The best friend moves away", min: 3 },
  teacher: { q: "What if they had a great teacher?", txt: "Has a great teacher", past: "they had a great teacher", cap: "has a great teacher", kind: "school", d: { O: 4, C: 4, N: -1 }, pf: 0.7, len: 1, stop: "The great teacher leaves", min: 5 },
  newschool: { q: "What if they changed schools?", txt: "Changes schools", past: "they changed schools", cap: "changes schools", kind: "school", d: { O: 2, N: 3, E: -2 }, pf: 0.3, len: 0, stop: "Settles in at the new school", min: 5 },
  mentor: { q: "What if a mentor took an interest in them?", txt: "A mentor takes an interest in them", past: "a mentor took an interest", cap: "a mentor takes an interest", kind: "school", d: { C: 5, O: 4, N: -2 }, pf: 0.7, len: 3, stop: "The mentor moves on", min: 8 },
  sport: { q: "What if they joined a team sport?", txt: "Joins a team sport", past: "they joined a team sport", cap: "joins a team sport", kind: "activity", d: { C: 4, E: 5, N: -3, A: 2 }, pf: 0.6, len: FOREVER, stop: "Stops the team sport", min: 4 },
  music: { q: "What if they learned an instrument?", txt: "Learns an instrument", past: "they learned an instrument", cap: "learns an instrument", kind: "activity", d: { C: 4, O: 4, N: -1 }, pf: 0.7, len: FOREVER, stop: "Stops playing the instrument", min: 4 },
  reading: { q: "What if they read every night?", txt: "Starts reading every night", past: "they started reading every night", cap: "reads every night", kind: "activity", d: { O: 5, C: 2, A: 1 }, pf: 0.8, len: FOREVER, stop: "Stops reading every night", min: 3 },
  screen: { q: "What if they got lots of screen time?", txt: "Lots of screen time every day begins", past: "lots of screen time began", cap: "lots of screen time begins", kind: "activity", d: { C: -5, N: 4, E: -2, O: -1 }, pf: 0.5, len: FOREVER, stop: "Screen time is cut back", min: 3 },
  nature: { q: "What if they spent lots of time outdoors?", txt: "Starts spending lots of time outdoors", past: "they started spending time outdoors", cap: "spends lots of time outdoors", kind: "activity", d: { N: -4, O: 3, C: 1 }, pf: 0.6, len: FOREVER, stop: "Stops spending so much time outdoors" },
  move: { q: "What if the family moved to another country?", txt: "The family moves to another country", past: "the family moved to another country", cap: "the family moves abroad", kind: "move", d: { O: 6, N: 4, E: -3 }, pf: 0.5, len: 0, stop: "The family moves back home" },
  volunteer: { q: "What if they started helping others (volunteering)?", txt: "Starts helping others as a volunteer", past: "they started volunteering", cap: "starts volunteering", kind: "move", d: { A: 5, E: 2, N: -1, C: 1 }, pf: 0.7, len: FOREVER, stop: "Stops volunteering", min: 8 },
  chores: { q: "What if they had real jobs to do at home?", txt: "Starts doing real jobs at home", past: "they got real jobs at home", cap: "gets real jobs at home", kind: "home", d: { C: 4, A: 1 }, pf: 0.7, len: FOREVER, stop: "No more jobs at home", min: 4 },
  dinners: { q: "What if the family ate dinner together every night?", txt: "The family starts eating dinner together every night", past: "the family started eating together every night", cap: "family dinners every night", kind: "home", d: { A: 2, N: -3, E: 1 }, pf: 0.6, len: FOREVER, stop: "Family dinners stop" },
  sleep: { q: "What if they always got enough sleep?", txt: "Starts getting enough sleep every night", past: "they started getting enough sleep", cap: "enough sleep every night", kind: "home", d: { N: -3, C: 2 }, pf: 0.5, len: FOREVER, stop: "Bedtimes get late again" },
  longhours: { q: "What if a parent started working very long hours?", txt: "A parent starts working very long hours", past: "a parent started working long hours", cap: "a parent works long hours", kind: "home", d: { N: 2, C: 1, A: -1 }, pf: 0.3, len: 3, stop: "The parent works normal hours again" },
  carer: { q: "What if they helped look after a younger brother or sister?", txt: "Starts helping look after a younger brother or sister", past: "they started helping with a younger sibling", cap: "helps look after a little one", kind: "home", d: { A: 4, C: 3, N: 1 }, pf: 0.7, len: FOREVER, stop: "Stops looking after the little one", min: 6 },
  language: { q: "What if they learned a second language?", txt: "Starts learning a second language", past: "they started learning a second language", cap: "learns a second language", kind: "school", d: { O: 5, C: 2 }, pf: 0.8, len: FOREVER, stop: "Stops learning the language", min: 3 },
  exam: { q: "What if they failed a big test?", txt: "Fails a big test", past: "they failed a big test", cap: "fails a big test", kind: "school", d: { N: 3, C: -1 }, pf: 0.2, len: 0, stop: "Gets over the failed test", min: 8 },
  fallout: { q: "What if they fell out with their best friend?", txt: "Falls out with their best friend", past: "they fell out with their best friend", cap: "falls out with a best friend", kind: "school", d: { N: 3, E: -2, A: -1 }, pf: 0.2, len: 0, stop: "Gets over falling out", min: 6 },
  leader: { q: "What if they were made class captain?", txt: "Is made class captain", past: "they were made class captain", cap: "becomes class captain", kind: "school", d: { E: 4, C: 3, N: -1 }, pf: 0.6, len: 1, stop: "Stops being class captain", min: 8 },
  firstlove: { q: "What if they had a first crush that didn't work out?", txt: "Has a first crush that doesn't work out", past: "they had a first crush that didn't work out", cap: "a first crush that doesn't work out", kind: "school", d: { N: 3, O: 1, E: -1 }, pf: 0.2, len: 0, stop: "Gets over the first crush", min: 13 },
  drama: { q: "What if they joined a drama club?", txt: "Joins a drama club", past: "they joined a drama club", cap: "joins a drama club", kind: "activity", d: { E: 5, O: 3, N: -2 }, pf: 0.6, len: FOREVER, stop: "Leaves the drama club", min: 6 },
  coding: { q: "What if they joined a coding or building club?", txt: "Joins a coding and building club", past: "they joined a coding club", cap: "joins a coding club", kind: "activity", d: { C: 4, O: 4, E: -1 }, pf: 0.7, len: FOREVER, stop: "Leaves the coding club", min: 7 },
  scouts: { q: "What if they joined scouts or a nature club?", txt: "Joins scouts", past: "they joined scouts", cap: "joins scouts", kind: "activity", d: { C: 3, E: 3, N: -2, O: 2 }, pf: 0.6, len: FOREVER, stop: "Leaves scouts", min: 6 },
  job: { q: "What if they got a weekend job?", txt: "Gets a weekend job", past: "they got a weekend job", cap: "gets a weekend job", kind: "activity", d: { C: 5, E: 2, N: -1 }, pf: 0.7, len: FOREVER, stop: "Stops the weekend job", min: 15 },
  countryside: { q: "What if the family moved to the countryside?", txt: "The family moves to the countryside", past: "the family moved to the countryside", cap: "the family moves to the countryside", kind: "move", d: { N: -3, O: -1, E: -1 }, pf: 0.5, len: 0, stop: "The family moves back to town" },
  travel: { q: "What if the family travelled for a year?", txt: "The family sets off to travel for a year", past: "the family travelled for a year", cap: "the family travels for a year", kind: "move", d: { O: 6, E: 2, C: -2 }, pf: 0.6, len: 1, stop: "The family comes home from travelling", min: 3 },
  prize: { q: "What if they won a big competition?", txt: "Wins a big competition", past: "they won a big competition", cap: "wins a big competition", kind: "luck", d: { N: -3, C: 2, E: 2 }, pf: 0.4, len: 0, stop: "The prize is a happy memory", min: 5 },
  summer: { q: "What if they had the best summer ever?", txt: "Has the best summer ever", past: "they had the best summer ever", cap: "the best summer ever", kind: "luck", d: { N: -4, E: 2, O: 2 }, pf: 0.3, len: 0, stop: "Summer ends", min: 3 },
};
export const CHANGE_GROUPS: [string, string[]][] = [
  ["Home", ["authoritative", "strict", "sibling", "divorce", "grandparent", "pet", "money", "illness", "chores", "dinners", "sleep", "longhours", "carer"]],
  ["School and friends", ["bullied", "bestfriend", "teacher", "newschool", "mentor", "language", "exam", "fallout", "leader", "firstlove"]],
  ["Activities", ["sport", "music", "reading", "screen", "nature", "drama", "coding", "scouts", "job"]],
  ["Big moves", ["move", "volunteer", "countryside", "travel"]],
  ["Good luck", ["prize", "summer"]],
];
export const CHANGE_IDS = CHANGE_GROUPS.flatMap(([, ids]) => ids);
/** Short labels for the stage chip ("Changed: …"). */
export const SHORT: Record<string, string> = {
  authoritative: "Warm and firm", strict: "Stricter", sibling: "A little sibling", divorce: "Parents separate", grandparent: "Grandparent moves in",
  pet: "A dog", money: "Money tight", illness: "A parent ill", bullied: "Bullied", bestfriend: "Best friend", teacher: "Great teacher",
  newschool: "New school", mentor: "A mentor", sport: "Team sport", music: "An instrument", reading: "Reading", screen: "Lots of screens",
  nature: "Outdoors", move: "Moves abroad", volunteer: "Volunteering",
  chores: "Jobs at home", dinners: "Family dinners", sleep: "Enough sleep", longhours: "Long work hours", carer: "Helps with a little one",
  language: "A second language", exam: "Failed a test", fallout: "Fell out with a friend", leader: "Class captain", firstlove: "First crush",
  drama: "Drama club", coding: "Coding club", scouts: "Scouts", job: "Weekend job", countryside: "Moves to the countryside", travel: "A year of travel",
  prize: "Wins a competition", summer: "Best summer ever",
};

/* ───────────── everyday ups and downs ───────────── */

export interface Everyday { id: string; from: number; to: number; rate: number; d: TraitDelta; pf: number; have: string }
/** Per-kid chances per year between ages `from` and `to`. Small effects that partly fade. */
export const EVERYDAY: Everyday[] = [
  { id: "house", from: 1, to: 60, rate: 0.045, d: { O: 2, N: 2, E: -1 }, pf: 0.3, have: "have moved house at least once" },
  { id: "sib", from: 1, to: 10, rate: 0.035, d: { A: 2, N: 1 }, pf: 0.5, have: "have a new little brother or sister" },
  { id: "arm", from: 4, to: 16, rate: 0.03, d: { N: 2, C: 1 }, pf: 0.1, have: "have broken an arm or a leg" },
  { id: "win", from: 6, to: 25, rate: 0.04, d: { N: -2, E: 2, C: 1 }, pf: 0.3, have: "have won something big, like a race or a prize" },
  { id: "friend", from: 6, to: 18, rate: 0.04, d: { E: -2, N: 2 }, pf: 0.2, have: "have had a close friend move away" },
  { id: "camp", from: 8, to: 16, rate: 0.08, d: { E: 2, O: 2, N: -1 }, pf: 0.4, have: "have been to summer camp" },
  { id: "pet", from: 3, to: 15, rate: 0.04, d: { A: 2, N: -1, C: 1 }, pf: 0.5, have: "have got a pet" },
  // change 0019: more everyday ups and downs
  { id: "bike", from: 3, to: 9, rate: 0.12, d: { C: 1, N: -1 }, pf: 0.3, have: "have learned to ride a bike" },
  { id: "team", from: 8, to: 17, rate: 0.04, d: { E: 2, C: 1, N: -1 }, pf: 0.4, have: "have made a school team" },
  { id: "holiday", from: 2, to: 18, rate: 0.06, d: { O: 2, N: -1 }, pf: 0.3, have: "have been on a family holiday far away" },
  { id: "play", from: 6, to: 16, rate: 0.03, d: { E: 2, O: 1 }, pf: 0.4, have: "have had a part in a school play" },
  { id: "glasses", from: 5, to: 16, rate: 0.02, d: { N: 1 }, pf: 0.1, have: "have got glasses" },
  { id: "visits", from: 1, to: 14, rate: 0.03, d: { A: 2, N: -1 }, pf: 0.5, have: "have a grandparent who visits often" },
  { id: "cousin", from: 5, to: 15, rate: 0.03, d: { E: 1, A: 1 }, pf: 0.3, have: "have had a cousin come to stay for a summer" },
];
export const EVERYDAY_MUL: Record<string, number> = { off: 0, normal: 1, lots: 2 };

/* ───────────── milestones ───────────── */

/** [age, stable text, once-key]. */
export const MILESTONES: [number, string, string][] = [
  [1, "First words: most kids start talking", "ms1"],
  [5, "Starts school", "ms5"],
  [7, "Most kids have a first best friend", "ms7"],
  [13, "The teenage years begin: moods go up and down", "ms13"],
  [18, "Finishes school", "ms18"],
  [20, "Many start a first job", "ms20"],
  [28, "Many settle down", "ms28"],
];
export const CALMER_AGAIN = "Most kids are calmer again after the teen years";
/** Ages when the timeline sums up everyday ups and downs. */
export const TALLY_AGES = [10, 18, 30];

/* ───────────── names ───────────── */

/** Neutral names, picked by kid index (deterministic). */
export const NAMES = [
  "Sam", "Alex", "Robin", "Jamie", "Charlie", "Taylor", "Jordan", "Riley", "Casey", "Morgan", "Avery", "Quinn", "Rowan", "Sasha", "Kai",
  "Noa", "Eli", "Ari", "Remy", "Jules", "Nico", "Rio", "Sky", "Billie", "Frankie", "Dani", "Kim", "Lee", "Max", "Toni",
  "Ashley", "Emery", "Reese", "Harper", "Sage", "Drew", "Finley", "Hayden", "Peyton", "Elliot",
];

/* ───────────── settings ───────────── */

/** "How much is inherited" → midparent weight h and the genes' share of differences between brothers and sisters. */
export const INHERIT: Record<string, number> = { "25": 0.25, "40": 0.4, "55": 0.55 };
export const LUCK: Record<string, number> = { small: 0.6, normal: 1, big: 1.5 };
/** How long effects last: [time scale of fading (years), how the lasting part changes]. */
export const FADE: Record<string, [tau: number, k: number]> = { fast: [4, -0.5], normal: [8, 0], stick: [14, 0.5] };
export const SIZE: Record<string, number> = { small: 0.6, medium: 1, big: 1.5 };
export const SIZE_WORD: Record<string, string> = { small: "a small", medium: "a medium", big: "a big" };

/* ───────────── words shared by the stage and the console ───────────── */

/** Words for one display value: "a bit curious", "very shy"… */
export const stepWord = (s: Show, v: number) => STEPS[s][stepOf(v)];
export const kidName = (j: number) => NAMES[(j * 7) % NAMES.length];
/** "very curious, a bit shy": the two strongest traits of a kid (for stage labels). */
export function kidShort(vs: number[]): string {
  const ext = SHOW.map((s, i) => [s, vs[i]] as [Show, number]).sort((x, y) => Math.abs(y[1] - 50) - Math.abs(x[1] - 50)).slice(0, 2);
  return ext.map(([s, x]) => stepWord(s, x)).join(", ");
}

/* ───────────── ripples, buffers, sensitive ages, combos (change 0019) ───────────── */

/**
 * Things that follow from a change, per kid: with chance `p`, between `delay` years after it, an extra small effect
 * (part lasts `pf`). `have` finishes "61 of 100 kids …". A ripple of a change that goes on only happens while it goes on.
 */
export interface Ripple { id: string; p: number; delay: [number, number]; d: TraitDelta; pf: number; have: string }
const R = (id: string, p: number, delay: [number, number], d: TraitDelta, pf: number, have: string): Ripple => ({ id, p, delay, d, pf, have });
export const RIPPLES: Record<string, Ripple[]> = {
  authoritative: [R("rules", 0.7, [0.5, 2], { N: -1, C: 1 }, 0.5, "knew what to expect at home")],
  strict: [R("quiet", 0.4, [0.5, 3], { E: -1, A: -1 }, 0.4, "started keeping things to themselves"), R("rules", 0.5, [0.5, 2], { C: 1 }, 0.5, "got very good at following rules")],
  sibling: [R("jealous", 0.4, [0, 1], { N: 2, A: -1 }, 0.1, "felt jealous at first"), R("close", 0.6, [3, 6], { A: 2, N: -1 }, 0.7, "became close to their little brother or sister"), R("carer", 0.4, [0.5, 3], { C: 2, A: 2 }, 0.5, "helped look after the baby")],
  divorce: [R("worried", 0.3, [0, 1], { N: 2 }, 0.1, "wondered for a while if it was their fault (it never is)"), R("twohomes", 0.7, [1, 3], { N: -2, C: 1 }, 0.5, "got used to two homes and two birthdays"), R("closer", 0.4, [0.5, 2], { A: 1, N: -1 }, 0.5, "got closer to one parent")],
  grandparent: [R("stories", 0.7, [0.3, 2], { O: 2, A: 1 }, 0.6, "heard lots of family stories"), R("cook", 0.4, [0.5, 3], { C: 2 }, 0.6, "learned to cook with their grandparent")],
  pet: [R("walks", 0.6, [0.2, 1], { C: 2, N: -1 }, 0.5, "walked the dog every day"), R("buddy", 0.5, [0.2, 1], { N: -2, A: 1 }, 0.5, "say the dog is their best friend")],
  money: [R("help", 0.5, [0.2, 1.5], { C: 2, A: 1 }, 0.5, "helped out more at home"), R("worry", 0.4, [0, 1], { N: 2 }, 0.2, "worried about money"), R("fewer", 0.5, [0, 1], { O: -1, E: -1 }, 0.2, "had fewer clubs and trips for a while")],
  illness: [R("care", 0.5, [0, 1], { A: 2, C: 1 }, 0.6, "helped care for the parent"), R("grownup", 0.4, [0.5, 1], { C: 1, N: 1 }, 0.4, "felt more grown-up")],
  bullied: [R("told", 0.6, [0.2, 1], { N: -2 }, 0.5, "told someone, and it got better"), R("hand", 0.4, [0.2, 1], { E: -2 }, 0.3, "stopped putting their hand up in class for a while"), R("kinder", 0.3, [1, 4], { A: 3 }, 0.7, "became kinder to kids who are left out")],
  bestfriend: [R("brave", 0.6, [0.2, 1], { E: 2, N: -1 }, 0.5, "felt braver at school"), R("adventures", 0.5, [0.5, 3], { O: 2 }, 0.4, "went on adventures together")],
  teacher: [R("subject", 0.6, [0.2, 1], { O: 2, C: 2 }, 0.7, "found a subject they love"), R("believe", 0.4, [0.5, 2], { N: -2, C: 1 }, 0.5, "started believing they could do hard things")],
  newschool: [R("friends", 0.5, [0.2, 1], { E: 2, N: -1 }, 0.4, "made new friends quickly"), R("miss", 0.5, [0, 0.5], { N: 1, E: -1 }, 0.1, "missed their old friends")],
  mentor: [R("goal", 0.6, [0.5, 2], { C: 3 }, 0.6, "found a goal to work towards"), R("try", 0.4, [0.5, 3], { O: 2, E: 1 }, 0.5, "tried things they never would have")],
  sport: [R("team", 0.6, [0.2, 1], { E: 3, A: 1, N: -1 }, 0.5, "made friends on the team"), R("injury", 0.1, [0.5, 4], { N: 2 }, 0.1, "got a sports injury and got better"), R("win", 0.4, [0.5, 3], { N: -2, C: 1 }, 0.3, "won a match they still talk about")],
  music: [R("concert", 0.5, [1, 4], { E: 2, N: -2, C: 1 }, 0.4, "played in a concert"), R("boring", 0.4, [0.5, 2], { C: -1 }, 0.1, "found practising boring for a while")],
  reading: [R("library", 0.5, [0.2, 1.5], { O: 2, C: 1 }, 0.5, "used their library card a lot"), R("write", 0.25, [1, 5], { O: 3 }, 0.5, "started writing their own stories")],
  screen: [R("sleep", 0.5, [0.2, 1], { N: 2, C: -1 }, 0.2, "slept less"), R("online", 0.3, [0.5, 3], { E: 1 }, 0.3, "made friends online"), R("game", 0.4, [0.5, 3], { C: 1, O: 1 }, 0.3, "got really good at a game")],
  nature: [R("names", 0.5, [0.5, 3], { O: 2 }, 0.6, "learned the names of birds and trees"), R("camping", 0.5, [0.3, 2], { N: -2, E: 1 }, 0.4, "went camping and loved it")],
  move: [R("language", 0.8, [0.5, 3], { O: 3, C: 1 }, 0.8, "learned the new language"), R("lonely", 0.5, [0, 0.5], { N: 3, E: -2 }, 0.1, "felt lonely the first year"), R("newbest", 0.5, [0.5, 2.5], { E: 2, N: -2 }, 0.4, "made a new best friend there")],
  chores: [R("proud", 0.6, [0.2, 1], { N: -1, C: 1 }, 0.5, "felt proud of a job well done"), R("moan", 0.5, [0, 1], { A: -1 }, 0.1, "moaned about chores (and did them anyway)")],
  dinners: [R("talk", 0.7, [0.2, 1], { E: 1, N: -1 }, 0.5, "talked about their day every evening"), R("food", 0.4, [0.3, 2], { O: 2 }, 0.5, "tried new foods at dinner")],
  sleep: [R("mornings", 0.7, [0.1, 0.5], { N: -1, C: 1 }, 0.3, "had easier mornings"), R("focus", 0.5, [0.2, 1], { C: 1 }, 0.4, "found it easier to focus at school")],
  longhours: [R("alone", 0.5, [0, 1], { O: 1, E: -1 }, 0.3, "spent more time on their own"), R("self", 0.4, [0.5, 2], { C: 2 }, 0.6, "learned to sort things out themselves"), R("miss", 0.5, [0, 1], { N: 1 }, 0.1, "missed their parent at bedtime")],
  carer: [R("patient", 0.5, [0.5, 2], { A: 2, N: -1 }, 0.6, "became very patient"), R("tired", 0.3, [0, 1], { N: 1 }, 0.1, "felt tired sometimes")],
  language: [R("films", 0.5, [0.5, 2], { O: 1 }, 0.5, "watched films in the new language"), R("penpal", 0.3, [1, 4], { E: 2 }, 0.5, "made a friend who speaks it")],
  exam: [R("again", 0.7, [0.2, 1], { N: -2, C: 2 }, 0.6, "tried again and passed"), R("badat", 0.3, [0, 1], { O: -1 }, 0.2, "decided they were bad at that subject for a while")],
  fallout: [R("makeup", 0.6, [0.1, 1], { A: 2, N: -2 }, 0.4, "made up again"), R("newfriends", 0.4, [0.5, 2], { E: 2 }, 0.4, "found new friends")],
  leader: [R("speech", 0.6, [0, 1], { E: 2, N: -1 }, 0.5, "gave a speech in front of the class"), R("resp", 0.5, [0.2, 1], { C: 2 }, 0.5, "felt more responsible")],
  firstlove: [R("songs", 0.5, [0, 0.5], { N: 1 }, 0.05, "listened to sad songs for a while"), R("stronger", 0.5, [0.5, 2], { N: -2 }, 0.5, "found out they can get through hard feelings"), R("friends", 0.6, [0, 0.5], { A: 1 }, 0.3, "were looked after by their friends")],
  drama: [R("stage", 0.6, [0.5, 2], { E: 2, N: -2 }, 0.5, "performed on a real stage"), R("feelings", 0.4, [0.5, 3], { A: 2 }, 0.6, "got good at understanding feelings")],
  coding: [R("game", 0.5, [0.5, 3], { O: 2, C: 1 }, 0.6, "made their own little game"), R("club", 0.5, [0.2, 1], { E: 1, N: -1 }, 0.4, "made friends who like the same things")],
  scouts: [R("badges", 0.6, [0.5, 3], { C: 2 }, 0.5, "earned lots of badges"), R("tent", 0.7, [0.2, 1], { N: -1, O: 1 }, 0.4, "slept in a tent for the first time")],
  job: [R("save", 0.5, [0.2, 1], { C: 2 }, 0.6, "saved up for something big"), R("talk", 0.6, [0.2, 1], { E: 2, N: -1 }, 0.5, "got used to talking to strangers")],
  countryside: [R("animals", 0.5, [0.3, 2], { A: 2, C: 1 }, 0.5, "looked after animals"), R("city", 0.4, [0.5, 2], { N: 1 }, 0.1, "missed the city sometimes"), R("outside", 0.7, [0.1, 1], { N: -2 }, 0.5, "played outside every day")],
  travel: [R("words", 0.6, [0.2, 1], { O: 2 }, 0.6, "picked up words in many languages"), R("homesick", 0.4, [0, 0.5], { N: 2 }, 0.05, "felt homesick sometimes"), R("anywhere", 0.5, [0.5, 1], { N: -2, O: 1 }, 0.6, "learned to feel at home anywhere")],
  prize: [R("told", 0.6, [0, 0.3], { E: 1 }, 0.3, "told everyone about it"), R("next", 0.4, [0.3, 2], { C: 2 }, 0.5, "started working towards the next prize")],
  summer: [R("memory", 0.8, [0.5, 1], { N: -1 }, 0.6, "still remember it as the best summer"), R("friends", 0.3, [0, 0.5], { E: 2, A: 1 }, 0.6, "made friends for life that summer")],
  volunteer: [R("thanks", 0.7, [0.2, 1], { A: 2, N: -1 }, 0.5, "were thanked by someone they helped"), R("lead", 0.2, [1, 4], { C: 2, E: 2 }, 0.5, "started leading other volunteers")],
};

/**
 * Things that protect: a hard change hurts less (× factor) if, when it happens, `by` is there — another change still
 * going on, or a home setting ("style:authoritative" also counts a switch to warm and firm). Factors multiply (floor 0.4).
 */
export interface Buffer { protects: string; by: string; factor: number; why: string }
export const BUFFERS: Buffer[] = [
  { protects: "bullied", by: "bestfriend", factor: 0.6, why: "Having a best friend made being bullied hurt less" },
  { protects: "bullied", by: "school:great", factor: 0.8, why: "Great teachers stepped in, so being bullied hurt less" },
  { protects: "bullied", by: "home:stable", factor: 0.85, why: "A calm home helped them get through being bullied" },
  { protects: "divorce", by: "style:authoritative", factor: 0.7, why: "Warm, firm parents made the separation easier" },
  { protects: "money", by: "style:authoritative", factor: 0.8, why: "Warm, firm parents kept money worries from hurting too much" },
  { protects: "money", by: "grandparent", factor: 0.85, why: "A grandparent at home helped when money was tight" },
  { protects: "illness", by: "grandparent", factor: 0.75, why: "A grandparent at home helped while the parent was ill" },
  { protects: "move", by: "sibling", factor: 0.85, why: "Moving with a brother or sister was easier" },
  { protects: "newschool", by: "sport", factor: 0.85, why: "Their team helped them settle in at the new school" },
  { protects: "screen", by: "reading", factor: 0.8, why: "Reading every night balanced the screen time" },
  { protects: "screen", by: "screens:strict", factor: 0.8, why: "Clear screen rules kept screen time from taking over" },
  { protects: "screen", by: "sleep", factor: 0.85, why: "Enough sleep kept screens from making them tired" },
  { protects: "exam", by: "teacher", factor: 0.7, why: "A great teacher helped them get over the failed test" },
  { protects: "exam", by: "sleep", factor: 0.85, why: "Enough sleep helped them bounce back from the failed test" },
  { protects: "fallout", by: "pet", factor: 0.85, why: "Cuddling the dog helped after falling out with their friend" },
  { protects: "firstlove", by: "bestfriend", factor: 0.7, why: "A best friend helped them through the first heartbreak" },
  { protects: "firstlove", by: "dinners", factor: 0.85, why: "Family dinners gave them someone to talk to" },
  { protects: "longhours", by: "grandparent", factor: 0.8, why: "A grandparent at home helped while a parent worked long hours" },
  { protects: "longhours", by: "shape:big", factor: 0.8, why: "A big family under one roof helped while a parent worked long hours" },
  { protects: "illness", by: "shape:big", factor: 0.8, why: "The big family helped while the parent was ill" },
  { protects: "money", by: "shape:big", factor: 0.85, why: "The big family shared what they had when money was tight" },
  { protects: "bullied", by: "time:lots", factor: 0.85, why: "Lots of family time meant they could talk about the bullying" },
];
export const BUFFER_FLOOR = 0.4;

/** Sensitive ages: each change matters most between these ages (× 1.2), less far from them (down to × 0.7). */
export const AGES: Record<string, [number, number]> = {
  authoritative: [2, 12], strict: [2, 12], sibling: [2, 6], divorce: [6, 14], grandparent: [3, 12], pet: [5, 12], money: [6, 16],
  illness: [6, 16], bullied: [9, 15], bestfriend: [6, 13], teacher: [7, 16], newschool: [10, 15], mentor: [12, 18], sport: [6, 14],
  music: [5, 12], reading: [4, 10], screen: [8, 16], nature: [4, 12], move: [11, 15], volunteer: [12, 18],
  chores: [6, 14], dinners: [3, 14], sleep: [2, 12], longhours: [2, 10], carer: [8, 16], language: [3, 10], exam: [12, 18],
  fallout: [8, 15], leader: [9, 16], firstlove: [14, 18], drama: [8, 16], coding: [9, 16], scouts: [7, 14], job: [15, 18],
  countryside: [4, 12], travel: [8, 14], prize: [6, 16], summer: [6, 14],
};
export function ageWeight(id: string, age: number): number {
  const w = AGES[id];
  if (!w) return age < 18 ? 1 : 0.6;
  const d = age < w[0] ? w[0] - age : age > w[1] ? age - w[1] : 0;
  return 0.7 + 0.5 * Math.exp(-((d / 4) ** 2));
}
/** "strongest around 11–15" for a change. */
export const bestAges = (id: string) => (AGES[id] ? `strongest around ${AGES[id][0]}–${AGES[id][1]}` : "");

/** Two changes that go on at the same time add a little extra together (from when both are there, while both go on). */
export interface Combo { a: string; b: string; d: TraitDelta; pf: number; txt: string }
export const COMBOS: Combo[] = [
  { a: "sport", b: "bestfriend", d: { E: 2, N: -1 }, pf: 0.6, txt: "Team sport and a best friend: they played on the team together" },
  { a: "reading", b: "teacher", d: { O: 2, C: 1 }, pf: 0.6, txt: "Reading every night and a great teacher: they started loving to learn" },
  { a: "music", b: "mentor", d: { C: 2, N: -1 }, pf: 0.6, txt: "An instrument and a mentor: practice started to pay off" },
  { a: "move", b: "bestfriend", d: { N: -2, E: 1 }, pf: 0.5, txt: "A new country and a best friend: settling in got easier" },
  { a: "pet", b: "nature", d: { N: -1, C: 1 }, pf: 0.6, txt: "A dog and time outdoors: long walks every day" },
  { a: "volunteer", b: "grandparent", d: { A: 2 }, pf: 0.6, txt: "Volunteering and a grandparent at home: helping became a habit" },
  { a: "screen", b: "nature", d: { N: -1, C: 1 }, pf: 0.5, txt: "Screens and time outdoors: the outdoors balanced the screens" },
  { a: "sibling", b: "authoritative", d: { A: 2, N: -1 }, pf: 0.6, txt: "A little sibling and warm, firm parents: the kids got along well" },
  { a: "drama", b: "leader", d: { E: 2, N: -1 }, pf: 0.6, txt: "Drama club and being class captain: speaking up got easy" },
  { a: "coding", b: "mentor", d: { C: 2, O: 1 }, pf: 0.6, txt: "A coding club and a mentor: they built something real" },
];

/* ───────────── in everyday life (change 0019) ───────────── */

/**
 * What the traits look like day to day: "out of 100 kids, how many are likely to …" (`kid` before 18, `grown` after).
 * `key` is the metric key; a behaviour with two traits uses their average. Phrased as "likely to", never a diagnosis.
 */
export interface Behaviour { key: string; traits: Show[]; kid: string; grown: string }
export const BEHAVIOURS: Behaviour[] = [
  { key: "b_hand", traits: ["E"], kid: "put their hand up in class", grown: "speak up in a group" },
  { key: "b_tidy", traits: ["C"], kid: "keep their room tidy", grown: "keep their home tidy" },
  { key: "b_food", traits: ["O"], kid: "try a food they've never had", grown: "try a food they've never had" },
  { key: "b_help", traits: ["A"], kid: "help a new kid at school", grown: "help a new neighbour" },
  { key: "b_calm", traits: ["Calm"], kid: "stay calm before a test", grown: "stay calm before a big day" },
  { key: "b_proj", traits: ["C", "Calm"], kid: "finish a long school project", grown: "finish a long project" },
];
export const behaviourWord = (b: Behaviour, age: number) => (age < 18 ? b.kid : b.grown);

/** What the five words mean, with two everyday examples each (the glossary, change 0019). */
export const GLOSSARY: Record<Show, [meaning: string, examples: [string, string]]> = {
  O: ["Loves new ideas, places and things to try.", ["asks lots of \"why?\" questions", "wants to taste the strange new fruit"]],
  C: ["Keeps things in order and finishes what they start.", ["packs their school bag the night before", "does homework before playing"]],
  E: ["Gets energy from being with people.", ["talks to the new kid first", "loves a big birthday party"]],
  A: ["Cares about others and likes to get along.", ["shares the last biscuit", "helps a friend who fell over"]],
  Calm: ["Stays steady when things go wrong.", ["sleeps fine the night before a test", "shrugs off a lost game"]],
};
