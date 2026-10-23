// Shared helpers for the few places the site scrolls on the user's behalf.

export const prefersReducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? "auto" : "smooth");

// Distance from the top of `container` to `el`, from offsetTop, which ignores
// transforms, so an element still playing its rise-in animation measures where
// it will end up. `container` must be positioned (e.g. `relative`).
const offsetWithin = (el: HTMLElement, container: HTMLElement) => {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== container) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return node === container ? top : null;
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Scrolls `container` so `el` sits `margin` px below its top edge: a quick
 * 260ms ease-out, or an instant jump with reduced motion. Stops if the user
 * scrolls themselves (wheel, touch, keys) so it never fights them.
 */
export const scrollToTopOf = (el: HTMLElement, container: HTMLElement, margin = 16) => {
  const offset = offsetWithin(el, container);
  if (offset === null) {
    el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    return;
  }
  scrollContainerTo(container, offset - margin);
};

/** Scrolls `container` to `top` the same way: quick ease-out, instant with reduced motion. */
export const scrollContainerTo = (container: HTMLElement, top: number) => {
  const max = container.scrollHeight - container.clientHeight;
  const target = Math.max(0, Math.min(top, max));
  const start = container.scrollTop;
  if (Math.abs(target - start) < 2) return;
  if (prefersReducedMotion()) {
    container.scrollTop = target;
    return;
  }

  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of ["wheel", "touchstart", "keydown"]) container.removeEventListener(type, stop);
  };
  for (const type of ["wheel", "touchstart", "keydown"]) container.addEventListener(type, stop, { passive: true });

  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / 260);
    container.scrollTop = start + (target - start) * easeOut(t);
    if (t < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);
};

/** Runs `cb` with the element once it exists in the DOM (checked each frame, up to ~2s). */
export const whenElement = (find: () => HTMLElement | null, cb: (el: HTMLElement) => void) => {
  let frames = 0;
  let frame = 0;
  const check = () => {
    const el = find();
    if (el) return cb(el);
    if (++frames < 120) frame = requestAnimationFrame(check);
  };
  frame = requestAnimationFrame(check);
  return () => cancelAnimationFrame(frame);
};
