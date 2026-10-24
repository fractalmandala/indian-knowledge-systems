import type { RawText, RawToken, RawVerse } from './types.ts';

export class TextParseError extends Error {
	readonly path: string;
	constructor(message: string, path: string) {
		super(`${path}: ${message}`);
		this.name = 'TextParseError';
		this.path = path;
	}
}

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

function str(value: unknown, path: string): string {
	if (typeof value !== 'string') throw new TextParseError(`expected string, got ${typeof value}`, path);
	return value;
}

function num(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new TextParseError(`expected number, got ${typeof value}`, path);
	}
	return value;
}

export function assertRawToken(value: unknown, path: string): RawToken {
	if (!isObject(value)) throw new TextParseError('expected an object', path);
	const token: RawToken = {
		id: num(value.id, `${path}.id`),
		form: str(value.form, `${path}.form`),
		lemma: str(value.lemma, `${path}.lemma`),
		lemma_id: num(value.lemma_id, `${path}.lemma_id`),
		upos: str(value.upos, `${path}.upos`) as RawToken['upos'],
		feats: str(value.feats, `${path}.feats`),
		slug: str(value.slug, `${path}.slug`)
	};
	if (value.compoundEnd !== undefined) {
		token.compoundEnd = num(value.compoundEnd, `${path}.compoundEnd`);
	}
	return token;
}

export function assertRawVerse(value: unknown, path: string): RawVerse {
	if (!isObject(value)) throw new TextParseError('expected an object', path);
	if (!Array.isArray(value.tokens)) throw new TextParseError('expected tokens array', `${path}.tokens`);
	return {
		index: num(value.index, `${path}.index`),
		reference: str(value.reference, `${path}.reference`),
		devanagari: str(value.devanagari, `${path}.devanagari`),
		iast: str(value.iast, `${path}.iast`),
		tokens: value.tokens.map((token, i) => assertRawToken(token, `${path}.tokens[${i}]`))
	};
}

/** Validate an already-parsed JSON value as a corpus text file. */
export function assertRawText(value: unknown, path = 'text'): RawText {
	if (!isObject(value)) throw new TextParseError('expected an object', path);
	if (!Array.isArray(value.verses)) throw new TextParseError('expected verses array', `${path}.verses`);
	return {
		slug: str(value.slug, `${path}.slug`),
		title: str(value.title, `${path}.title`),
		verses: value.verses.map((verse, i) => assertRawVerse(verse, `${path}.verses[${i}]`))
	};
}

export function isRawText(value: unknown): value is RawText {
	try {
		assertRawText(value);
		return true;
	} catch {
		return false;
	}
}
