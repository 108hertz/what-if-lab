import {
  BEHAVIOURS, BUFFERS, CALMER_AGAIN, CHANGES, CHANGE_GROUPS, COMBOS, ENDS, EVERYDAY, GLOSSARY, HOME_OPTIONS, MILESTONES, MORE, PHRASE, RIPPLES,
  SCIENCE, SHOW, STEPS, TRACK, WORD,
} from "./data";

/**
 * English words of the child world (change 0025), built here from the data so the English stays where it is. Shared by
 * the sim (event keys, story, kid lines), the stage, the chart and the console parts. Other languages override them from
 * worlds/child/locales/<code>.json.
 *
 *   ev.ms.<key>          milestones            ev.calm             calmer after the teen years
 *   ev.change.<id>       a change happens      ev.stop.<id>        it is stopped        ev.already  style already in use
 *   ev.buffer.<i>        a buffer softened it  ev.combo.<i>        two changes together
 *   ev.ripple.<id>.<r>   "After …, {n} of 100 kids …"   chip.ripple.<id>.<r>  the same without "After …," (stage chips)
 *   ev.tally.<id>        "By {age}, {n} of 100 kids …"
 *   trait.<s> traitLc.<s> science.<s> ends|track|step|more|phrase.<s>.<i>  gloss.<s> glossEx.<s>.<i>   the five traits
 *   ch.<id>.q|past|cap   a change           have.<id>.<r>  a ripple    home.<id>.help.<v>  a home option's help
 *   beh.<key>.kid|grown  everyday things    group.<i>  life.<i>  kind.<k>  story.*  kid.*  chart.*  stage.*  ui.*  tl.*
 */
export const ALREADY = "The parents were already raising them this way";

/** "{d, select, bit {a bit X} much {much X} other {X}}": a comparative with how much (d = bit | plain | much). */
const deg = (x: string) => `{d, select, bit {a bit ${x}} much {much ${x}} other {${x}}}`;

export const MESSAGES: Record<string, string> = {
  ...Object.fromEntries(MILESTONES.map(([, txt, key]) => [`ev.ms.${key}`, txt])),
  "ev.calm": CALMER_AGAIN,
  "ev.already": ALREADY,
  ...Object.fromEntries(Object.entries(CHANGES).flatMap(([id, c]) => [
    [`ev.change.${id}`, c.txt], [`ev.stop.${id}`, c.stop], [`ch.${id}.q`, c.q], [`ch.${id}.past`, c.past], [`ch.${id}.cap`, c.cap],
  ])),
  ...Object.fromEntries(BUFFERS.map((b, i) => [`ev.buffer.${i}`, b.why])),
  ...Object.fromEntries(COMBOS.map((c, i) => [`ev.combo.${i}`, c.txt])),
  ...Object.fromEntries(Object.entries(RIPPLES).flatMap(([id, rs]) => rs.flatMap((R, r) => [
    [`ev.ripple.${id}.${r}`, `After ${CHANGES[id].past} at {age}, {n} of 100 kids ${R.have}`],
    [`chip.ripple.${id}.${r}`, `{n} of 100 kids ${R.have}`],
    [`have.${id}.${r}`, R.have],
  ]))),
  ...Object.fromEntries(EVERYDAY.map((e) => [`ev.tally.${e.id}`, `By {age}, {n} of 100 kids ${e.have}`])),

  // The five traits
  ...Object.fromEntries(SHOW.flatMap((s) => [
    [`trait.${s}`, WORD[s]], [`traitLc.${s}`, WORD[s].toLowerCase()], [`science.${s}`, SCIENCE[s]], [`gloss.${s}`, GLOSSARY[s][0]],
    ...GLOSSARY[s][1].map((x, i) => [`glossEx.${s}.${i}`, x]),
    ...ENDS[s].map((x, i) => [`ends.${s}.${i}`, x]),
    ...TRACK[s].map((x, i) => [`track.${s}.${i}`, x]),
    ...STEPS[s].map((x, i) => [`step.${s}.${i}`, x]),
    ...MORE[s].map((x, i) => [`more.${s}.${i}`, deg(x)]),
    ...PHRASE[s].map((x, i) => [`phrase.${s}.${i}`, x]),
  ])),
  ...Object.fromEntries(HOME_OPTIONS.flatMap(([id, , opts]) => opts.map(([v, , help]) => [`home.${id}.help.${v}`, help]))),
  ...Object.fromEntries(BEHAVIOURS.flatMap((b) => [[`beh.${b.key}.kid`, b.kid], [`beh.${b.key}.grown`, b.grown]])),
  ...Object.fromEntries(CHANGE_GROUPS.map(([g], i) => [`group.${i}`, g])),
  ...Object.fromEntries(["Little years", "School years", "Teen years", "First home", "Own home"].map((x, i) => [`life.${i}`, x])),
  "cmp.more": deg("more"), "cmp.less": deg("less"),

  // Families, ages and lengths
  "name.own": "Your own family",
  "name.ownFrom": "Your own family (based on {from})",
  "time.age": "Age {n}",
  "len.good": "for good", "len.once": "just once", "len.year": "for about a year", "len.years": "for about {n} years",
  "ui.bestAges": "strongest around {a}–{b}",

  // The story ("What is happening" / "What changed")
  "story.top": "Age {age}: most of these 120 kids are {list}.",
  "story.middle": "Age {age}: most of these 120 kids are somewhere in the middle on every trait.",
  "story.differ": "They still differ a lot: {hi} of 100 are {high}, while {lo} are {low}.",
  "story.differCalm": "They still differ a lot: {hi} of 100 are {high}, while {lo} worry a lot.",
  "story.siblings": "Brothers and sisters still differ: each gets a different mix of genes and different luck.",
  "story.style.authoritative": "Warm and firm parents help most kids feel calmer and get organised.",
  "story.style.authoritarian": "Strict parents make most kids a bit more organised, but also more worried.",
  "story.style.permissive": "Easy-going parents: kids tend to be more outgoing, but less organised.",
  "story.style.neglectful": "With distant parents, many kids worry more and are less organised.",
  "story.compared": "Compared with the same kids with no changes, at {age}:",
  "story.they": "they are {list}.",
  "story.theySame": "they are about the same so far.",
  "story.when": "When {past} at {at}, most kids became {effect}{fade}{rip}.",
  "story.fade.stopped": ", until it stopped at {n}",
  "story.fade.bounced": ", then most bounced back",
  "story.fade.faded": ", and much of it faded later",
  "story.rip": ", and {n} of 100 {have}",
  "story.sentence": "{s}.",
  "story.planned": "Planned for age {age}: {cap}.",
  "story.little": "Little kids already differ: some are bold, some are careful.",
  "story.teen": "The teenage years: worries go up and tidiness dips for a while. That is normal.",
  "story.settled": "By now personality has mostly settled. It keeps changing slowly all through life.",
  "eff.same": "about the same",

  // One kid in a line ("Sam, 12: curious about everything and loves being with people, sometimes worries.")
  "kid.line": "{name}, {age}: {body}.",
  "kid.three": "{a} and {b}, {c}",
  "kid.between": "in between on most things",
  "kid.betweenMore": "in between on most things, a little more {trait}",
  "kid.betweenLess": "in between on most things, a little less {trait}",
  "kid.short": "{a}, {b}",

  // The chart
  "chart.view.0": "Now", "chart.view.1": "Growing up", "chart.view.2": "Every day", "chart.view.3": "What mattered",
  "chart.viewLabel": "Chart view",
  "chart.whichTrait": "Which trait",
  "chart.life.0": "little", "chart.life.1": "school", "chart.life.2": "teen", "chart.life.3": "young adult", "chart.life.4": "grown-up",
  "chart.pressPlay": "Press play to watch them grow up…",
  "chart.of100": "{n} of 100",
  "chart.was": "was {n}",
  "chart.whyEmpty": "Make a change to see how much it matters here.",
  "chart.axis": "← less {trait}  ·  how much kids differ anyway  ·  more →",
  "chart.hardly": "hardly any",
  "chart.ongoing": "going on", "chart.faded": "mostly faded", "chart.still": "still there",
  "chart.rowWord": "{word} · {state}",
  "chart.rowChange": "{name} · {age}",
  "chart.rowCombo": "{a} + {b}",
  "chart.nowDiff": "With your changes, at {age} {who, select, most {most kids} other {these kids}} are {list}.",
  "chart.stayedSame": "{list} stayed about the same.",
  "chart.planned": "Your change is planned for later.",
  "chart.sameSoFar": "With your changes these kids are about the same so far (age {age}).",
  "chart.nowIntro": "Each faint mark is one of the 120 kids; the big dot is {who}. Try a change to compare.",
  "chart.typical": "the typical kid",
  "chart.atDiff": "At {age} ({life} years): with your changes most kids are {list}.",
  "chart.atSame": "At {age} ({life} years): about the same as without your changes.",
  "chart.atTypical": "At {age} ({life} years): the typical kid is {step}.",
  "chart.growIntro": "Each row is one trait over the years; the band is where most kids are. Point at an age to read it.",
  "chart.dayDiff": "With your changes, {count} kids are likely to {what} (was {was}).",
  "chart.dayLittle": "So far your changes make little difference to everyday life.",
  "chart.dayIntro": "Out of 100 kids like these, how many are likely to do each thing. A likely thing, not a sure one.",
  "chart.whyOngoing": "{change} made the biggest difference to {trait}, and it is still going on.",
  "chart.whyFaded": "{change} made the biggest difference to {trait}, but most of it has faded.",
  "chart.whyLasted": "{change} made the biggest difference to {trait}, and it lasted.",
  "chart.whyIntro": "How much each change moved {trait}, next to how much kids differ anyway.",
  "chart.aria.0": "Where {who} is on each trait among all 120 kids",
  "chart.aria.1": "Curious, organised, outgoing, kind and calm over the years",
  "chart.aria.2": "Out of 100 kids, how many are likely to do each everyday thing",
  "chart.aria.3": "How much each change moved {trait}",

  // The stage
  "stage.age": "Age {age} — {cap}",
  "stage.planned": "Planned for age {age} — {cap}",
  "stage.typical": "The typical kid of the 120",
  "stage.oneOf": "{name}, one of the 120",
  "stage.with": "with your changes",
  "stage.without": "without",
  "stage.between": "in between",
  "stage.of100": "{n} of 100",
  "stage.was": "was {n}",
  "stage.crowdHint": "{trait} · each face is one possible kid · tap one to meet them",
  "stage.hover": "{name}: {short} · tap to meet",
  "stage.view": "What the stage shows",
  "stage.one": "One child",
  "stage.all": "All 120 kids",
  "stage.pileTrait": "Which trait the piles show",
  "stage.back": "Back to the typical kid",

  // The console parts
  "ui.askTabs": "Ask",
  "ui.tab.changes": "Changes",
  "ui.tab.family": "Family",
  "ui.pickFamily": "Pick a family",
  "ui.parents": "The parents",
  "ui.parentsNote": "Each kid gets a different mix of the two parents. Changing the family starts again.",
  "ui.done": "Done",
  "ui.edit": "Edit",
  "ui.nowAge": "Now (age {n})",
  "ui.atAge": "At age {n}",
  "ui.atAgePast": "At age {n} (already past: now)",
  "ui.nextAt": "Your next click happens at age {n}.",
  "ui.nextNow": "Your next click happens now.",
  "ui.usualLen": "Each change lasts as long as it usually does.",
  "ui.things": "Things that can happen",
  "ui.thingsHint": "They add up. Pick when, how big and how long, then click.",
  "ui.changesEmpty": "Every change you make lands here with a tick, so you can take it out and put it back.",
  "ui.plannedFor": "{name} · planned for {n}",
  "ui.made": "{n} made",
  "ui.toTry": "{n} to try",
  "ui.usually": "Usually: {what}",
  "ui.fromAge": "from {n}",
  "ui.ages": "ages {list}",
  "ui.age": "age {n}",
  "ui.madeTimes": "made {n} times",
  "ui.rulerEmpty": "Your changes will appear here, on a line from birth to 18.",
  "ui.yourChanges": "Your changes",
  "ui.rulerLabel": "{cap}, age {age}, {len}",
  "ui.rulerLabelPlanned": "{cap}, age {age}, {len}, planned: arrow keys move it",
  "ui.rulerPanel": "{name} · age {age} · {len} · {state}",
  "ui.state.planned": "planned", "ui.state.stopped": "stopped at {n}", "ui.state.going": "going on", "ui.state.over": "over",
  "ui.earlier": "Earlier", "ui.later": "Later", "ui.earlierAria": "One year earlier", "ui.laterAria": "One year later",
  "ui.stopNow": "Stop now", "ui.undo": "Undo",
  "ui.glossTitle": "What do the five words mean?",
  "ui.glossLine": "{meaning} For example, a kid who {a}, or {b}.",
  "ui.whatChanged": "What changed",
  "ui.happening": "What is happening",
  "ui.meet": "Meet the child",
  "ui.kidAge": "{name}, age {age}",
  "ui.mostTypical": "The most typical kid",
  "ui.kidN": "Kid #{n} of 120",
  "ui.another": "Meet another one",
  "ui.meetNote": "Same parents, same home, and still each kid is different.",
  "ui.whyTitle": "Why are these kids different?",
  "ui.whyIntro": "Of all the differences between these 120 brothers and sisters, how much comes from each part:",
  "part.genes": "Genes", "part.home": "Home", "part.life": "Life events", "part.chance": "Chance",
  "partLc.genes": "genes", "partLc.home": "home", "partLc.life": "life events", "partLc.chance": "chance",
  "part.pct": "{part} {n} %",
  "ui.whyBar": "{trait}: {list}",
  "ui.whyNote": "Genes: each kid gets a different mix from the parents. Home: the same home affects kids a bit differently. Life events: your changes and everyday ups and downs. Chance: everything else.",
  "ui.science": "About the science",
  "ui.science1": "Scientists often describe personality with five traits, called the Big Five. Here they have plain names:",
  "ui.scienceItem": "{trait} is {science}: from “{a}” to “{b}”.",
  "ui.science2": "The numbers are rough and research-inspired, not exact. They describe averages, not destiny: real kids are not predicted by a model.",
  "ui.variables": "Variables",
  "ui.tuneNote": "Nature and chance settings start the world again. Change settings apply to your next click.",

  // The timeline
  "tl.all": "All", "tl.changes": "Changes", "tl.effects": "Effects", "tl.growing": "Growing up",
  "tl.label": "Show in the timeline",
  "tl.both": "Both", "tl.base": "Only with no changes", "tl.alt": "Only with your changes",
  "tl.noneKind": "Nothing of this kind yet.",
  "tl.none": "Nothing yet. Press play, or try a change.",
  "kind.milestone": "milestone", "kind.home": "home", "kind.school": "school", "kind.activity": "activity", "kind.move": "big move",
  "kind.everyday": "everyday", "kind.change": "change", "kind.ripple": "what followed", "kind.together": "together", "kind.luck": "good luck",
};

export const childWords = { key: "child", messages: MESSAGES } as const;
