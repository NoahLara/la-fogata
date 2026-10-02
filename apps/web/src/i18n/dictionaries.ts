import { en } from "./en";
import { es } from "./es";
import type { Locale } from "./locale";
import type { Messages } from "./messages";

export const DICTIONARIES: Record<Locale, Messages> = { es, en };
