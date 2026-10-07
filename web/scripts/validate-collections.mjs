import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { validateCatalog, entryPath } from '../utils/seriesCatalog.mjs'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = validateCatalog(JSON.parse(readFileSync(resolve(root, 'content/dataset/collections.json'), 'utf8')))
const preview = process.env.MYSITE_COLLECTION_PREVIEW === '1'
for (const series of catalog.collections) {
  for (const group of series.groups) for (const entry of group.entries) {
    const file = resolve(root, 'content' + entryPath(series, entry) + '.md')
    const published = series.published === true && entry.published === true
    if (!preview && !published && existsSync(file)) throw new Error('Unpublished article must remain outside public content: ' + entryPath(series, entry))
    if ((published || preview && entry.fixture) && !existsSync(file)) throw new Error('Missing article: ' + entryPath(series, entry))
    if (existsSync(file)) {
      const text = readFileSync(file, 'utf8')
      if (/(?:^|[^a-z\d])v6(?:$|[^a-z\d])/i.test(text)) throw new Error('Source version marker in public article')
    }
  }
}
console.log('Collection publication gate passed' + (preview ? ' (local preview)' : ''))

