import type { Compound, DisplayToken, RawToken, Word } from './types.ts';
import { UNRESOLVED } from './types.ts';
import { parseFeatures } from './features.ts';

/** True when the token announces a compound rather than carrying an analysis. */
export function isCompoundHeader(token: RawToken): boolean {
	return token.compoundEnd !== undefined;
}

function toWord(token: RawToken, inCompound: boolean): Word {
	return {
		kind: 'word',
		id: token.id,
		form: token.form,
		lemma: token.lemma,
		lemmaId: token.lemma_id,
		upos: token.upos,
		feats: token.feats,
		features: parseFeatures(token.feats),
		slug: token.slug,
		inCompound,
		unresolved: token.lemma === UNRESOLVED || token.lemma_id === 0
	};
}

/**
 * Turn a verse's flat token list into renderable units.
 *
 * A header token (`compoundEnd` set) owns the tokens that follow it, up to and
 * including the one whose `id` equals `compoundEnd`. Members are never
 * themselves headers, so no recursion is needed; a truncated or malformed
 * compound simply takes the members that are there.
 */
export function groupTokens(tokens: RawToken[]): DisplayToken[] {
	const out: DisplayToken[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (!isCompoundHeader(token)) {
			out.push(toWord(token, false));
			continue;
		}
		const endId = token.compoundEnd as number;
		const members: Word[] = [];
		let j = i + 1;
		for (; j < tokens.length; j++) {
			const member = tokens[j];
			if (isCompoundHeader(member)) break;
			members.push(toWord(member, true));
			if (member.id >= endId) {
				j++;
				break;
			}
		}
		i = j - 1;
		const compound: Compound = {
			kind: 'compound',
			id: token.id,
			endId,
			form: token.form,
			slug: token.slug,
			members
		};
		out.push(compound);
	}
	return out;
}

/** Every word in order, compounds flattened. */
export function flattenWords(tokens: DisplayToken[]): Word[] {
	const words: Word[] = [];
	for (const token of tokens) {
		if (token.kind === 'word') words.push(token);
		else words.push(...token.members);
	}
	return words;
}

/** The surface text of a unit — a word's form, or a compound's whole form. */
export function surfaceOf(token: DisplayToken): string {
	return token.form;
}
