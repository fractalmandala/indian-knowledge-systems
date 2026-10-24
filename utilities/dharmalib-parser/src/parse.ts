import type {
	Chapter, Line, RawText, RawVerse, Stanza, TextDocument, TextStats, Word
} from './types.ts';
import { assertRawText } from './guards.ts';
import { chapterLabel, parseReference } from './reference.ts';
import { flattenWords, groupTokens } from './tokens.ts';

/** Build a renderable line from one raw verse. */
export function parseVerse(verse: RawVerse): Line {
	const tokens = groupTokens(verse.tokens);
	return {
		index: verse.index,
		reference: parseReference(verse.reference),
		devanagari: verse.devanagari,
		iast: verse.iast,
		tokens,
		words: flattenWords(tokens)
	};
}

/** Group lines into stanzas and chapters, preserving file order. */
export function groupLines(lines: Line[]): Chapter[] {
	const chapters: Chapter[] = [];
	let chapter: Chapter | undefined;
	let stanza: Stanza | undefined;

	for (const line of lines) {
		const { chapterKey, stanzaKey } = line.reference;
		if (!chapter || chapter.key !== chapterKey) {
			chapter = {
				key: chapterKey,
				number: line.reference.chapter,
				divisions: line.reference.divisions,
				label: chapterLabel(line.reference),
				stanzas: []
			};
			chapters.push(chapter);
			stanza = undefined;
		}
		if (!stanza || stanza.key !== stanzaKey) {
			stanza = { key: stanzaKey, number: line.reference.verse, lines: [] };
			chapter.stanzas.push(stanza);
		}
		stanza.lines.push(line);
	}
	return chapters;
}

function collectStats(lines: Line[], chapters: Chapter[]): TextStats {
	let tokens = 0, words = 0, compounds = 0, stanzas = 0;
	const lemmas = new Set<number>();
	for (const chapter of chapters) stanzas += chapter.stanzas.length;
	for (const line of lines) {
		tokens += line.tokens.length;
		for (const token of line.tokens) if (token.kind === 'compound') compounds++;
		for (const word of line.words) {
			words++;
			if (!word.unresolved) lemmas.add(word.lemmaId);
		}
	}
	return {
		lines: lines.length,
		stanzas,
		chapters: chapters.length,
		tokens,
		words,
		compounds,
		distinctLemmas: lemmas.size
	};
}

/** Build the display model from an already-validated raw text. */
export function buildDocument(raw: RawText): TextDocument {
	const lines = raw.verses.map(parseVerse);
	const chapters = groupLines(lines);
	const sigla = new Set(lines.map((line) => line.reference.siglum).filter(Boolean));
	return {
		slug: raw.slug,
		title: raw.title,
		siglum: sigla.size === 1 ? [...sigla][0] : undefined,
		lines,
		chapters,
		stats: collectStats(lines, chapters)
	};
}

/** Validate an unknown JSON value and build the display model. Throws on bad input. */
export function parseText(value: unknown): TextDocument {
	return buildDocument(assertRawText(value));
}

/** Parse a JSON string straight into the display model. */
export function parseTextJson(json: string): TextDocument {
	return parseText(JSON.parse(json));
}

export type ParseResult =
	| { ok: true; document: TextDocument }
	| { ok: false; error: Error };

/** Non-throwing variant, for feeding files of unknown provenance. */
export function safeParseText(value: unknown): ParseResult {
	try {
		return { ok: true, document: parseText(value) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
	}
}

// ---------------------------------------------------------------------------
// Lookups a reader UI tends to want.
// ---------------------------------------------------------------------------

/** Lines whose reference matches a chapter number (and optional divisions). */
export function chapterOf(document: TextDocument, key: string): Chapter | undefined {
	return document.chapters.find((chapter) => chapter.key === key);
}

/** Every occurrence of a lemma, by `lemma_id`. */
export function occurrencesOfLemma(
	document: TextDocument,
	lemmaId: number
): Array<{ line: Line; word: Word }> {
	const hits: Array<{ line: Line; word: Word }> = [];
	for (const line of document.lines) {
		for (const word of line.words) if (word.lemmaId === lemmaId) hits.push({ line, word });
	}
	return hits;
}

/** Frequency table of lemmas, most frequent first. */
export function lemmaFrequencies(
	document: TextDocument
): Array<{ lemmaId: number; lemma: string; slug: string; count: number }> {
	const counts = new Map<number, { lemmaId: number; lemma: string; slug: string; count: number }>();
	for (const line of document.lines) {
		for (const word of line.words) {
			if (word.unresolved) continue;
			const entry = counts.get(word.lemmaId);
			if (entry) entry.count++;
			else counts.set(word.lemmaId, { lemmaId: word.lemmaId, lemma: word.lemma, slug: word.slug, count: 1 });
		}
	}
	return [...counts.values()].sort((a, b) => b.count - a.count);
}
