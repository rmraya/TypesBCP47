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

import { Stats, openSync, readSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLUtils } from "typesxml";
import { Language } from "./Language.js";
import { Region } from "./Region.js";
import { RegistryEntry } from "./RegistryEntry.js";
import { Script } from "./Script.js";
import { Variant } from "./Variant.js";

const moduleDir: string = fileURLToPath(new URL('.', import.meta.url));
const registryDirs: Array<string> = [moduleDir, join(moduleDir, '..')];

export class RegistryParser {

    entries: Array<RegistryEntry>;
    languages: Map<string, Language>;
    regions: Map<string, Region>;
    scripts: Map<string, Script>;
    variants: Map<string, Variant>;

    // Private-use ranges
    privateLanguageStart: string | undefined;
    privateLanguageEnd: string | undefined;
    privateScriptStart: string | undefined;
    privateScriptEnd: string | undefined;
    privateRegionRanges: string[][];

    constructor() {
        this.entries = new Array<RegistryEntry>();
        this.languages = new Map<string, Language>();
        this.regions = new Map<string, Region>();
        this.scripts = new Map<string, Script>();
        this.variants = new Map<string, Variant>();
        this.privateRegionRanges = [];

        let filePath: string = RegistryParser.resolveRegistryPath();
        let stats: Stats = statSync(filePath, { bigint: false, throwIfNoEntry: true });
        let blockSize: number = stats.blksize;
        let fileHandle: number = openSync(filePath, 'r');
        let buffer: Buffer = Buffer.alloc(blockSize, 'utf8');
        let bytesRead: number = readSync(fileHandle, buffer, 0, blockSize, 0);
        let registryText: string = buffer.toString('utf8', 0, bytesRead);
        let position: number = bytesRead;
        while (bytesRead > 0) {
            bytesRead = readSync(fileHandle, buffer, 0, blockSize, position);
            registryText += buffer.toString('utf8', 0, bytesRead);
            position += bytesRead;
        }

        let lines = registryText.split('\n');
        let stringBuffer: string = '';
        for (let line of lines) {
            if (line.trim() === '%%') {
                this.entries.push(new RegistryEntry(stringBuffer));
                stringBuffer = '';
            } else {
                if (stringBuffer.length > 0) {
                    stringBuffer += '\n';
                }
                stringBuffer += line;
            }
        }

        let regionRangesList: string[][] = [];
        for (let entry of this.entries) {
            let type: string | undefined = entry.getType();
            if (!type) {
                continue;
            }
            if (type === 'language') {
                let description: string | undefined = entry.getDescription();
                if (!description) {
                    throw new Error('Invalid language entry: missing description');
                }
                let subtag: string | undefined = entry.getSubtag();
                if (subtag && subtag.indexOf('..') !== -1) {
                    // Private-use range like "qaa..qtz"
                    let range: string[] = subtag.split('..');
                    if (range.length === 2) {
                        this.privateLanguageStart = range[0].toLowerCase();
                        this.privateLanguageEnd = range[1].toLowerCase();
                    }
                    continue;
                }
                if (subtag) {
                    if (description.indexOf('|') != -1) {
                        // trim and use only the first name
                        description = description.substring(0, description.indexOf('|') - 1);
                    }
                    if (subtag === 'el') {
                        // official description is "Modern Greek (1453-)", use a familiar name
                        description = 'Greek';
                    }
                    description = description.replace(/'\\(.*\\)'/, '').trim();
                    let lang: Language = new Language(subtag, description);
                    let suppressedScript: string | undefined = entry.get('Suppress-Script');
                    if (suppressedScript) {
                        lang.setSuppressedScript(suppressedScript);
                    }
                    this.languages.set(subtag, lang);
                }
            }
            if (type === 'region') {
                let description: string | undefined = entry.getDescription();
                if (!description) {
                    throw new Error('Invalid region entry: missing description');
                }
                let subtag: string | undefined = entry.getSubtag();
                if (subtag && subtag.indexOf('..') !== -1) {
                    // Private-use range like "QM..QZ" or "XA..XZ"
                    let range: string[] = subtag.split('..');
                    if (range.length === 2) {
                        regionRangesList.push([range[0].toUpperCase(), range[1].toUpperCase()]);
                    }
                    continue;
                }
                if (subtag) {
                    this.regions.set(subtag, new Region(subtag, description.trim()));
                }
            }
            if (type === 'script') {
                let description: string | undefined = entry.getDescription();
                if (!description) {
                    throw new Error('Invalid script entry: missing description');
                }
                description = XMLUtils.replaceAll(description, '(', '[');
                description = XMLUtils.replaceAll(description, ')', ']');
                let subtag: string | undefined = entry.getSubtag();
                if (subtag && subtag.indexOf('..') !== -1) {
                    // Private-use range like "Qaaa..Qabx"
                    let range: string[] = subtag.split('..');
                    if (range.length === 2) {
                        this.privateScriptStart = range[0].substring(0, 1).toUpperCase() + range[0].substring(1).toLowerCase();
                        this.privateScriptEnd = range[1].substring(0, 1).toUpperCase() + range[1].substring(1).toLowerCase();
                    }
                    continue;
                }
                if (subtag) {
                    this.scripts.set(subtag, new Script(subtag, description.trim()));
                }
            }
            if (type === 'variant') {
                let description: string | undefined = entry.getDescription();
                if (!description) {
                    throw new Error('Invalid variant entry: missing description');
                }
                description = XMLUtils.replaceAll(description, '(', '[');
                description = XMLUtils.replaceAll(description, ')', ']');
                let subtag: string | undefined = entry.getSubtag();
                let prefix: string | undefined = entry.get('Prefix');
                if (subtag) {
                    // Not all variants have a "Prefix" field, but most do.
                    // According to the BCP 47 registry, a variant SHOULD have at least one prefix, but there are rare cases (like "fonipa") with none.
                    // If prefix is undefined, pass an empty string.
                    this.variants.set(subtag, new Variant(subtag, description.trim(), prefix ?? ''));
                }
            }
        }
        this.privateRegionRanges = regionRangesList;
    }

    private static resolveRegistryPath(): string {
        for (const dir of registryDirs) {
            const candidate = join(dir, 'language-subtag-registry.txt');
            if (existsSync(candidate)) {
                return candidate;
            }
        }
        throw new Error('language-subtag-registry.txt not found');
    }

    private isPrivateLanguage(code: string): boolean {
        if (!this.privateLanguageStart || !this.privateLanguageEnd) {
            return false;
        }
        let lowerCode: string = code.toLowerCase();
        return lowerCode >= this.privateLanguageStart && lowerCode <= this.privateLanguageEnd;
    }

    private isPrivateScript(code: string): boolean {
        if (!this.privateScriptStart || !this.privateScriptEnd) {
            return false;
        }
        let normalizedCode: string = code.substring(0, 1).toUpperCase() + code.substring(1).toLowerCase();
        return normalizedCode >= this.privateScriptStart && normalizedCode <= this.privateScriptEnd;
    }

    private isPrivateRegion(code: string): boolean {
        let upperCode: string = code.toUpperCase();
        for (let range of this.privateRegionRanges) {
            if (upperCode >= range[0] && upperCode <= range[1]) {
                return true;
            }
        }
        return false;
    }

    getRegistryDate(): string | undefined {
        for (let entry of this.entries) {
            let date = entry.get('File-Date');
            if (date) {
                return date;
            }
        }
        return undefined;
    }

    getTagDescription(tag: string): string | undefined {
        let parts: string[] = tag.split('-');
        if (parts.length === 1) {
            // language part only
            let lang: Language | undefined = this.languages.get(tag.toLowerCase());
            if (lang) {
                return lang.getDescription();
            }
            if (this.isPrivateLanguage(tag)) {
                return 'Private Use';
            }
        } else if (parts.length === 2) {
            // contains either script or region
            let isPrivateLang: boolean = this.isPrivateLanguage(parts[0]);
            if (!this.languages.has(parts[0].toLowerCase()) && !isPrivateLang) {
                return undefined;
            }
            let langDesc: string = isPrivateLang ? 'Private Use' : this.languages.get(parts[0].toLowerCase())!.getDescription();
            let lang: Language | undefined = isPrivateLang ? undefined : this.languages.get(parts[0].toLowerCase());
            if (parts[1].length === 2 && (this.regions.has(parts[1].toUpperCase()) || this.isPrivateRegion(parts[1]))) {
                // could be a country code
                let regionDesc: string = this.isPrivateRegion(parts[1]) ? 'Private Use' : this.regions.get(parts[1].toUpperCase())!.getDescription();
                return langDesc + ' (' + regionDesc + ')';
            }
            if (parts[1].length === 3) {
                // could be a UN region code
                let reg: Region | undefined = this.regions.get(parts[1]);
                if (reg) {
                    return langDesc + ' (' + reg.getDescription() + ')';
                }
            }
            if (parts[1].length === 4) {
                // could have script
                let script: string = parts[1].substring(0, 1).toUpperCase() + parts[1].substring(1).toLowerCase();
                if (lang && script === lang.getSuppressedScript()) {
                    return undefined;
                }
                let scr: Script | undefined = this.scripts.get(script);
                if (scr) {
                    return langDesc + ' (' + scr.getDescription() + ')';
                }
                if (this.isPrivateScript(script)) {
                    return langDesc + ' (' + 'Private Use' + ')';
                }
            }
            // try with a variant
            if (!isPrivateLang) {
                let variant: Variant | undefined = this.variants.get(parts[1].toLowerCase());
                if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                    // variant is valid for the language code
                    return langDesc + ' (' + variant.getDescription() + ')';
                }
            }
            if (isPrivateLang) {
                return 'Private Use';
            }
        } else if (parts.length === 3) {
            let isPrivateLang: boolean = this.isPrivateLanguage(parts[0]);
            if (!this.languages.has(parts[0].toLowerCase()) && !isPrivateLang) {
                return undefined;
            }
            let langDesc: string = isPrivateLang ? 'Private Use' : this.languages.get(parts[0].toLowerCase())!.getDescription();
            let lang: Language | undefined = isPrivateLang ? undefined : this.languages.get(parts[0].toLowerCase());
            if (parts[1].length === 4) {
                // could be script + region or variant
                let script: string = parts[1].substring(0, 1).toUpperCase() + parts[1].substring(1).toLowerCase();
                if (lang && script === lang.getSuppressedScript()) {
                    return undefined;
                }
                let isPrivateScr: boolean = this.isPrivateScript(script);
                if (this.scripts.has(script) || isPrivateScr) {
                    let scrDesc: string = isPrivateScr ? 'Private Use' : this.scripts.get(script)!.getDescription();
                    // check if next part is a region or variant
                    let isPrivateReg: boolean = this.isPrivateRegion(parts[2]);
                    if (this.regions.has(parts[2].toUpperCase()) || isPrivateReg) {
                        let regDesc: string = isPrivateReg ? 'Private Use' : this.regions.get(parts[2].toUpperCase())!.getDescription();
                        return langDesc + ' (' + scrDesc + ', ' + regDesc + ')';
                    }
                    if (!isPrivateLang) {
                        let variant: Variant | undefined = this.variants.get(parts[2].toLowerCase());
                        if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                            // variant is valid for the language code
                            return langDesc + ' (' + scrDesc + ', ' + variant.getDescription() + ')';
                        }
                    }
                }
            } else {
                // could be region + variant
                let isPrivateReg: boolean = this.isPrivateRegion(parts[1]);
                if ((parts[1].length === 2 || parts[1].length === 3) && (this.regions.has(parts[1].toUpperCase()) || isPrivateReg)) {
                    // could be a region code, check if next part is a variant
                    let regDesc: string = isPrivateReg ? 'Private Use' : this.regions.get(parts[1].toUpperCase())!.getDescription();
                    if (!isPrivateLang) {
                        let variant: Variant | undefined = this.variants.get(parts[2].toLowerCase());
                        if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                            // variant is valid for the language code
                            return langDesc + ' (' + regDesc + ' - ' + variant.getDescription() + ')';
                        }
                    }
                    // For private-use languages with regions, return description
                    if (isPrivateLang) {
                        return langDesc + ' (' + regDesc + ')';
                    }
                }
            }
        }
        return undefined;
    }

    normalizeCode(code: string): string | undefined {
        let parts: string[] = code.split('-');
        if (parts.length == 1) {
            // language part only
            if (this.languages.has(code.toLowerCase())) {
                return code.toLowerCase();
            }
            if (this.isPrivateLanguage(code)) {
                return code.toLowerCase();
            }
        } else if (parts.length == 2) {
            // contains either script or region
            let isPrivateLang: boolean = this.isPrivateLanguage(parts[0]);
            if (!this.languages.has(parts[0].toLowerCase()) && !isPrivateLang) {
                return undefined;
            }
            let lang: Language | undefined = isPrivateLang ? undefined : this.languages.get(parts[0].toLowerCase());
            if (parts[1].length === 2 && (this.regions.has(parts[1].toUpperCase()) || this.isPrivateRegion(parts[1]))) {
                // could be a country code
                return parts[0].toLowerCase() + '-' + parts[1].toUpperCase();
            }
            if (parts[1].length === 3 && this.regions.has(parts[1])) {
                // could be a UN region code
                return parts[0].toLowerCase() + '-' + parts[1];
            }
            if (parts[1].length === 4) {
                // could have script
                let script: string = parts[1].substring(0, 1).toUpperCase() + parts[1].substring(1).toLowerCase();
                if (lang && script === lang.getSuppressedScript()) {
                    return undefined;
                }
                if (this.scripts.has(script) || this.isPrivateScript(script)) {
                    return parts[0].toLowerCase() + '-' + script;
                }
            }
            // try with a variant
            if (!isPrivateLang) {
                let variant: Variant | undefined = this.variants.get(parts[1].toLowerCase());
                if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                    // variant is valid for the language code
                    return parts[0].toLowerCase() + '-' + variant.getCode();
                }
            }
        } else if (parts.length == 3) {
            let isPrivateLang: boolean = this.isPrivateLanguage(parts[0]);
            if (!this.languages.has(parts[0].toLowerCase()) && !isPrivateLang) {
                return undefined;
            }
            let lang: Language | undefined = isPrivateLang ? undefined : this.languages.get(parts[0].toLowerCase());
            if (parts[1].length === 4) {
                // could be script + region or variant
                let script: string = parts[1].substring(0, 1).toUpperCase() + parts[1].substring(1).toLowerCase();
                if (lang && script === lang.getSuppressedScript()) {
                    return undefined;
                }
                let isPrivateScr: boolean = this.isPrivateScript(script);
                if (this.scripts.has(script) || isPrivateScr) {
                    let scrCode: string = isPrivateScr ? script : this.scripts.get(script)!.getCode();
                    // check if next part is a region or variant
                    let isPrivateReg: boolean = this.isPrivateRegion(parts[2]);
                    if (this.regions.has(parts[2].toUpperCase()) || isPrivateReg) {
                        let regCode: string = isPrivateReg ? parts[2].toUpperCase() : this.regions.get(parts[2].toUpperCase())!.getCode();
                        return parts[0].toLowerCase() + '-' + scrCode + '-' + regCode;
                    }
                    if (!isPrivateLang) {
                        let variant: Variant | undefined = this.variants.get(parts[2].toLowerCase());
                        if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                            // variant is valid for the language code
                            return parts[0].toLowerCase() + '-' + scrCode + '-' + variant.getCode();
                        }
                    }
                }
            } else {
                // could be region + variant
                let isPrivateReg: boolean = this.isPrivateRegion(parts[1]);
                if ((parts[1].length === 2 || parts[1].length === 3) && (this.regions.has(parts[1].toUpperCase()) || isPrivateReg)) {
                    // could be a region code, check if next part is a variant
                    let regCode: string = isPrivateReg ? parts[1].toUpperCase() : this.regions.get(parts[1].toUpperCase())!.getCode();
                    if (!isPrivateLang) {
                        let variant: Variant | undefined = this.variants.get(parts[2].toLowerCase());
                        if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                            // variant is valid for the language code
                            return parts[0].toLowerCase() + '-' + regCode + '-' + variant.getCode();
                        }
                    }
                    // For private-use languages with regions, return normalized code
                    if (isPrivateLang) {
                        return parts[0].toLowerCase() + '-' + regCode;
                    }
                }
            }
        }
        return undefined;
    }
}