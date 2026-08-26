// One easing family + stagger interval shared by every department, so their
// distinct entrance styles still feel like the same product. Only the
// per-department table below (direction, scale, spring vs. tween) varies.
export const EASE = [0.22, 1, 0.36, 1];
export const STAGGER_SECONDS = 0.07; // 70ms between cards
export const MAX_STAGGER_SECONDS = 0.42; // cap so a 10-card grid doesn't crawl in

export function staggerDelay(index) {
  return Math.min(index * STAGGER_SECONDS, MAX_STAGGER_SECONDS);
}

// Card entrance variants, keyed by the name each department page passes to
// KpiCard/HomeInsightCard as `motionVariant`.
const CARD_VARIANTS = {
  // Sales — cards slide up + fade.
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: EASE },
  },
  // Inventory & Purchasing — cards slide in from the left.
  slideLeft: {
    initial: { opacity: 0, x: -24 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: EASE },
  },
  // Finance — calmer, slower scale-in; steady rather than kinetic.
  scaleFade: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.7, ease: EASE },
  },
  // Operations — direction alternates per card; the busiest page gets the
  // most kinetic feel. Resolved per-index by alternateSlideVariant() below.
  alternateSlideLeft: {
    initial: { opacity: 0, x: -24 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.45, ease: EASE },
  },
  alternateSlideRight: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.45, ease: EASE },
  },
  // Home — department cards stagger-fade upward.
  fadeUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: EASE },
  },
};

export function alternateSlideVariant(index) {
  // 1-based per spec: card #1 (index 0) is odd -> from the left.
  return (index + 1) % 2 === 1 ? "alternateSlideLeft" : "alternateSlideRight";
}

// Returns the framer-motion props for a card at `index`, collapsing to a
// plain fade with no delay when the reader prefers reduced motion.
export function cardMotionProps(variantName, index, reduceMotion) {
  const variant = CARD_VARIANTS[variantName] ?? CARD_VARIANTS.slideUp;

  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      whileInView: { opacity: 1 },
      viewport: { once: true, amount: 0.2 },
      transition: { duration: 0.2 },
    };
  }

  return {
    initial: variant.initial,
    whileInView: variant.animate,
    viewport: { once: true, amount: 0.2 },
    transition: { ...variant.transition, delay: staggerDelay(index) },
  };
}

// Recharts animation config per department — duration/easing, an optional
// stagger between a chart's two SERIES (paid-then-unpaid, requested-then-
// completed), and an optional stagger BETWEEN BARS within one series
// (`barStagger`, ms) so a chart's own draw-in echoes its department's card-
// entrance identity: Inventory's cards slide in from the left, so its bars
// cascade left-to-right too; Operations is the most kinetic page (alternating
// card directions), so its bars ripple in fast; Sales and Finance stay calm —
// every bar rises together, matching their single-direction card entrances.
export const CHART_MOTION = {
  sales: { duration: 700, easing: "ease-out", seriesStagger: 0, barStagger: 0 },
  inventory: { duration: 700, easing: "ease-in-out", seriesStagger: 220, barStagger: 40 },
  finance: { duration: 900, easing: "ease-out", seriesStagger: 0, barStagger: 0 },
  operations: { duration: 600, easing: "ease-out", seriesStagger: 180, barStagger: 25 },
  marketing: { duration: 550, easing: "ease-out", seriesStagger: 150, barStagger: 0 },
  "customer-service": { duration: 700, easing: "ease-out", seriesStagger: 0, barStagger: 0 },
  home: { duration: 500, easing: "ease-out", seriesStagger: 0, barStagger: 0 },
};

export function chartMotionProps(departmentKey, reduceMotion) {
  const config = CHART_MOTION[departmentKey] ?? CHART_MOTION.sales;
  if (reduceMotion) {
    return { isAnimationActive: false, animationDuration: 0, animationEasing: "linear", animationBeginSecond: 0, barStaggerMs: 0 };
  }
  return {
    isAnimationActive: true,
    animationDuration: config.duration,
    animationEasing: config.easing,
    animationBeginSecond: config.seriesStagger,
    barStaggerMs: config.barStagger,
  };
}
