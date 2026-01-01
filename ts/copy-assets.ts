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

import { copyFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path';

const files = [
  'ts/language-subtag-registry.txt',
  ...readdirSync('ts').filter(f => f.endsWith('.xml')).map(f => `ts/${f}`)
];

for (const file of files) {
  copyFileSync(file, join('dist', basename(file)));
}
