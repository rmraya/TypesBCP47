# TypesBCP47

TypeScript library for language tags from BCP47

## Installation

```sh
npm install typesbcp47
```

Class `LanguageUtils` provides static methods for parsing and validating language tags from BCP47.

Method | Description
--- | ---
`getTagDescription(tag: string): string` | Returns a language description for the tag if the tag is a valid language tag. Returns `undefined` otherwise.
`normalizeCode(code: string): string` | Returns a normalized code if the code is valid. Returns `isCJK(code: string): boolean` | Returns `true` if the language is Chinese, Japanese, Korean, Vietnamese or Aiunu. Returns `false` otherwise.
`isBiDi(code: string): boolean` | Returns `true` if the language is written from right to left (Arabic, Hebrew, Persian, Urdu), `false` otherwise.
`getLanguages(): Array<Language>` |  Returns an array of `Language` objects from the list maintained by [ICU (International Components for Unicode)](https://icu.unicode.org/).
`getLanguage(code: string): Language` | Returns a `Language` object by its code if the code is valid. Returns `undefined` otherwise.
`getCommonLanguages(): Array<Language>` | Returns an array of most common `Language` objects.

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
    if tag === normalizedCode {
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
