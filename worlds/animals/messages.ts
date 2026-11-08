import { FOOD_NAME, READY, READY_GROUPS, SPECIES, SPECIES_GROUPS } from "./data";

/**
 * English words of the animals world (change 0025), built from the data so the English stays where it is. Shared by the
 * sim (event keys, story, caption, questions), the stage chips, the chart and the console parts. Other languages
 * override them from worlds/animals/locales/<code>.json.
 *
 *   sp.<id>.one|many|coat|name|pl|where|social|food|life|role   a species (latin names are not translated)
 *   food.<habitat>  world.<id>  worldGroup.<i>  worldOpt.<id>  spGroup.<i>  group.<i> (what-if groups)
 *   ev.*  why.<i>  q.<id> (change questions)  story.*  cap.* (portrait caption)  chart.*  ui.*  stage.*
 */
export const WHY = ["were caught", "went hungry", "found the weather too hard", "grew old", "were hunted by people"];

/** What-if groups for the change list; their names are `group.<i>`. */
export const WHATIF_GROUPS: [string, string[]][] = [
  ["Animals", ["remove", "add", "disease", "invasive"]],
  ["Climate", ["warm", "cool", "drought", "rain", "fire"]],
  ["People", ["habitat", "reserve", "hunt", "move"]],
];

const SP_FIELDS = ["one", "many", "coat", "name", "pl", "where", "social", "food", "life", "role"] as const;

export const MESSAGES: Record<string, string> = {
  ...Object.fromEntries(Object.values(SPECIES).flatMap((s) => SP_FIELDS.map((f) => [`sp.${s.id}.${f}`, s[f]]))),
  ...Object.fromEntries(Object.entries(FOOD_NAME).map(([h, f]) => [`food.${h}`, f])),
  ...Object.fromEntries(Object.entries(READY).map(([id, r]) => [`world.${id}`, r.name])),
  ...Object.fromEntries(READY_GROUPS.flatMap(([g, opts], i) => [[`worldGroup.${i}`, g], ...opts.map(([id, l]) => [`worldOpt.${id}`, l])])),
  ...Object.fromEntries(SPECIES_GROUPS.map(([g], i) => [`spGroup.${i}`, g])),
  ...Object.fromEntries(WHATIF_GROUPS.map(([g], i) => [`group.${i}`, g])),
  ...Object.fromEntries(WHY.map((x, i) => [`why.${i}`, x])),
  "name.own": "Your own world",
  "name.ownFrom": "Your own world (based on {from})",
  "time.day": "Day {n}",

  // Timeline events
  "ev.wanders": "A pair of {many} wanders in from outside",
  "ev.out": "The {many} have died out here: most {why}",
  "ev.boom": "{one} numbers have doubled",
  "ev.faster": "Natural selection: the average {one} is now 20% faster",
  "ev.slower": "Natural selection: {many} get slower to save energy",
  "ev.bigger": "{many} grow 20% bigger on average",
  "ev.smaller": "{many} shrink on average",
  "ev.thinner": "Coats get thinner: {many} now have 20% less {coat}",
  "ev.thicker": "Coats get thicker: {many} now have 20% more {coat}",
  "ev.senses": "{many} now notice food and danger 20% farther away",
  "ev.removed": "All {many} removed",
  "ev.noneToRemove": "There are no {many} here to take away",
  "ev.noRoom": "There is no room for a sixth kind of animal",
  "ev.invasive": "{n} fast-breeding {many} arrive",
  "ev.add": "{n} {many} move in",
  "ev.disease": "Disease outbreak kills {n} {many}",
  "ev.warm": "Climate warms 3 °C: more energy needed, less food",
  "ev.cool": "An ice age begins: 4 °C colder, less food",
  "ev.drought": "The rain stops for a year: food halves",
  "ev.rain": "Years of good rain begin: food grows faster",
  "ev.fire": "A wildfire burns a third of the land",
  "ev.habitat": "Half the habitat is lost to farms and roads",
  "ev.reserve": "Protected reserve: hunting stops, vegetation recovers",
  "ev.hunt": "People start hunting the {many}",
  "ev.move": "Moved to the opposite climate: everything costs far more energy",

  // The question each change asks
  "q.remove": "What if the {many} disappeared?",
  "q.add": "What if {many} moved in?",
  "q.addMore": "What if more {many} moved in?",
  "q.disease": "What if a sickness spread among the {many}?",
  "q.invasive": "What if a fast-breeding newcomer arrived?",
  "q.warm": "What if it got 3 °C warmer?",
  "q.cool": "What if an ice age began?",
  "q.drought": "What if it stopped raining for a year?",
  "q.rain": "What if there were years of good rain?",
  "q.fire": "What if a wildfire burned a third of the land?",
  "q.habitat": "What if half the land became farms and roads?",
  "q.reserve": "What if it became a protected reserve?",
  "q.hunt": "What if people hunted the {many}?",
  "q.move": "What if they were moved to the opposite climate?",

  // The story ("What is happening" / "What changed")
  "story.count": "{n, plural, one {# {one}} other {# {many}}}",
  "story.live": "Day {day}: {list} live here.",
  "story.noneLeft": "Day {day}: no animals are left here.",
  "story.compared": "Compared with the same place with no change, on day {day}:",
  "story.diff": "There {be, select, is {is} other {are}} {list}.",
  "story.more": "{n, plural, one {# more {one}} other {# more {many}}}",
  "story.fewer": "{n, plural, one {# fewer {one}} other {# fewer {many}}}",
  "story.same": "The numbers of animals are the same so far.",
  "story.multiplied": "With no {hunter} to chase them, the {prey} multiplied.",
  "story.hungry": "Then they ate the {food} faster than it grew, and many went hungry.",
  "story.lessToEat": "With no {prey} left to catch, the {hunter} have less to eat.",
  "story.weather": "The {heat, select, hot {hotter} other {colder}} weather is hard on the {many}: they burn more food just to keep going.",
  "story.lessFood": "With less {food} to go round, there is room for fewer animals.",
  "story.moreFood": "More {food} means more babies survive.",
  "story.hunting": "People hunting take many {many}.",
  "story.newcomersFailed": "The {many} that moved in could not survive here: most {why}.",
  "story.diedOut": "The {many} died out: most {why}.",
  "story.diedOutChanged": "The {many} died out: most {why}, which did not happen without your changes.",
  "story.runsShort": "There are so many plant-eaters that the {food} runs short.",
  "story.catch": "The {hunter} mostly catch {prey}; the {prey} hide in the {cover} to stay safe.",
  "cover.water": "kelp and rocks",
  "cover.land": "bushes",
  "cmp.change": "than without your changes",
  "cmp.day0": "than on day 0",
  "story.faster": "{many} are {n}% faster {cmp}: the quick ones get away more often and have more babies.",
  "story.fasterFood": "{many} are {n}% faster {cmp}: the quick ones reach food first.",
  "story.slower": "{many} are {n}% slower {cmp}: moving slowly saves energy.",
  "story.bigger": "{many} are {n}% bigger {cmp}.",
  "story.biggerSafe": "{many} are {n}% bigger {cmp}: big ones are harder to catch.",
  "story.smaller": "{many} are {n}% smaller {cmp}: small bodies need less food.",
  "story.coatMore": "{many} have {n}% more {coat} {cmp}: it keeps them warm.",
  "story.coatLess": "{many} have {n}% less {coat} {cmp}: it keeps them cool.",
  "story.sensesMore": "{many} notice food and danger {n}% farther away {cmp}.",
  "story.sensesLess": "{many} notice {n}% less {cmp}: big eyes and ears cost energy.",
  "story.giveTime": "Give it time: many changes show up only after a few generations.",
  "story.pick": "Pick a change to see what would be different.",

  // The portrait caption
  "cap.none": "No {many} live here right now.",
  "cap.faster": "{n}% faster", "cap.slower": "{n}% slower", "cap.bigger": "{n}% bigger", "cap.smaller": "{n}% smaller",
  "cap.earsMore": "ears bigger (notices more)", "cap.earsLess": "ears smaller (notices less)",
  "cap.eyesMore": "eyes bigger (notices more)", "cap.eyesLess": "eyes smaller (notices less)",
  "cap.coatThicker": "{coat} thicker", "cap.coatThinner": "{coat} thinner",
  "cap.now": "Now {list}.",
  "cap.same": "About the same as on day 0. Bodies change over many generations.",

  // The chart
  "chart.view": "Chart view",
  "chart.counts": "How many of each",
  "chart.bodies": "How their bodies changed",
  "chart.whichAnimal": "Which animal",
  "chart.unitAnimals": "animals",
  "chart.unitDay0": "× day 0",
  "chart.changes": "CHANGES",
  "chart.withChanges": "WITH CHANGES",
  "chart.noChange": "NO CHANGE",
  "chart.label": "{name} {n}",
  "trait.sp": "Speed", "trait.sz": "Size", "trait.se": "Senses", "trait.co": "Coat",
  "chart.ariaCounts": "How many of each animal over time",
  "chart.ariaBodies": "Speed, size, senses and coat of the {many} over time",
  "chart.diff": "With your changes there {be, select, is {is} other {are}} {list} than without them (day {day}).",
  "chart.same": "With your changes the numbers are the same as without them so far (day {day}).",
  "chart.intro": "How many of each animal live here, day by day. Make a change to compare with this world.",
  "chart.bodyVs": "The typical {one} with your changes is {speed} without them, and {size}.",
  "chart.asFast": "as fast as", "chart.fasterThan": "{n}% faster than", "chart.slowerThan": "{n}% slower than",
  "chart.sameSize": "the same size", "chart.bigger": "{n}% bigger", "chart.smaller": "{n}% smaller",
  "chart.bodyDay0": "The typical {one} compared with day 0: 1.00× means no change, above 1 means more (faster, bigger, sharper senses, thicker {coat}).",

  // The console parts
  "ui.pickWorld": "Pick a world",
  "ui.who": "Who lives here",
  "ui.far": "Far from home",
  "ui.farHere": "Far from home here",
  "ui.atStart": "{many} at the start",
  "ui.fewer": "Fewer {many} at the start",
  "ui.more": "More {many} at the start",
  "ui.takeOut": "Take {many} out of this world",
  "ui.takeOutShort": "Take {many} out",
  "ui.needOne": "A world needs at least one animal",
  "ui.fiveMost": "Five is the most",
  "ui.addAnimal": "Add an animal",
  "ui.restart": "Changing who lives here starts the world again.",
  "ui.changesHint": "They add up. Click one again to make it stronger.",
  "ui.target": "Changes to one animal use",
  "ui.newcomer": "Who could move in",
  "ui.livesHere": "{name} (lives here)",
  "ui.whatChanged": "What changed",
  "ui.happening": "What is happening",
  "ui.rightNow": "Right now",
  "ui.noChange": "(no change: {v})",
  "ui.none": "none",
  "trend.gone": "gone", "trend.rising": "rising", "trend.falling": "falling", "trend.steady": "steady",
  "ui.thenNow": "Then and now",
  "ui.noneLeft": "None left",
  "ui.portrait": "The typical {one} on day 0 and today, drawn at the same scale. {caption}",
  "facts.title": "Meet the animals",
  "facts.lives": "Lives", "facts.family": "Family life", "facts.eats": "Eats", "facts.lifespan": "Lifespan", "facts.role": "Role in nature",
  "facts.note": "In this model a day is short: animals live weeks, not years, so you can watch many generations.",

  // Stage chips
  "stage.gone": "gone",
  "stage.goneNamed": "{name}: gone",
  "stage.count": "{name} {n}",
  "stage.new": "(new)",
};

export const animalWords = { key: "animals", messages: MESSAGES } as const;
