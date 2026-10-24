# dharmalib-parser

Types, validation and a display model for the Dharmalib Sanskrit text corpus (`dharmalib/static/data/texts/*.json`). Zero dependencies, plain TypeScript, no framework. Give it any file from that corpus and it hands back a structure a reader UI can walk directly.

Verified against all 254 corpus files (~97k lines, ~925k tokens): every file parses, and grouping preserves every token id in order.

## The file shape

Every file in the corpus is identical in shape:

```jsonc
{
  "slug": "bhairavastava",
  "title": "Bhairavastava",
  "verses": [
    {
      "index": 0,
      "reference": "Bhairavastava, 1.1",
      "devanagari": "व्याप्तचराचर…",
      "iast": "vyāptacarācarabhāvaviśeṣaṃ …",
      "tokens": [
        { "id": 1, "compoundEnd": 4, "form": "vyāptacarācarabhāvaviśeṣaṃ",
          "lemma": "_", "lemma_id": 0, "upos": "_", "feats": "_", "slug": "…" },
        { "id": 1, "form": "vyāpta", "lemma": "vyāp", "lemma_id": 164632,
          "upos": "VERB", "feats": "Case=Cpd|VerbForm=Part", "slug": "vyāpta" }
        // … members 2–4, then the next word
      ]
    }
  ]
}
```

Two things in it are not obvious:

- **Compounds are flat.** A compound is announced by a *header* token carrying
  `compoundEnd` and the whole printed surface form, with `_` for
  `lemma`/`upos`/`feats` and `lemma_id: 0`. The tokens that follow it, up to and
  including the one whose `id` equals `compoundEnd`, are its members. Headers
  never nest. Member `id`s repeat the header's `id` range, so ids are not unique
  within a verse.
- **A "verse" is a line.** `reference` is `Siglum, [division, …]dotted.numbers`
  — `Bhairavastava, 1.1`, `AĀ, 2, 1, 5.4`, `AHS, Cikitsitasthāna, 8.104.2`. A
  third number (`1.1.2`) is a further line of the *same* stanza, so lines must be
  grouped by the reference, not one-per-stanza.

`feats` is a `Key=Value|Key=Value` string over `Case, Gender, Number, Tense,
Mood, Person, VerbForm, Voice, Formation`; `upos` is one of `NOUN VERB ADJ PRON
PART ADV CONJ SCONJ NUM ADP INTJ`, plus `_` on compound headers.

## Use

```ts
import { parseTextJson, documentToHtml } from 'dharmalib-parser';

const doc = parseTextJson(await readFile('Bhairavastava.json', 'utf8'));

doc.title;          // "Bhairavastava"
doc.stats;          // { lines, stanzas, chapters, tokens, words, compounds, distinctLemmas }
doc.chapters;       // Chapter[] → Stanza[] → Line[]

for (const chapter of doc.chapters) {
  for (const stanza of chapter.stanzas) {
    for (const line of stanza.lines) {
      line.iast;
      line.tokens;  // (Word | Compound)[] — compounds hold their members
      line.words;   // every Word, compounds flattened
    }
  }
}

documentToHtml(doc, { href: (word) => `/lemma/${word.slug}` });
```

### Rendering in your own framework

`renderLine(line)` flattens a line into segments so any UI can draw it without
re-deriving compound structure:

```ts
for (const seg of renderLine(line)) {
  if (seg.kind === 'space') ...            // between printed words
  else if (seg.kind === 'compound-join') ...// between members of one compound
  else seg.word                             // a Word; seg.depth === 1 inside a compound
}
```

`lineToHtml` / `chapterToHtml` / `documentToHtml` are a working reference
renderer built on exactly that — emitting `.dl-word`, `.dl-pos-noun`,
`.dl-word-in-compound`, `data-lemma-id` and so on (`prefix` renames them). Use
them as-is or as a template.

## API

| Export | What it does |
|---|---|
| `parseText(value)` / `parseTextJson(json)` | validate and build the display model; throws `TextParseError` |
| `safeParseText(value)` | non-throwing `{ ok, document }` / `{ ok, error }` |
| `assertRawText` / `isRawText` | validation alone, keeping the on-disk shape |
| `buildDocument(raw)` | display model from an already-validated `RawText` |
| `parseVerse(verse)` | one raw verse → one `Line` |
| `groupTokens(tokens)` | flat tokens → `(Word \| Compound)[]` |
| `flattenWords(tokens)` | compounds flattened back to words |
| `parseReference(raw)` / `chapterLabel(ref)` | reference strings → structured locus |
| `parseFeatures` / `formatFeatures` / `describeFeatures` / `featureLabel` | `feats` ⇄ object, and glosses (`"singular neuter accusative"`) |
| `occurrencesOfLemma(doc, lemmaId)` / `lemmaFrequencies(doc)` | concordance helpers |
| `renderLine` / `lineToHtml` / `chapterToHtml` / `documentToHtml` / `lineToPlainText` / `wordTitle` | rendering |

Types: `RawText`, `RawVerse`, `RawToken`, `TextDocument`, `Chapter`, `Stanza`,
`Line`, `Word`, `Compound`, `DisplayToken`, `Reference`, `Features`, `Upos`,
`TextStats`, `Segment`, `RenderOptions`.

`Raw*` mirror the JSON exactly; everything else is the display model.

## Layout

```
src/types.ts      on-disk shapes + display model
src/guards.ts     runtime validation with field paths
src/features.ts   feats parsing and glossing
src/reference.ts  reference string parsing
src/tokens.ts     compound grouping
src/parse.ts      document building, grouping, lookups
src/render.ts     segments + reference HTML renderer
test.ts           unit tests + a pass over the real corpus
```

## Tests

Node 22+ runs the TypeScript directly.

```sh
node --test test.ts                 # unit tests + corpus files under 2 MB
npm run test:full                   # the whole corpus (~11s)
DHARMALIB_TEXTS=/path/to/texts node --test test.ts
```

`npm run typecheck` checks `src/` (the test file needs `@types/node`).
