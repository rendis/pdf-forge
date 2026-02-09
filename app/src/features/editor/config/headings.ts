export const HEADING_LEVELS = [1, 2, 3] as const
export type HeadingLevel = (typeof HEADING_LEVELS)[number]
