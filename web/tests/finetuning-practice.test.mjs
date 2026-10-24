import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { validateCatalog, resolveSeries, adjacentEntries, navigationForSeries } from '../utils/seriesCatalog.mjs'

const catalog = validateCatalog(JSON.parse(readFileSync(new URL('../content/dataset/collections.json', import.meta.url), 'utf8')))
const root = '/column/finetuning-practice'

test('finetuning practice exposes one completed lesson and seven planned lessons', () => {
  const current = resolveSeries(catalog, root)
  assert.ok(current.directory)
  assert.equal(current.series.plannedEntries, 8)
  assert.equal(current.series.entries.length, 8)
  assert.equal(current.series.availableEntries.length, 1)
  assert.equal(current.series.availableEntries[0].path, root + '/01')
  assert.equal(navigationForSeries(current.series).flatMap(g => g.children).length, 1)
  assert.deepEqual(adjacentEntries(current.series, root + '/01'), { previous: null, next: null })
})

test('planned lessons have no public route or empty content file', () => {
  assert.ok(resolveSeries(catalog, root + '/01'))
  assert.ok(existsSync(new URL('../content' + root + '/01.md', import.meta.url)))
  for (let i = 2; i <= 8; i++) {
    const path = root + '/' + String(i).padStart(2, '0')
    assert.equal(resolveSeries(catalog, path), null)
    assert.equal(existsSync(new URL('../content' + path + '.md', import.meta.url)), false)
  }
})

test('dedicated routes reuse the existing series layout', () => {
  for (const filename of ['index.vue', '[...slug].vue']) {
    const source = readFileSync(new URL('../pages/column/finetuning-practice/' + filename, import.meta.url), 'utf8')
    assert.match(source, /<SeriesPage/)
    assert.match(source, /layout: 'series'/)
  }
})
