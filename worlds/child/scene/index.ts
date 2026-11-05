/** The child stage (changes 0018, 0019): people and props, rooms of a life, the crowd, and the stage that puts them together. */
export { drawChild, heroKid, scenePace, setHeroKid, setStageView, stageView, type StageView } from "./stage";
export { kidAt, pointAt, setStageTrait, stageTrait, tapAt } from "./crowd";
export { drawGlyph, drawPerson, isFamily, parentLook, type Hold, type Look, type Pose } from "./people";
export { reducedMotion } from "./motion";
export { CHANGE_THING, drawThing, type Thing } from "./props";
