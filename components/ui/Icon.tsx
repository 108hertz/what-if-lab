/**
 * Our own geometric line glyphs (no icon library, no SF Symbols): 24 px grid, 1.5 px stroke,
 * round caps, currentColor. Decorative by default; pair with visible text or an aria-label.
 */
const GLYPHS = {
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  pause: <><path d="M9 6v12" /><path d="M15 6v12" /></>,
  restart: <><path d="M5 12a7 7 0 1 0 2.05-4.95" /><path d="M5 4.5v3.5h3.5" /></>,
  fork: <><circle cx="6" cy="12" r="1.6" /><path d="M7.6 12H11c2 0 2.6-5 5-5h2.5" /><path d="M11 12c2 0 2.6 5 5 5h2.5" strokeDasharray="2 2.2" /></>,
  close: <><path d="M6.5 6.5l11 11" /><path d="M17.5 6.5l-11 11" /></>,
  chevron: <path d="M7 10l5 5 5-5" />,
  plus: <><path d="M12 6v12" /><path d="M6 12h12" /></>,
  minus: <path d="M6 12h12" />,
  arrow: <><path d="M5 12h14" /><path d="M14 7l5 5-5 5" /></>,
  sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6" /></>,
  moon: <path d="M18.5 14.5A7 7 0 0 1 9.5 5.5a7 7 0 1 0 9 9z" />,

  // World glyphs
  scale: <><path d="M3.5 16h17" /><path d="M5 16v-3M8.5 16v-5M12 16v-7M15.5 16v-5M19 16v-3" /></>,
  galaxy: <><circle cx="12" cy="12" r="1.3" /><path d="M12 12c3-.5 4 2.5 2 4.5s-7 1.5-8-2.5S8 5 12.5 5s7.5 4 6.5 8" strokeDasharray="0.1 2.6" /></>,
  solar: <><circle cx="12" cy="12" r="2" /><circle cx="12" cy="12" r="5.5" /><circle cx="12" cy="12" r="9" /><circle cx="17.5" cy="12" r="0.9" fill="currentColor" /></>,
  earth: <><circle cx="12" cy="12" r="8" /><path d="M4.5 14.5h15" /></>,
  country: <>{[7, 12, 17].flatMap((y) => [7, 12, 17].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" />))}</>,
  animals: <><circle cx="9" cy="13" r="5" /><circle cx="17.5" cy="9" r="2.5" /></>,
  child: <><circle cx="12" cy="12" r="8" strokeDasharray="2 2.4" /><circle cx="12" cy="12" r="3" /></>,
  person: <><circle cx="8" cy="12" r="3" /><path d="M11 12h3c1.5 0 2-3 4-3h1.5M14 12c1.5 0 2 3 4 3h1.5" /></>,
} as const;

export type IconName = keyof typeof GLYPHS;

export function Icon({ name, size = 20, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {GLYPHS[name]}
    </svg>
  );
}
