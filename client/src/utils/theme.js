import { useTheme } from "../contexts/ThemeContext";

// Raw hex values for contexts that can't consume Tailwind classes (Recharts
// SVG props). Mirrors the CSS variables in index.css — if you change one,
// change the other. Dark-mode values are their own validated palette (run
// dataviz's validate_palette.js), not an automatic flip of the light ones.
const LIGHT_COLORS = {
  navy: "#0B2447",
  heading: "#0B2447",
  actual: "#2563EB",
  actualStrong: "#1D4ED8",
  goal: "#DC2626",
  gammaPlus: "#EF4444",
  positive: "#16A34A",
  negative: "#DC2626",
  gridline: "#E2E8F0",
  axisText: "#64748B",
  surfaceCard: "#FFFFFF",
  unpaidFill: "#DBEAFE",
};

const DARK_COLORS = {
  navy: "#0B2447",
  heading: "#F1F5F9",
  actual: "#3B82F6",
  actualStrong: "#60A5FA",
  goal: "#F87171",
  gammaPlus: "#EF4444",
  positive: "#4ADE80",
  negative: "#F87171",
  gridline: "#263449",
  axisText: "#94A3B8",
  surfaceCard: "#131B2E",
  unpaidFill: "#1D4ED8",
};

// Static export kept for the rare non-component context (none currently),
// components should prefer useChartColors() so they react to theme changes.
export const COLORS = LIGHT_COLORS;

export function useChartColors() {
  const { theme } = useTheme();
  return theme === "dark" ? DARK_COLORS : LIGHT_COLORS;
}

const NAMED_COLORS = {
  light: { blue: LIGHT_COLORS.actualStrong, red: LIGHT_COLORS.goal },
  dark: { blue: DARK_COLORS.actualStrong, red: DARK_COLORS.goal },
};

export function resolveNamedColor(name, theme = "light") {
  const palette = NAMED_COLORS[theme] ?? NAMED_COLORS.light;
  return palette[name] || palette.blue;
}

export function useResolveNamedColor() {
  const { theme } = useTheme();
  return (name) => resolveNamedColor(name, theme);
}
