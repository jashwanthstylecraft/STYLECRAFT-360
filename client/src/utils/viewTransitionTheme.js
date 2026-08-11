// A circle-reveal transition for the theme toggle, via the browser's View
// Transitions API. Ported and trimmed down from a demo that offered many
// variants (rectangle wipe, polygon, GIF mask, blur, a draggable options
// panel) — none of that fit a production app, so only the one that reads as
// premium for an executive dashboard survives: a circle expanding from the
// button that was clicked. Falls back to an instant, un-animated switch
// when the API is unsupported or the user prefers reduced motion.
const STYLE_ID = "theme-transition-styles";

function injectCircleRevealStyles(originXPct, originYPct) {
  let styleEl = document.getElementById(STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    ::view-transition-group(root) {
      animation-duration: 0.6s;
      animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
    }
    ::view-transition-new(root) {
      animation-name: theme-reveal-in;
    }
    ::view-transition-old(root) {
      animation: none;
      z-index: -1;
    }
    @keyframes theme-reveal-in {
      from { clip-path: circle(0% at ${originXPct}% ${originYPct}%); }
      to { clip-path: circle(150% at ${originXPct}% ${originYPct}%); }
    }
  `;
}

export function animateThemeToggle(applyThemeChange, originElement, { reduceMotion = false } = {}) {
  if (reduceMotion || typeof document === "undefined" || !document.startViewTransition) {
    applyThemeChange();
    return;
  }

  let xPct = 100;
  let yPct = 0;
  if (originElement) {
    const rect = originElement.getBoundingClientRect();
    xPct = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
    yPct = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
  }

  injectCircleRevealStyles(xPct, yPct);
  document.startViewTransition(applyThemeChange);
}
