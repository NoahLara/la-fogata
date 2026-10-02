import type { Locale } from "./locale";
import type { Plural } from "./messages";

/** Fills `{name}` placeholders. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

const rules = new Map<Locale, Intl.PluralRules>();

/** The form that fits `count` in this language. */
export function plural(locale: Locale, forms: Plural, count: number): string {
  let pluralRules = rules.get(locale);
  if (!pluralRules) {
    pluralRules = new Intl.PluralRules(locale);
    rules.set(locale, pluralRules);
  }
  return pluralRules.select(count) === "one" ? forms.one : forms.other;
}
