/**
 * Vercel Web Analytics (change 0027): cookieless page views, no consent needed. The plain script Vercel documents for
 * any framework (no npm package); it exists only on Vercel deploys, so it is left out of every other build.
 */
const ON = process.env.VERCEL === "1";
const QUEUE = "window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};";

export default function VercelAnalytics() {
  if (!ON) return null;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: QUEUE }} />
      <script defer src="/_vercel/insights/script.js" />
    </>
  );
}
