# TypesBCP47

TypeScript library for language tags from [BCP47](https://www.ietf.org/rfc/bcp/bcp47.html)

## Installation

```sh
npm install typesbcp47
```

Class `LanguageUtils` provides static methods for parsing and validating language tags from BCP47.

| Method | Description |
| ------ | ----------- |
| `getTagDescription(tag: string): string` | Returns a language description for the tag if the tag is a valid language tag. Returns `undefined` otherwise. |
| `normalizeCode(code: string): string` | Returns a normalized code if the code is valid. |
| `isCJK(code: string): boolean` | Returns `true` if the language is Chinese, Japanese, Korean, Vietnamese or Aiunu. Returns `false` otherwise. |
| `isBiDi(code: string): boolean` | Returns `true` if the language is written from right to left (Arabic, Hebrew, Persian, Urdu), `false` otherwise. |
| `getLanguages(locale: string): Array<Language>` | Returns an array of `Language` objects with descriptions in the selected `locale`. |
| `getLanguage(code: string, locale: string): Language` | Returns a `Language` object by its code with descriptions in the selected `locale` if the code is valid. Returns `undefined` otherwise. |
| `getCommonLanguages(locale: string): Array<Language>` | Returns an array of most common `Language` objects with descriptions in the selected `locale`. |
| `static isValidLanguageTag(tag: string, caseSensitive?: boolean): boolean` | Returns `true` if the tag is a valid language tag. Returns `false` otherwise. If `caseSensitive` is `true`, the tag must be in correct case to be valid. |

   *Note:* Valid values for `locale` parameter are `en`, `es` and `fr`.

---

You can get information about language tags using the `LanguageUtils` class as shown in the example below:

```ts
import { LanguageUtils } from 'typesbcp47';

const tag : string = 'en-US';
const description : string | undefined = LanguageUtils.getTagDescription(tag);

if (LanguageUtils.isValidLanguageTag(tag)) {
  console.log(`Language tag ${tag} is valid. Description: ${description}`);
} else {
  console.log(`Language tag ${tag} is invalid.`);
}
```
