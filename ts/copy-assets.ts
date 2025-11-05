import { copyFileSync, readdirSync } from 'fs'
import { basename, join } from 'path';

const files = [
  'ts/language-subtag-registry.txt',
  ...readdirSync('ts').filter(f => f.endsWith('.xml')).map(f => `ts/${f}`)
];

for (const file of files) {
  copyFileSync(file, join('dist', basename(file)));
}
