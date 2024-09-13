/*******************************************************************************
 * Copyright (c) 2023 -2024 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/
export class Variant {

    code: string;
    description: string;
    prefix: string;

    constructor(name: string, value: string, prefix: string) {
        this.code = name;
        this.description = value;
        this.prefix = prefix;
    }

    getCode(): string {
        return this.code;
    }

    getDescription(): string {
        return this.description;
    }
    getPrefix(): string {
        return this.prefix;
    }
}