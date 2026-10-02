import type { es } from "./es";

/** A message that depends on a count: the form for each plural category the languages here use. */
export interface Plural {
  one: string;
  other: string;
}

type Widen<T> = T extends string ? string : { -readonly [K in keyof T]: Widen<T[K]> };

/** The shape every dictionary must have: Spanish's keys, with plain strings (and `Plural`s) as values. */
export type Messages = Widen<typeof es>;
