/*******************************************************************************
 * Copyright (c) 2023 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/
import path = require("path");
import { Language } from "./Language";
import { ContentHandler, DOMBuilder, SAXParser, XMLDocument, XMLElement } from "typesxml";
import { RegistryParser } from "./RegistryParser";

export class LanguageUtils {

    static languages: Array<Language>;
    static commonLanguages: Array<Language>;
    static bidiCodes: Set<string>;
    static registryParser: RegistryParser;

    static isCJK(code: string): boolean {
        return code.startsWith("zh") || code.startsWith("ja") || code.startsWith("ko") || code.startsWith("vi")
            || code.startsWith("ain") || code.startsWith("aib");
    }

    static isBiDi(code: string): boolean {
        if (LanguageUtils.bidiCodes) {
            return LanguageUtils.bidiCodes.has(code);
        }
        LanguageUtils.getLanguages();
        return LanguageUtils.bidiCodes.has(code);
    }

    static getLanguages(): Array<Language> {
        if (LanguageUtils.languages) {
            return LanguageUtils.languages;
        }
        LanguageUtils.languages = new Array<Language>();
        LanguageUtils.bidiCodes = new Set<string>();
        let handler: ContentHandler = new DOMBuilder();
        let parser: SAXParser = new SAXParser();
        parser.setContentHandler(handler);
        let filePath: string = path.join(__dirname, 'extendedLanguageList.xml');
        parser.parse(filePath);
        let doc: XMLDocument = (handler as DOMBuilder).getDocument();
        let root: XMLElement = doc.getRoot();
        let children: Array<XMLElement> = root.getChildren();
        for (let child of children) {
            let code: string = child.getAttribute('code').getValue();
            let bidi: string = child.getAttribute('bidi').getValue();
            let description: string = child.getText();
            if (bidi === 'true') {
                LanguageUtils.bidiCodes.add(code);
            }
            LanguageUtils.languages.push(new Language(code, description));
        }
        return LanguageUtils.languages;
    }

    static getLanguage(code: string): Language {
        if (!LanguageUtils.registryParser) {
            LanguageUtils.registryParser = new RegistryParser();
        }
        code = LanguageUtils.registryParser.normalizeCode(code);
        if (!LanguageUtils.languages) {
            LanguageUtils.getLanguages();
        }
        for (let language of LanguageUtils.languages) {
            if (language.getCode() === code) {
                return language;
            }
        }
        let description = LanguageUtils.registryParser.getTagDescription(code);
        if (description) {
            return new Language(code, description);
        }
        return undefined;
    }

    static normalizeCode(code: string): string {
        if (!LanguageUtils.registryParser) {
            LanguageUtils.registryParser = new RegistryParser();
        }
        return LanguageUtils.registryParser.normalizeCode(code);
    }

    static getCommonLanguages(): Array<Language> {
        if (LanguageUtils.commonLanguages) {
            return LanguageUtils.commonLanguages;
        }
        LanguageUtils.commonLanguages = [];
        if (!LanguageUtils.bidiCodes) {
            LanguageUtils.bidiCodes = new Set<string>();
        }
        let handler: ContentHandler = new DOMBuilder();
        let parser: SAXParser = new SAXParser();
        parser.setContentHandler(handler);
        let filePath: string = path.join(__dirname, 'languageList.xml');
        parser.parse(filePath);
        let doc: XMLDocument = (handler as DOMBuilder).getDocument();
        let root: XMLElement = doc.getRoot();
        let children: Array<XMLElement> = root.getChildren();
        for (let child of children) {
            let code: string = child.getAttribute('code').getValue();
            let bidi: string = child.getAttribute('bidi').getValue();
            let description: string = child.getText();
            if (bidi === 'true') {
                LanguageUtils.bidiCodes.add(code);
            }
            LanguageUtils.commonLanguages.push(new Language(code, description));
        }
        return LanguageUtils.commonLanguages;
    }

    static getTagDescription(tag: string): string {
        if (!LanguageUtils.registryParser) {
            LanguageUtils.registryParser = new RegistryParser();
        }
        return LanguageUtils.registryParser.getTagDescription(tag);
    }
}