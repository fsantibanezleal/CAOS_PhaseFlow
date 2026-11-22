type BilingualCopy = string | { en: string; es: string };

export interface StoryCalloutContent {
  id: string;
  eyebrow: BilingualCopy;
  value: string;
  unit: BilingualCopy;
  state: string;
  source: BilingualCopy;
}

/** A signature of the card content that determines its measured size in the shell callout layout. */
export function storyCalloutContentKey(items: readonly StoryCalloutContent[]): string {
  return JSON.stringify(items.map(({ id, eyebrow, value, unit, state, source }) =>
    [id, eyebrow, value, unit, state, source]));
}
