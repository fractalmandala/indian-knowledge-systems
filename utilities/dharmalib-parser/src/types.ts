// Core shapes of a Dharmalib text JSON file (static/data/texts/*.json).
//
// Every file in the corpus has the same shape:
//   { slug, title, verses: [ { index, reference, devanagari, iast, tokens: [...] } ] }
// Tokens are a flat list in which a compound is announced by a header token
// carrying `compoundEnd`, followed by its member tokens.

/** Universal POS tag used by the corpus, plus `_` for compound headers. */
export type Upos =
	| 'NOUN' | 'VERB' | 'ADJ' | 'PRON' | 'PART' | 'ADV'
	| 'CONJ' | 'SCONJ' | 'NUM' | 'ADP' | 'INTJ'
	| typeof UNRESOLVED;

/** Placeholder the corpus uses for a compound header's unanalysed fields. */
export const UNRESOLVED = '_';

export type Case = 'Nom' | 'Acc' | 'Ins' | 'Dat' | 'Abl' | 'Gen' | 'Loc' | 'Voc' | 'Cpd';
export type Gender = 'Masc' | 'Fem' | 'Neut';
export type GrammaticalNumber = 'Sing' | 'Dual' | 'Plur';
export type Tense = 'Pres' | 'Impf' | 'Past' | 'Plp' | 'Fut';
export type Mood = 'Ind' | 'Imp' | 'Opt' | 'Sub' | 'Jus' | 'Con' | 'Cond' | 'Prec';
export type Person = '1' | '2' | '3';
export type VerbForm = 'Part' | 'Conv' | 'Inf' | 'Gdv';
export type Voice = 'Pass';
export type Formation = 'root' | 'them' | 'red' | 's' | 'sa' | 'is' | 'peri';

/** `feats` parsed out of its `Key=Value|Key=Value` string form. */
export interface Features {
	Case?: Case;
	Gender?: Gender;
	Number?: GrammaticalNumber;
	Tense?: Tense;
	Mood?: Mood;
	Person?: Person;
	VerbForm?: VerbForm;
	Voice?: Voice;
	Formation?: Formation;
	/** Anything the corpus adds later survives here. */
	[key: string]: string | undefined;
}

/** A token exactly as it appears in the JSON. */
export interface RawToken {
	id: number;
	form: string;
	lemma: string;
	lemma_id: number;
	upos: Upos;
	feats: string;
	slug: string;
	/**
	 * Present only on a compound header: the `id` of the last member token.
	 * The header itself carries `_` for lemma/upos/feats and the full surface
	 * form; the members follow it in the list.
	 */
	compoundEnd?: number;
}

/** A verse (one line of text) exactly as it appears in the JSON. */
export interface RawVerse {
	index: number;
	reference: string;
	devanagari: string;
	iast: string;
	tokens: RawToken[];
}

/** A whole text file exactly as it appears on disk. */
export interface RawText {
	slug: string;
	title: string;
	verses: RawVerse[];
}

// ---------------------------------------------------------------------------
// Display model — what a renderer actually walks.
// ---------------------------------------------------------------------------

/** A single analysed word, whether standalone or inside a compound. */
export interface Word {
	kind: 'word';
	id: number;
	/** Surface form as printed. */
	form: string;
	lemma: string;
	lemmaId: number;
	upos: Upos;
	/** Raw `feats` string, kept for round-tripping. */
	feats: string;
	/** Parsed `feats`. */
	features: Features;
	/** Link target for the lemma/word explorer. */
	slug: string;
	/** True when this word is a member of an enclosing compound. */
	inCompound: boolean;
	/** `true` when the corpus left the analysis unresolved (`_`). */
	unresolved: boolean;
}

/** A compound: one printed surface form that resolves into several words. */
export interface Compound {
	kind: 'compound';
	/** `id` of the first member, taken from the header token. */
	id: number;
	/** `compoundEnd` from the header token. */
	endId: number;
	/** The compound as printed in the line. */
	form: string;
	slug: string;
	members: Word[];
}

/** One renderable unit of a line: a word, or a compound holding words. */
export type DisplayToken = Word | Compound;

/** A parsed `reference` string, e.g. `"AHS, Cikitsitasthāna, 8.104.2"`. */
export interface Reference {
	/** The string as given. */
	raw: string;
	/** Leading siglum, e.g. `AHS`, `BhāgPur`, `Amṛtabindūpaniṣat`. */
	siglum: string;
	/** Comma-separated divisions between siglum and the numeric locus. */
	divisions: string[];
	/** The final dotted group, e.g. `8.104.2` → `[8, 104, 2]`. */
	numbers: number[];
	/** `numbers[0]` — chapter / kāṇḍa / sarga, when present. */
	chapter?: number;
	/** `numbers[1]` — verse within the chapter, when present. */
	verse?: number;
	/** `numbers[2]` — line (pāda group) within the verse, when present. */
	line?: number;
	/**
	 * Identity of the stanza this line belongs to: everything but the trailing
	 * line number. Consecutive lines of one stanza share it.
	 */
	stanzaKey: string;
	/** Identity of the enclosing chapter: divisions plus `chapter`. */
	chapterKey: string;
}

/** A verse line, parsed and ready to render. */
export interface Line {
	/** `index` from the JSON — stable position in the file. */
	index: number;
	reference: Reference;
	devanagari: string;
	iast: string;
	/** Compound-aware token tree. */
	tokens: DisplayToken[];
	/** Every word, compounds flattened — for counting and indexing. */
	words: Word[];
}

/** Lines that share a stanza number, in file order. */
export interface Stanza {
	key: string;
	/** Stanza number within its chapter, when the reference gives one. */
	number?: number;
	lines: Line[];
}

/** Stanzas that share a chapter, in file order. */
export interface Chapter {
	key: string;
	/** Numeric chapter, when the reference gives one. */
	number?: number;
	/** Named divisions above the chapter, e.g. `["Cikitsitasthāna"]`. */
	divisions: string[];
	/** Human label built from divisions + number. */
	label: string;
	stanzas: Stanza[];
}

/** A whole text, parsed and grouped for display. */
export interface TextDocument {
	slug: string;
	title: string;
	/** Siglum shared by the file's references, when consistent. */
	siglum?: string;
	lines: Line[];
	chapters: Chapter[];
	stats: TextStats;
}

export interface TextStats {
	lines: number;
	stanzas: number;
	chapters: number;
	tokens: number;
	words: number;
	compounds: number;
	/** Distinct `lemma_id` values, ignoring unresolved tokens. */
	distinctLemmas: number;
}
