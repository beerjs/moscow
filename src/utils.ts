export function byDateDesc<T extends { dateISO: string; id: number }>(left: T, right: T): number {
  const byDate = right.dateISO.localeCompare(left.dateISO);
  return byDate === 0 ? right.id - left.id : byDate;
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, 'ru'),
  );
}

export function formatYearRange(years: number[]): string {
  if (years.length === 0) {
    return '—';
  }

  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min}–${max}`;
}

export function compactDateLabel(dateLabel: string): string {
  return dateLabel.replace(/\s*г\.\s*$/i, '').trim();
}

export function setText(selector: string, value: string): void {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

export function requireElement<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) {
    throw new Error(`Missing element: ${selector}`);
  }

  return node;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  return element;
}
