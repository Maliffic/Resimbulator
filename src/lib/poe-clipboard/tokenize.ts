const SEPARATOR = /^-{4,}$/;

/**
 * Split a PoE clipboard dump into sections separated by `--------` lines.
 * Trims trailing whitespace from each line and drops empty sections.
 */
export function tokenize(input: string): string[][] {
  const lines = input.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
  const sections: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (SEPARATOR.test(line)) {
      if (current.length > 0) sections.push(current);
      current = [];
    } else if (line.length > 0 || current.length > 0) {
      // skip leading empty lines but keep mid-section ones
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current);
  return sections.filter((s) => s.some((l) => l.trim().length > 0));
}
