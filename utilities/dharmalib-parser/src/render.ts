// Framework-agnostic rendering. `renderLine` gives any UI a flat list of spans
// to draw; `lineToHtml` / `documentToHtml` are a working reference renderer.

import type { Chapter, DisplayToken, Line, TextDocument, Word } from './types.ts';
import { describeFeatures } from './features.ts';

export interface RenderOptions {
	/** Build the href for a word. Return `undefined` for no link. */
	href?: (word: Word) => string | undefined;
	/** Class prefix, so the markup can live inside an existing design system. */
	prefix?: string;
	/** Include the Devanagari line. Default true. */
	devanagari?: boolean;
	/** Include the IAST line. Default true. */
	iast?: boolean;
}

/** One drawable piece of a line: a word, or the glue printed between words. */
export type Segment =
	| { kind: 'word'; word: Word; depth: number; compoundForm?: string }
	| { kind: 'space' }
	| { kind: 'compound-join' };

/**
 * Flatten a line into segments. Words inside a compound are separated by
 * `compound-join` (render as a hyphen, a thin space, nothing — your call),
 * and separate words by `space`.
 */
export function renderLine(line: Line): Segment[] {
	const segments: Segment[] = [];
	line.tokens.forEach((token: DisplayToken, i) => {
		if (i > 0) segments.push({ kind: 'space' });
		if (token.kind === 'word') {
			segments.push({ kind: 'word', word: token, depth: 0 });
			return;
		}
		token.members.forEach((member, j) => {
			if (j > 0) segments.push({ kind: 'compound-join' });
			segments.push({ kind: 'word', word: member, depth: 1, compoundForm: token.form });
		});
	});
	return segments;
}

const escapeHtml = (value: string): string =>
	value.replace(/[&<>"']/g, (char) =>
		({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string
	);

/** Title text for a word: lemma plus a readable feature gloss. */
export function wordTitle(word: Word): string {
	const features = describeFeatures(word.features);
	const pos = word.upos === '_' ? '' : word.upos.toLowerCase();
	return [word.lemma, [pos, features].filter(Boolean).join(' ')].filter(Boolean).join(' — ');
}

/** Reference HTML for one line. */
export function lineToHtml(line: Line, options: RenderOptions = {}): string {
	const p = options.prefix ?? 'dl';
	const parts: string[] = [];
	parts.push(`<div class="${p}-line" data-reference="${escapeHtml(line.reference.raw)}">`);
	parts.push(`<span class="${p}-ref">${escapeHtml(line.reference.raw)}</span>`);
	if (options.devanagari !== false && line.devanagari) {
		parts.push(`<p class="${p}-devanagari">${escapeHtml(line.devanagari)}</p>`);
	}
	if (options.iast !== false && line.iast) {
		parts.push(`<p class="${p}-iast">${escapeHtml(line.iast)}</p>`);
	}

	parts.push(`<p class="${p}-tokens">`);
	for (const segment of renderLine(line)) {
		if (segment.kind === 'space') parts.push(' ');
		else if (segment.kind === 'compound-join') parts.push(`<span class="${p}-join">-</span>`);
		else {
			const { word, depth } = segment;
			const classes = [`${p}-word`, `${p}-pos-${word.upos.toLowerCase().replace('_', 'unknown')}`];
			if (depth > 0) classes.push(`${p}-word-in-compound`);
			if (word.unresolved) classes.push(`${p}-word-unresolved`);
			const attrs =
				` class="${classes.join(' ')}"` +
				` title="${escapeHtml(wordTitle(word))}"` +
				` data-lemma="${escapeHtml(word.lemma)}"` +
				` data-lemma-id="${word.lemmaId}"` +
				` data-upos="${escapeHtml(word.upos)}"`;
			const href = options.href?.(word);
			parts.push(
				href
					? `<a href="${escapeHtml(href)}"${attrs}>${escapeHtml(word.form)}</a>`
					: `<span${attrs}>${escapeHtml(word.form)}</span>`
			);
		}
	}
	parts.push('</p></div>');
	return parts.join('');
}

/** Reference HTML for a chapter. */
export function chapterToHtml(chapter: Chapter, options: RenderOptions = {}): string {
	const p = options.prefix ?? 'dl';
	const stanzas = chapter.stanzas
		.map(
			(stanza) =>
				`<div class="${p}-stanza">${stanza.lines.map((line) => lineToHtml(line, options)).join('')}</div>`
		)
		.join('');
	return `<section class="${p}-chapter"><h2 class="${p}-chapter-title">${escapeHtml(chapter.label)}</h2>${stanzas}</section>`;
}

/** Reference HTML for a whole text. */
export function documentToHtml(document: TextDocument, options: RenderOptions = {}): string {
	const p = options.prefix ?? 'dl';
	const chapters = document.chapters.map((chapter) => chapterToHtml(chapter, options)).join('');
	return `<article class="${p}-text" data-slug="${escapeHtml(document.slug)}"><h1 class="${p}-title">${escapeHtml(document.title)}</h1>${chapters}</article>`;
}

/** Plain text of a line, compounds printed as their surface form. */
export function lineToPlainText(line: Line): string {
	return line.tokens.map((token) => token.form).join(' ');
}
