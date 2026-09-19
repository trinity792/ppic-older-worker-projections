/**
 * Assigned to comparisons by index. Ported from web-data-visualization's
 * lib/visualization/palettes.js PALETTES["brand-categorical"] -- its default
 * series-color cycle for any chart in that app ("Mirrors BASE_PLOTLY_COLORS
 * exactly") -- so this chart's data-line colors read as the same visual
 * family as the reference's charts, not v0's ad hoc palette.
 *
 * One substitution: the reference's plain "steelBlue" (#759CBF) is only
 * 2.89:1 against white, below the 3:1 WCAG minimum for a meaningful
 * graphical object (a 2px data line, dot, or legend swatch). Swapped for
 * "steelBlue4" (#4C7AA4) from the same ramp family, which clears 4.5:1.
 * Direct chart labels never use these colors as text fill (see
 * DirectLabels.tsx) specifically because several of them fall short of the
 * 4.5:1 text threshold even though they clear the 3:1 graphical one.
 */
export const SERIES_COLORS: readonly string[] = [
  "#1891e3", // blue3
  "#e36a18", // orange3
  "#2d4059", // navyBlue
  "#4c7aa4", // steelBlue4 (substituted for steelBlue, see above)
  "#bf471b", // burntOrange
  "#084d7c", // blue5
];
