// Run against the real corpus:
//   node --test test.ts
//   DHARMALIB_TEXTS=/path/to/static/data/texts node --test test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
	parseText, parseTextJson, safeParseText, parseReference, parseFeatures,
	formatFeatures, describeFeatures, groupTokens, lineToHtml, lineToPlainText,
	lemmaFrequencies, assertRawText, TextParseError
} from './src/index.ts';

//update with real path before running
const CORPUS = process.env.DHARMALIB_TEXTS ?? '~/dharmalib/static/data/texts';
const MAX_BYTES = Number(process.env.DHARMALIB_MAX_BYTES ?? 2_000_000);

const corpusFiles = (): string[] => {
	if (!fs.existsSync(CORPUS)) return [];
	return fs
		.readdirSync(CORPUS)
		.filter((file) => file.endsWith('.json'))
		.map((file) => path.join(CORPUS, file))
		.filter((file) => fs.statSync(file).size <= MAX_BYTES);
};

test('parses a compound-bearing line into a token tree', () => {
	const document = parseText({
		slug: 'bhairavastava',
		title: 'Bhairavastava',
		verses: [
			{
				index: 0,
				reference: 'Bhairavastava, 1.1',
				devanagari: 'व्याप्त…',
				iast: 'vyāptacarācaraṃ ekam',
				tokens: [
					{ id: 1, compoundEnd: 2, form: 'vyāptacarācaraṃ', lemma: '_', lemma_id: 0, upos: '_', feats: '_', slug: 'vyāptacarācaraṃ' },
					{ id: 1, form: 'vyāpta', lemma: 'vyāp', lemma_id: 164632, upos: 'VERB', feats: 'Case=Cpd|VerbForm=Part', slug: 'vyāpta' },
					{ id: 2, form: 'carācaraṃ', lemma: 'carācara', lemma_id: 164445, upos: 'NOUN', feats: 'Case=Acc|Gender=Neut|Number=Sing', slug: 'carācaraṃ' },
					{ id: 3, form: 'ekam', lemma: 'eka', lemma_id: 39102, upos: 'NUM', feats: 'Case=Acc|Gender=Masc|Number=Sing', slug: 'ekam' }
				]
			}
		]
	});

	const [line] = document.lines;
	assert.equal(line.tokens.length, 2);
	assert.equal(line.tokens[0].kind, 'compound');
	assert.equal(line.tokens[0].kind === 'compound' && line.tokens[0].members.length, 2);
	assert.equal(line.tokens[1].kind, 'word');
	assert.equal(line.words.length, 3);
	assert.equal(line.words[0].inCompound, true);
	assert.equal(line.words[2].inCompound, false);
	assert.equal(lineToPlainText(line), 'vyāptacarācaraṃ ekam');
	assert.match(lineToHtml(line, { href: (word) => `/lemma/${word.slug}` }), /href="\/lemma\/carācaraṃ"/);
	assert.equal(document.stats.compounds, 1);
	assert.equal(document.stats.words, 3);
	assert.equal(lemmaFrequencies(document).length, 3);
});

test('reference parsing handles every shape in the corpus', () => {
	const simple = parseReference('Bhairavastava, 1.1');
	assert.equal(simple.siglum, 'Bhairavastava');
	assert.deepEqual(simple.numbers, [1, 1]);
	assert.equal(simple.chapter, 1);
	assert.equal(simple.verse, 1);

	const nested = parseReference('AĀ, 2, 1, 5.4');
	assert.deepEqual(nested.divisions, ['2', '1']);
	assert.deepEqual(nested.numbers, [5, 4]);

	const named = parseReference('AHS, Cikitsitasthāna, 8.104.2');
	assert.deepEqual(named.divisions, ['Cikitsitasthāna']);
	assert.equal(named.line, 2);
	assert.equal(named.stanzaKey, parseReference('AHS, Cikitsitasthāna, 8.104').stanzaKey);
	assert.equal(named.chapterKey, parseReference('AHS, Cikitsitasthāna, 8.3').chapterKey);
});

test('feature strings round-trip and gloss', () => {
	const features = parseFeatures('Case=Acc|Gender=Neut|Number=Sing');
	assert.equal(features.Case, 'Acc');
	assert.equal(formatFeatures(features), 'Case=Acc|Gender=Neut|Number=Sing');
	assert.equal(describeFeatures(features), 'singular neuter accusative');
	assert.deepEqual(parseFeatures('_'), {});
	assert.deepEqual(parseFeatures(''), {});
});

test('bad input is rejected with a path', () => {
	assert.throws(() => assertRawText({ slug: 'x', title: 'X' }), TextParseError);
	const result = safeParseText({ slug: 'x', title: 'X', verses: [{ index: 'nope', tokens: [] }] });
	assert.equal(result.ok, false);
	assert.ok(!result.ok && /verses\[0\]\.index/.test(result.error.message));
});

test('a truncated compound still yields its members', () => {
	const [token] = groupTokens([
		{ id: 1, compoundEnd: 4, form: 'abc', lemma: '_', lemma_id: 0, upos: '_', feats: '_', slug: 'abc' },
		{ id: 1, form: 'a', lemma: 'a', lemma_id: 1, upos: 'NOUN', feats: 'Case=Cpd', slug: 'a' }
	]);
	assert.equal(token.kind, 'compound');
	assert.equal(token.kind === 'compound' && token.members.length, 1);
});

test('every corpus file parses and keeps every token', () => {
	const files = corpusFiles();
	if (files.length === 0) {
		console.warn(`no corpus at ${CORPUS}; skipping`);
		return;
	}
	let lines = 0;
	for (const file of files) {
		const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
		const document = parseTextJson(fs.readFileSync(file, 'utf8'));
		assert.equal(document.slug, raw.slug, file);
		assert.equal(document.lines.length, raw.verses.length, file);

		const rawWords = raw.verses.reduce(
			(total: number, verse: any) =>
				total + verse.tokens.filter((token: any) => token.compoundEnd === undefined).length,
			0
		);
		assert.equal(document.stats.words, rawWords, `${file}: words`);

		// Grouping must not drop or reorder anything.
		for (const [i, verse] of raw.verses.entries()) {
			const line = document.lines[i];
			const ids = line.tokens.flatMap((token) =>
				token.kind === 'word' ? [token.id] : [token.id, ...token.members.map((m) => m.id)]
			);
			assert.deepEqual(ids, verse.tokens.map((token: any) => token.id), `${file}: verse ${i}`);
		}
		lines += document.lines.length;
	}
	console.log(`parsed ${files.length} corpus files, ${lines} lines`);
});
