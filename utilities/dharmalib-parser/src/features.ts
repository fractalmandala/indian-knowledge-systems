import type { Features } from './types.ts';
import { UNRESOLVED } from './types.ts';

/** Parse a `Key=Value|Key=Value` feats string. `_` and `''` give `{}`. */
export function parseFeatures(feats: string | undefined | null): Features {
	const out: Features = {};
	if (!feats || feats === UNRESOLVED) return out;
	for (const pair of feats.split('|')) {
		const eq = pair.indexOf('=');
		if (eq < 1) continue;
		out[pair.slice(0, eq)] = pair.slice(eq + 1);
	}
	return out;
}

/** Serialise features back to the corpus's string form. */
export function formatFeatures(features: Features): string {
	const parts: string[] = [];
	for (const [key, value] of Object.entries(features)) {
		if (value !== undefined) parts.push(`${key}=${value}`);
	}
	return parts.join('|');
}

const LABELS: Record<string, Record<string, string>> = {
	Case: {
		Nom: 'nominative', Acc: 'accusative', Ins: 'instrumental', Dat: 'dative',
		Abl: 'ablative', Gen: 'genitive', Loc: 'locative', Voc: 'vocative',
		Cpd: 'compound stem'
	},
	Gender: { Masc: 'masculine', Fem: 'feminine', Neut: 'neuter' },
	Number: { Sing: 'singular', Dual: 'dual', Plur: 'plural' },
	Tense: { Pres: 'present', Impf: 'imperfect', Past: 'aorist/past', Plp: 'pluperfect', Fut: 'future' },
	Mood: {
		Ind: 'indicative', Imp: 'imperative', Opt: 'optative', Sub: 'subjunctive',
		Jus: 'injunctive', Con: 'conditional', Cond: 'conditional', Prec: 'precative'
	},
	Person: { '1': '1st person', '2': '2nd person', '3': '3rd person' },
	VerbForm: { Part: 'participle', Conv: 'absolutive', Inf: 'infinitive', Gdv: 'gerundive' },
	Voice: { Pass: 'passive' },
	Formation: {
		root: 'root formation', them: 'thematic', red: 'reduplicated',
		s: 's-formation', sa: 'sa-formation', is: 'iṣ-formation', peri: 'periphrastic'
	}
};

const ORDER = ['Person', 'Number', 'Gender', 'Case', 'Tense', 'Mood', 'Voice', 'VerbForm', 'Formation'];

/** Human-readable gloss for one feature pair, falling back to the raw value. */
export function featureLabel(key: string, value: string): string {
	return LABELS[key]?.[value] ?? value;
}

/** Readable summary, e.g. `accusative neuter singular`. */
export function describeFeatures(features: Features): string {
	const keys = Object.keys(features).sort((a, b) => {
		const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b);
		return (ai === -1 ? ORDER.length : ai) - (bi === -1 ? ORDER.length : bi);
	});
	return keys
		.map((key) => featureLabel(key, features[key] as string))
		.filter(Boolean)
		.join(' ');
}
