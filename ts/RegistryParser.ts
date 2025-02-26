/*******************************************************************************
 * Copyright ((c) 2023 - 2025 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/
import { Stats, openSync, readSync, statSync } from "fs";
import { XMLUtils } from "typesxml";
import { Language } from "./Language";
import { Region } from "./Region";
import { RegistryEntry } from "./RegistryEntry";
import { Script } from "./Script";
import { Variant } from "./Variant";
import path = require("path");

export class RegistryParser {

    entries: Array<RegistryEntry>;
    languages: Map<string, Language>;
    regions: Map<string, Region>;
    scripts: Map<string, Script>;
    variants: Map<string, Variant>;

    constructor() {
        this.entries = new Array<RegistryEntry>();
        this.languages = new Map<string, Language>();
        this.regions = new Map<string, Region>();
        this.scripts = new Map<string, Script>();
        this.variants = new Map<string, Variant>();

        let filePath: string = path.join(__dirname, 'language-subtag-registry.txt');
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

        for (let entry of this.entries) {
            let type: string = entry.getType();
            if (!type) {
                continue;
            }
            if (type === 'language') {
                let description: string = entry.getDescription();
                if (description.indexOf('Private use') != -1) {
                    continue;
                }
                let subtag: string = entry.getSubtag();
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
                    let suppressedScript: string = entry.get('Suppress-Script');
                    if (suppressedScript) {
                        lang.setSuppressedScript(suppressedScript);
                    }
                    this.languages.set(subtag, lang);
                }
            }
            if (type === 'region') {
                let description: string = entry.getDescription();
                if (description.indexOf('Private use') != -1) {
                    continue;
                }
                let subtag: string = entry.getSubtag();
                if (subtag) {
                    this.regions.set(subtag, new Region(subtag, description.trim()));
                }
            }
            if (type === 'script') {
                let description: string = entry.getDescription();
                if (description.indexOf('Private use') != -1) {
                    continue;
                }
                description = XMLUtils.replaceAll(description, '(', '[');
                description = XMLUtils.replaceAll(description, ')', ']');
                let subtag: string = entry.getSubtag();
                if (subtag) {
                    this.scripts.set(subtag, new Script(subtag, description.trim()));
                }
            }
            if (type === 'variant') {
                let description: string = entry.getDescription();
                if (description.indexOf('Private use') != -1) {
                    continue;
                }
                description = XMLUtils.replaceAll(description, '(', '[');
                description = XMLUtils.replaceAll(description, ')', ']');
                let subtag: string = entry.getSubtag();
                let prefix: string = entry.get('Prefix');
                if (subtag) {
                    this.variants.set(subtag, new Variant(subtag, description.trim(), prefix));
                }
            }
        }
    }

    getRegistryDate(): string {
        for (let entry of this.entries) {
            let date = entry.get('File-Date');
            if (date) {
                return date;
            }
        }
        return undefined;
    }

    getTagDescription(tag: string): string {
        let parts: string[] = tag.split('-');
        if (parts.length === 1) {
            // language part only
            if (this.languages.has(tag.toLowerCase())) {
                return this.languages.get(tag.toLowerCase()).getDescription();
            }
        } else if (parts.length === 2) {
            // contains either script or region
            if (!this.languages.has(parts[0].toLowerCase())) {
                return undefined;
            }
            let lang: Language = this.languages.get(parts[0].toLowerCase());
            if (parts[1].length === 2 && this.regions.has(parts[1].toUpperCase())) {
                // could be a country code
                return lang.getDescription() + ' (' + this.regions.get(parts[1].toUpperCase()).getDescription() + ')';
            }
            if (parts[1].length === 3 && this.regions.has(parts[1])) {
                // could be a UN region code
                let reg: Region = this.regions.get(parts[1]);
                return lang.getDescription() + ' (' + reg.getDescription() + ')';
            }
            if (parts[1].length === 4) {
                // could have script
                let script: string = parts[1].substring(0, 1).toUpperCase() + parts[1].substring(1).toLowerCase();
                if (script === lang.getSuppresedScript()) {
                    return undefined;
                }
                if (this.scripts.has(script)) {
                    return lang.getDescription() + ' (' + this.scripts.get(script).getDescription() + ')';
                }
            }
            // try with a variant
            if (this.variants.has(parts[1].toLowerCase())) {
                let variant: Variant = this.variants.get(parts[1].toLowerCase());
                if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                    // variant is valid for the language code
                    return lang.getDescription() + ' (' + variant.getDescription() + ')';
                }
            }
        } else if (parts.length === 3) {
            if (!this.languages.has(parts[0].toLowerCase())) {
                return undefined;
            }
            let lang: Language = this.languages.get(parts[0].toLowerCase());
            if (parts[1].length === 4) {
                // could be script + region or variant
                let script: string = parts[1].substring(0, 1).toUpperCase() + parts[1].substring(1).toLowerCase();
                if (script === lang.getSuppresedScript()) {
                    return undefined;
                }
                if (this.scripts.has(script)) {
                    let scr: Script = this.scripts.get(script);
                    // check if next part is a region or variant
                    if (this.regions.has(parts[2].toUpperCase())) {
                        // check if next part is a variant
                        let reg: Region = this.regions.get(parts[2].toUpperCase());
                        return lang.getDescription() + ' (' + scr.getDescription() + ', ' + reg.getDescription() + ')';
                    }
                    if (this.variants.has(parts[2].toLowerCase())) {
                        let variant: Variant = this.variants.get(parts[2].toLowerCase());
                        if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                            // variant is valid for the language code
                            return lang.getDescription() + ' (' + scr.getDescription() + ', ' + variant.getDescription()
                                + ')';
                        }
                    }
                }
            } else if ((parts[1].length === 2 || parts[1].length === 3) && this.regions.has(parts[1].toUpperCase())) {
                // could be a region code, check if next part is a variant
                let reg: Region = this.regions.get(parts[1].toUpperCase());
                if (this.variants.has(parts[2].toLowerCase())) {
                    let variant: Variant = this.variants.get(parts[2].toLowerCase());
                    if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                        // variant is valid for the language code
                        return lang.getDescription() + ' (' + reg.getDescription() + ' - '
                            + variant.getDescription() + ')';
                    }
                }
            }
        }
        return undefined;
    }

    normalizeCode(code: string): string {
        let parts: string[] = code.split('-');
        if (parts.length == 1) {
            // language part only
            if (this.languages.has(code.toLowerCase())) {
                return code.toLowerCase();
            }
        } else if (parts.length == 2) {
            // contains either script or region
            if (!this.languages.has(parts[0].toLowerCase())) {
                return undefined;
            }
            let lang: Language = this.languages.get(parts[0].toLowerCase());
            if (parts[1].length === 2 && this.regions.has(parts[1].toUpperCase())) {
                // could be a country code
                return parts[0].toLowerCase() + '-' + parts[1].toUpperCase();
            }
            if (parts[1].length === 3 && this.regions.has(parts[1])) {
                // could be a UN region code
                return parts[0].toLowerCase() + "-" + parts[1];
            }
            if (parts[1].length === 4) {
                // could have script
                let script: string = parts[1].substring(0, 1).toUpperCase() + parts[1].substring(1).toLowerCase();
                if (script === lang.getSuppresedScript()) {
                    return undefined;
                }
                if (this.scripts.has(script)) {
                    return parts[0].toLowerCase() + '-' + script;
                }
            }
            // try with a variant
            if (this.variants.has(parts[1].toLowerCase())) {
                let variant: Variant = this.variants.get(parts[1].toLowerCase());
                if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                    // variant is valid for the language code
                    return parts[0].toLowerCase() + '-' + variant.getCode();
                }
            }
        } else if (parts.length == 3) {
            if (!this.languages.has(parts[0].toLowerCase())) {
                return undefined;
            }
            let lang: Language = this.languages.get(parts[0].toLowerCase());
            if (parts[1].length === 4) {
                // could be script + region or variant
                let script: string = parts[1].substring(0, 1).toUpperCase() + parts[1].substring(1).toLowerCase();
                if (script === lang.getSuppresedScript()) {
                    return undefined;
                }
                if (this.scripts.has(script)) {
                    let scr: Script = this.scripts.get(script);
                    // check if next part is a region or variant
                    if (this.regions.has(parts[2].toUpperCase())) {
                        // check if next part is a variant
                        let reg: Region = this.regions.get(parts[2].toUpperCase());
                        return lang.getCode() + '-' + scr.getCode() + '-' + reg.getCode();
                    }
                    if (this.variants.has(parts[2].toLowerCase())) {
                        let variant: Variant = this.variants.get(parts[2].toLowerCase());
                        if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                            // variant is valid for the language code
                            return lang.getCode() + '-' + scr.getCode() + '-' + variant.getCode();
                        }
                    }
                }
            } else if ((parts[1].length === 2 || parts[1].length === 3) && this.regions.has(parts[1].toUpperCase())) {
                // could be a region code, check if next part is a variant
                let reg: Region = this.regions.get(parts[1].toUpperCase());
                if (this.variants.has(parts[2].toLowerCase())) {
                    let variant: Variant = this.variants.get(parts[2].toLowerCase());
                    if (variant && variant.getPrefix() === parts[0].toLowerCase()) {
                        // variant is valid for the language code
                        return lang.getCode() + '-' + reg.getCode() + '-' + variant.getCode();
                    }
                }
            }
        }
        return undefined;
    }
}