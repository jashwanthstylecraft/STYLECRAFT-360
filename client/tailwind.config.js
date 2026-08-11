/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Sidebar-only brand navy — deliberately static in both themes (a
        // persistent dark anchor, not something that flips with the page).
        navy: {
          DEFAULT: "#0B2447",
          950: "#081A33",
        },
        // Everything below is CSS-variable-backed (see index.css) so light
        // and dark values live in one place and every component gets both
        // for free — no per-component dark: pairs needed for these tokens.
        heading: "var(--color-heading)",
        actual: {
          DEFAULT: "var(--color-actual)",
          strong: "var(--color-actual-strong)",
        },
        goal: {
          DEFAULT: "var(--color-goal)",
        },
        gammaplus: {
          DEFAULT: "var(--color-gammaplus)",
        },
        positive: "var(--color-positive)",
        negative: "var(--color-negative)",
        surface: {
          DEFAULT: "var(--color-surface)",
          card: "var(--color-surface-card)",
          border: "var(--color-surface-border)",
          hover: "var(--color-surface-hover)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          secondary: "var(--color-ink-secondary)",
          muted: "var(--color-ink-muted)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
