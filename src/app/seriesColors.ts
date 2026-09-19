/**
 * Official PPIC categorical schemes, ordered by the number of comparisons.
 * The source order mirrors web-data-visualization's `ppic-official-*`
 * palettes. Four light guide swatches do not clear the 3:1 graphical contrast
 * minimum on white, so they use darker published shades from the same PPIC
 * ramps: Blue #0F4880, Seafoam #0C6F63, Gray #7B7B77, and Lime #494908.
 */
const PPIC = Object.freeze({
  orange: "#ca4f1a",
  navy: "#293b54",
  blue: "#0f4880",
  violet: "#693692",
  seafoam: "#0c6f63",
  gray: "#7b7b77",
  red: "#832522",
  green: "#196348",
  darkGray: "#1a1918",
  lime: "#494908",
});

const PPIC_CATEGORICAL_PALETTES: Readonly<Record<number, readonly string[]>> = Object.freeze({
  1: Object.freeze([PPIC.orange]),
  2: Object.freeze([PPIC.orange, PPIC.navy]),
  3: Object.freeze([PPIC.orange, PPIC.navy, PPIC.gray]),
  4: Object.freeze([PPIC.orange, PPIC.navy, PPIC.blue, PPIC.darkGray]),
  5: Object.freeze([PPIC.orange, PPIC.navy, PPIC.blue, PPIC.darkGray, PPIC.lime]),
  6: Object.freeze([PPIC.orange, PPIC.navy, PPIC.blue, PPIC.violet, PPIC.darkGray, PPIC.lime]),
  7: Object.freeze([PPIC.orange, PPIC.navy, PPIC.blue, PPIC.violet, PPIC.seafoam, PPIC.darkGray, PPIC.lime]),
  8: Object.freeze([
    PPIC.orange,
    PPIC.navy,
    PPIC.blue,
    PPIC.violet,
    PPIC.seafoam,
    PPIC.darkGray,
    PPIC.gray,
    PPIC.lime,
  ]),
  9: Object.freeze([
    PPIC.orange,
    PPIC.navy,
    PPIC.blue,
    PPIC.violet,
    PPIC.seafoam,
    PPIC.gray,
    PPIC.red,
    PPIC.darkGray,
    PPIC.lime,
  ]),
  10: Object.freeze([
    PPIC.orange,
    PPIC.navy,
    PPIC.blue,
    PPIC.violet,
    PPIC.seafoam,
    PPIC.gray,
    PPIC.red,
    PPIC.green,
    PPIC.darkGray,
    PPIC.lime,
  ]),
});

export function getComparisonPalette(comparisonCount: number): readonly string[] {
  const paletteSize = Math.min(10, Math.max(1, Math.trunc(comparisonCount)));
  return PPIC_CATEGORICAL_PALETTES[paletteSize] ?? PPIC_CATEGORICAL_PALETTES[1]!;
}

export function getComparisonColor(comparisonCount: number, comparisonIndex: number): string {
  const palette = getComparisonPalette(comparisonCount);
  const normalizedIndex = Math.max(0, Math.trunc(comparisonIndex));
  return palette[normalizedIndex % palette.length] ?? PPIC.orange;
}
