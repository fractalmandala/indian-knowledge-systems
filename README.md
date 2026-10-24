# IKS

Monorepo for work on IKS tech. (indian knowledge systems). 
High level goals:

- Design and develop ontology-based AI systems to organize and represent complex civilizational knowledge.
- Build knowledge graphs that capture concepts, relationships, schools of thought (SOT), texts, thinkers, and philosophical frameworks.
- Develop AI-powered question-answering systems using canonical repositories of books, research, videos, and other content.
- Implement LLMs, Retrieval-Augmented Generation (RAG), GraphRAG, semantic search, and related technologies.
- Build pipelines to ingest, process, classify, and connect large volumes of structured and unstructured content.
- Ensure answers are accurate, source-grounded, traceable, and reflect Indic knowledge traditions without ideological or cultural distortions.
- Develop methods to minimize hallucinations, identify knowledge gaps, and evaluate the quality and reliability of AI-generated responses. Build and use evaluation datasets for multi-turn and adversarial tests, regression checks to assess retrieval, citation accuracy, and SOT fidelity.
- Translate complex intellectual frameworks into computational knowledge structures.

> Read `SYNAPTICVISION` for synaptic reconnection goal.

## projects and repos
Repo links are currently local drive links, and those sources are not on Github. This is due to large size of data. Needs eventual resolution.

- current lead project is [Dharmalib](https://www.dharmalib.in) - `~/dharmalib` | [Github](https://github.com/fractalmandala/dharmalib)
- secondary project [Bodha Open Library](https://www.bodharesearch.in/library) - `~/Documents/GitHub/bodhaNew2/src/lib/serving/library-items.json`

### Sanskrit repo - `~/SanskritRepo`
- `/texts` - 260 sanskrit texts in markdown.
- `/sanskritrepo` - various collections from [DSC Cologne](https://www.sanskrit-lexicon.uni-koeln.de/) data
	-	lemma index
	- semantic concepts
	- lexical helpers
	- dictionaries
	- some translation text files
- `/scriptures-conllu`

### Dharmalib Data
Dharmalib data sits inside its own folder, as static content.
- core DSC Cologne data: 250+ texts in `.json` form. Rigvda, Ramayana, and Mahabharata collections are huge. Mahabharata has to be split in two.
- various lemma, dhata, text helper files.

The data in these json files has flat compounds. A compound appears as a header token carrying `compoundEnd` plus the full printed surface, with `_` for `lemma/upos/feats` - then its member tokens follow inline. Headers never nest, and member ids repeat the header’s range, so ids aren’t unique within a verse. Any renderer that treats the token list as a plain sequence will print the compound twice.

A “verse” is a line. `reference` is `Siglum, [division, …]dotted.numbers` - `Bhairavastava`, `1.1`, `AĀ`, `2`, `1`, `5.4`, `AHS, Cikitsitasthāna`, `8.104.2`. A third number (1.1.2) is another line of the same stanza, so lines must be grouped by reference rather than rendered one-per-stanza.

See `utilities/dharmalib-parser` for more.

## Contact and License

The IKS repo and project, along with Dharmalib and Bodha Open Library, is maintained by [Bodha](https://www.bodharesearch.in) and cofounder [Amrit](https://github.com/fractalmandala).

Everything in the repo is completely open source, under [MIT License]