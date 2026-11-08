// Scroll progress through the pinned landing story, shared by the page text and the pillar field.
export const STORY_ID = "story";
export const STAGES = 5;

/** p: 0..STAGES-1 while the story is pinned. q: 0..1 over the screen after it ends.
 *  Pass the scroll position when you have one (e.g. a motion value), so server and first
 *  client render agree. */
export function storyProgress(scrollY?: number): { p: number; q: number } {
  if (typeof window === "undefined") return { p: 0, q: 0 };
  const el = document.getElementById(STORY_ID);
  if (!el) return { p: 0, q: 0 };
  const vh = window.innerHeight;
  const sy = scrollY ?? window.scrollY;
  // The section is pulled up under the header; progress starts at the very top of the page.
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY);
  const span = Math.max(1, el.offsetHeight - vh);
  const y = sy - top;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return { p: clamp(y / span) * (STAGES - 1), q: clamp((y - span) / vh) };
}
