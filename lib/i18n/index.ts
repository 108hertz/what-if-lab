/** What-If Lab translation API (ADR 0010, change 0025). Framework-free; the React side comes in components/i18n. */
export * from "./locales";
export { format, argNames, pluralCases, MessageError } from "./message";
export * from "./t";
export * from "./routes";
// Build-time loading (Node fs) lives in "./load" and is imported only by app/ pages.
