import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COUNT_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Group digits the same way the animated counters do, so 4109 never sits beside 4,109. */
export function formatCount(value: number) {
  return COUNT_FORMAT.format(value);
}

/** "1 review", "1,284 reviews" — count formatting and the plural in one place. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${formatCount(count)} ${count === 1 ? singular : pluralForm}`;
}
