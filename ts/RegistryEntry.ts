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

export class RegistryEntry {

    entryMap: Map<string, string>;

    constructor(entry: string) {
        this.entryMap = new Map<string, string>();
        let lines = entry.split('\n');
        for (let line of lines) {
            let type: string = line.substring(0, line.indexOf(':')).trim();
            let value: string = line.substring(line.indexOf(':') + 1).trim();
            if (!this.entryMap.has(type)) {
                this.entryMap.set(type, value);
            } else {
                let oldValue: string = this.entryMap.get(type) as string;
                this.entryMap.set(type, oldValue + ' | ' + value);
            }
        }
    }

    getTypes(): Set<string> {
        return new Set(this.entryMap.keys());
    }

    get(type: string): string | undefined {
        return this.entryMap.get(type);
    }

    getType(): string | undefined {
        return this.entryMap.get('Type');
    }

    getDescription(): string | undefined {
        return this.entryMap.get('Description');
    }

    getSubtag(): string | undefined {
        return this.entryMap.get('Subtag');
    }
}