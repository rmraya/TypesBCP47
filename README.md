# TypesBCP47

TypeScript library for language tags from [BCP47](https://www.ietf.org/rfc/bcp/bcp47.html)

## Installation

```sh
npm install typesbcp47
```

Class `LanguageUtils` provides static methods for parsing and validating language tags from BCP47.

Method | Description
--- | ---
`getTagDescription(tag: string): string` | Returns a language description for the tag if the tag is a valid language tag. Returns `undefined` otherwise.
`normalizeCode(code: string): string` | Returns a normalized code if the code is valid.
`isCJK(code: string): boolean` | Returns `true` if the language is Chinese, Japanese, Korean, Vietnamese or Aiunu. Returns `false` otherwise.
`isBiDi(code: string): boolean` | Returns `true` if the language is written from right to left (Arabic, Hebrew, Persian, Urdu), `false` otherwise.
`getLanguages(locale: string): Array<Language>` |  Returns an array of `Language` objects with descriptions in the selected `locale`.
`getLanguage(code: string, locale: string): Language` | Returns a `Language` object by its code with descriptions in the selected `locale` if the code is valid. Returns `undefined` otherwise.
`getCommonLanguages(locale: string): Array<Language>` | Returns an array of most common `Language` objects with descriptions in the selected `locale`.

Valid values for `locale` parameter are `en`, `es` and `fr`.

You can combine these methods to validate language tags:

```ts
import { LanguageUtils } from 'typesbcp47';

const tag = 'en-US';
const description = LanguageUtils.getTagDescription(tag);

if (description) {
  console.log(`Language tag ${tag} is valid. Description: ${description}`);
} else {
  console.log(`Language tag ${tag} is invalid.`);
}

// a common problem with language tags is wrong casing for the code
// this can be fixed by normalizing the code

const normalizedCode = LanguageUtils.normalizeCode(tag);

if (normalizedCode) {
    // language exists
    if (tag === normalizedCode) {
        // language tag is OK
        console.log(`Language tag ${tag} is valid.`);
    } else {
        // language tag is not normalized
        console.log(`Language code is incorrect, it should be ${normalizedCode}`)
    }
} else {
  console.log(`Code ${tag} is invalid.`);
}
```
