import type { Reference } from './types.ts';

const NUMERIC_TAIL = /^\d+(?:\.\d+)*$/;

/**
 * Parse a corpus `reference` string.
 *
 * The corpus writes `<siglum>, [division, ...]<dotted numbers>`:
 *   `Bhairavastava, 1.1`          → siglum Bhairavastava, 1.1
 *   `AĀ, 2, 1, 5.4`               → divisions ["2", "1"], 5.4
 *   `AHS, Cikitsitasthāna, 8.104.2`
 * Anything that does not end in a dotted numeric group still parses: the
 * numeric locus is then empty and the trailing text lands in `divisions`.
 */
export function parseReference(raw: string): Reference {
	const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
	const siglum = parts.length > 1 ? (parts.shift() as string) : '';
	const last = parts[parts.length - 1];

	let numbers: number[] = [];
	if (last && NUMERIC_TAIL.test(last)) {
		numbers = (parts.pop() as string).split('.').map(Number);
	}
	const divisions = parts;

	const [chapter, verse, line] = numbers;
	const stanzaNumbers = numbers.length > 2 ? numbers.slice(0, -1) : numbers;
	const prefix = siglum ? [siglum, ...divisions] : divisions;

	return {
		raw,
		siglum,
		divisions,
		numbers,
		chapter,
		verse,
		line,
		stanzaKey: [...prefix, stanzaNumbers.join('.')].join('|'),
		chapterKey: [...prefix, chapter ?? ''].join('|')
	};
}

/** Short label for a chapter heading, e.g. `Cikitsitasthāna 8` or `3 · 33`. */
export function chapterLabel(reference: Reference): string {
	const parts = [...reference.divisions];
	if (reference.chapter !== undefined) parts.push(String(reference.chapter));
	return parts.join(' · ') || reference.siglum || reference.raw;
}
