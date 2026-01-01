/*******************************************************************************
 * Copyright (c) 2023-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/
import { join } from "node:path";
import { existsSync } from "node:fs";
import { ContentHandler, DOMBuilder, SAXParser, XMLAttribute, XMLDocument, XMLElement } from "typesxml";
import { Language } from "./Language.js";
import { RegistryParser } from "./RegistryParser.js";

export class LanguageUtils {

    static bidiCodes: Set<string> | undefined;
    static languagesCache: Map<string, Array<Language>> = new Map();
    static registryParser: RegistryParser;

    static isCJK(code: string): boolean {
        return code.startsWith("zh") || code.startsWith("ja") || code.startsWith("ko") || code.startsWith("vi")
            || code.startsWith("ain") || code.startsWith("aib");
    }

    static isBiDi(code: string): boolean {
        if (!LanguageUtils.bidiCodes) {
            LanguageUtils.getLanguages('en');
        }
        if (!LanguageUtils.bidiCodes) {
            throw new Error('Bidi codes not initialized');
        }
        return LanguageUtils.bidiCodes.has(code);
    }


    static getLanguages(locale: string): Array<Language> {
        // Check if languages are already cached for this locale
        if (LanguageUtils.languagesCache.has(locale)) {
            return LanguageUtils.languagesCache.get(locale)!;
        }

        let languages: Array<Language> = new Array<Language>();
        LanguageUtils.bidiCodes = new Set<string>();

        let handler: ContentHandler = new DOMBuilder();
        let parser: SAXParser = new SAXParser();
        parser.setContentHandler(handler);
        let filePath: string = join(__dirname, 'extendedLanguageList_' + locale + '.xml');
        if (!existsSync(filePath)) {
            throw new Error('Extended language list does not exist for ' + locale);
        }
        parser.parseFile(filePath);
        let doc: XMLDocument | undefined = (handler as DOMBuilder).getDocument();
        if (!doc) {
            throw new Error('Invalid XML extended language list');
        }
        let root: XMLElement | undefined = doc.getRoot();
        if (!root) {
            throw new Error('Invalid XML extended language list: no root element');
        }
        let children: Array<XMLElement> = root.getChildren();
        for (let child of children) {
            let codeAttr = child.getAttribute('code');
            if (!codeAttr) {
                throw new Error('Invalid language element: missing required code attribute');
            }
            let code: string = codeAttr.getValue();
            let description: string = child.getText();

            // Check for optional bidi attribute
            let bidiAttr = child.getAttribute('bidi');
            if (bidiAttr && bidiAttr.getValue() === 'true') {
                LanguageUtils.bidiCodes.add(code);
            }

            languages.push(new Language(code, description));
        }
        languages.sort((a: Language, b: Language) => {
            return a.getDescription().localeCompare(b.getDescription(), locale);
        });

        // Cache the languages for this locale
        LanguageUtils.languagesCache.set(locale, languages);
        return languages;
    }

    static getLanguage(code: string, locale: string): Language | undefined {
        if (!LanguageUtils.registryParser) {
            LanguageUtils.registryParser = new RegistryParser();
        }
        let normalized: string | undefined = LanguageUtils.registryParser.normalizeCode(code);
        if (normalized) {
            let languages: Array<Language> = LanguageUtils.getLanguages(locale);
            for (let language of languages) {
                if (language.getCode() === normalized) {
                    return language;
                }
            }
            let description = LanguageUtils.registryParser.getTagDescription(normalized);
            if (description) {
                return new Language(code, description);
            }
        }
        return undefined;
    }

    static normalizeCode(code: string): string | undefined {
        if (!LanguageUtils.registryParser) {
            LanguageUtils.registryParser = new RegistryParser();
        }
        return LanguageUtils.registryParser.normalizeCode(code);
    }

    static getCommonLanguages(locale: string): Array<Language> {
        let commonLanguages: Array<Language> = [];
        let handler: ContentHandler = new DOMBuilder();
        let parser: SAXParser = new SAXParser();
        parser.setContentHandler(handler);
        let filePath: string = join(__dirname, 'languageList_' + locale + '.xml');
        if (!existsSync(filePath)) {
            throw new Error('Language list does not exist for ' + locale);
        }
        parser.parseFile(filePath);
        let doc: XMLDocument | undefined = (handler as DOMBuilder).getDocument();
        if (!doc) {
            throw new Error('Invalid XML language list');
        }
        let root: XMLElement | undefined = doc.getRoot();
        if (!root) {
            throw new Error('Invalid XML document: no root element');
        }
        let children: Array<XMLElement> = root.getChildren();
        for (let child of children) {
            let codeAttr: XMLAttribute | undefined = child.getAttribute('code');
            if (!codeAttr) {
                throw new Error('Invalid language list: no code attribute');
            }
            let code: string = codeAttr.getValue();
            let description: string = child.getText();
            commonLanguages.push(new Language(code, description));
        }
        commonLanguages.sort((a: Language, b: Language) => {
            return a.getDescription().localeCompare(b.getDescription(), locale);
        });
        return commonLanguages;
    }

    static getTagDescription(tag: string): string | undefined {
        if (!LanguageUtils.registryParser) {
            LanguageUtils.registryParser = new RegistryParser();
        }
        return LanguageUtils.registryParser.getTagDescription(tag);
    }
}