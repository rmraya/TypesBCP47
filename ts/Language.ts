/*******************************************************************************
 * Copyright ((c) 2023 - 2024 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { LanguageUtils } from "./LanguageUtils";

export class Language {

    code: string;
    description: string;
    suppressedScript: string;

    constructor(code: string, description: string) {
        this.code = code;
        this.description = description;
        this.suppressedScript = '';
    }

    getCode(): string {
        return this.code;
    }

    getDescription(): string {
        return this.description;
    }

    getSuppresedScript(): string {   
        return this.suppressedScript;
    }

    setSuppressedScript(script: string) {
        this.suppressedScript = script;
    }

    isCJK(): boolean {
        return LanguageUtils.isCJK(this.code);
    }

    isBiDi(): boolean {
        return LanguageUtils.isBiDi(this.code);
    }
}