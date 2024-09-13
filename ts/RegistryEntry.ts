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
                let oldValue: string = this.entryMap.get(type);
                this.entryMap.set(type, oldValue + ' | ' + value);
            }
        }
    }

    getTypes(): Set<string> {
        let result: Set<string> = new Set<string>();
        let iterator: IterableIterator<string> = this.entryMap.keys();
        while(true) {
            let next: IteratorResult<string> = iterator.next();
            if (next.done) {
                break;
            }
            result.add(next.value);
        }
        return result
    }

    get(type: string): string {
        return this.entryMap.get(type);
    }

    getType(): string {
        return this.entryMap.get('Type');
    }

    getDescription(): string {
        return this.entryMap.get('Description');
    }

    getSubtag(): string {
        return this.entryMap.get('Subtag');
    }
}