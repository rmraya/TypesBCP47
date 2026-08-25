# TypesBCP47

[![npm version](https://img.shields.io/npm/v/typesbcp47)](https://www.npmjs.com/package/typesbcp47)
[![npm license](https://img.shields.io/npm/l/typesbcp47)](LICENSE)
[![TypeScript](https://img.shields.io/badge/implementation-native%20TypeScript-3178c6)](https://www.typescriptlang.org/)

TypeScript/Node.js library that parses the [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry) and exposes it as typed objects, to validate, normalize and describe [BCP 47](https://www.ietf.org/rfc/bcp/bcp47.html) language tags.

## Installation

```sh
npm install typesbcp47
```

## How it works

The package bundles a copy of `language-subtag-registry.txt` (the raw IANA registry file) and parses it at runtime with `RegistryParser` — there are no network calls. The registry's `File-Date` can be read with `RegistryParser.getRegistryDate()`.

Only the `language`, `region`, `script` and `variant` record types are loaded into memory. `extlang`, `grandfathered` and `redundant` records (over 350 entries combined) are parsed but not indexed, so tags that rely on them (e.g. grandfathered tags like `art-lojban`, or extlang subtags like `ar-afb`) are not recognized by `isValidLanguageTag`/`normalizeCode`/`getTagDescription`.

A second, independent data source is used for locale-aware language names: `extendedLanguageList_{locale}.xml` (~866 entries, includes language+region combinations such as `af-NA`) and `languageList_{locale}.xml` (~336 "common" entries). These are curated/translated name lists, not derived from the IANA registry, and are currently shipped only for **`en`, `es` and `fr`** — requesting any other locale throws. `LanguageUtils.isBiDi()` also reads its data from these files, not from the registry.

## Runtime notes

- **Node.js only.** Resources are read from disk relative to the compiled module's location (`node:fs`/`node:path`/`node:url`); the package is not meant to be bundled directly for the browser.
- **ESM only** — `package.json` sets `"type": "module"` and the `exports` map has no `require` condition.
- Depends on [`typesxml`](https://www.npmjs.com/package/typesxml) (same author) for XML parsing of the resource files.
- `LanguageUtils` keeps static, process-wide caches (`registryParser` singleton, `languagesCache` per locale, `bidiCodes`). Data is parsed once, lazily, on first use, and reused for the life of the process — it is not reloaded or invalidated afterwards.

## Exported classes

| Class | Purpose |
| ----- | ------- |
| `LanguageUtils` | Static facade — the main entry point, see table below. |
| `RegistryParser` | Parses `language-subtag-registry.txt` into `languages`/`regions`/`scripts`/`variants` maps and private-use ranges. Exposes `getRegistryDate()`. `LanguageUtils` creates one lazily on first use; you can also instantiate it directly for lower-level access to the parsed registry. |
| `RegistryEntry` | One raw `%%`-delimited record from the registry file, exposed as a `Type`/`Subtag`/`Description`/... key-value map via `get(type)`. |
| `Language` | `code` + `description`, plus `getSuppressedScript()`, `isCJK()`, `isBiDi()` (the last two delegate to `LanguageUtils`). |
| `Region`, `Script`, `Variant` | `code` + `description` wrappers (`Variant` also carries `getPrefix()`, the language it's registered under). |

## `LanguageUtils` API

| Method | Description |
| ------ | ----------- |
| `isValidLanguageTag(tag: string, caseSensitive?: boolean): boolean` | Validates a tag against the registry. `x-...` and `...-x-...` private-use tags are always accepted without a registry lookup. If `caseSensitive` is `true`, the tag must already be in its canonical case (see `normalizeCode`). |
| `normalizeCode(code: string): string \| undefined` | Returns the canonical form of a tag: language lowercase, region uppercase (or the registry's UN M.49 numeric code as-is), script title-case, variant lowercase. Returns `undefined` if the tag doesn't resolve against the registry. |
| `getTagDescription(tag: string): string \| undefined` | Builds a human-readable description by composing subtag descriptions from the registry, e.g. `en-GB` → `English (United Kingdom)`. Handles at most **3 subtags** (language + one of script/region/variant + one more of region/variant); does not compose descriptions for tags with 4+ subtags or more than one variant. Returns `undefined` for an unknown tag, and also when the script subtag matches the language's `Suppress-Script` (e.g. `en-Latn`, since it's redundant). |
| `getLanguage(code: string, locale: string): Language \| undefined` | Looks up a `Language` by code, normalizing it first; description is in `locale`. |
| `getLanguages(locale: string): Array<Language>` | All ~866 entries from `extendedLanguageList_{locale}.xml`, sorted by description using `locale`-aware collation. |
| `getCommonLanguages(locale: string): Array<Language>` | The smaller ~336-entry curated subset from `languageList_{locale}.xml`. |
| `isCJK(code: string): boolean` | Pure prefix check on the code — `true` if it starts with `zh`, `ja`, `ko`, `vi`, `ain` or `aib`. Not a registry lookup. |
| `isBiDi(code: string): boolean` | `true` if `code` is one of the languages flagged `bidi="true"` in the locale XML (currently: `ar`, `ckb`, `fa`, `he`, `ks`, `lrc`, `mzn`, `ps`, `sd`, `ug`, `ur`, `yi`). Lazily loads the `en` list on first call if no locale data has been loaded yet. |

*Note:* `locale` parameters accept `en`, `es` or `fr` only.

## Example

```ts
import { LanguageUtils } from 'typesbcp47';

const tag = 'en-GB';

if (LanguageUtils.isValidLanguageTag(tag)) {
  console.log(LanguageUtils.getTagDescription(tag)); // "English (United Kingdom)"
  console.log(LanguageUtils.normalizeCode('EN-gb'));  // "en-GB"
  console.log(LanguageUtils.isBiDi('ar'));            // true
  console.log(LanguageUtils.isCJK('ja'));              // true
}

const language = LanguageUtils.getLanguage('fr-CA', 'es');
if (language) {
  console.log(language.getDescription()); // Spanish-language description of "fr-CA"
}
```
