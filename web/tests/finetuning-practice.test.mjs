import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { validateCatalog, resolveSeries, adjacentEntries, navigationForSeries } from '../utils/seriesCatalog.mjs'

const catalog = validateCatalog(JSON.parse(readFileSync(new URL('../content/dataset/collections.json', import.meta.url), 'utf8')))
const root = '/column/finetuning-practice'

test('finetuning practice exposes all eight lessons in learning order', () => {
  const current = resolveSeries(catalog, root)
  assert.ok(current.directory)
  assert.equal(current.series.plannedEntries, 8)
  assert.equal(current.series.entries.length, 8)
  assert.equal(current.series.availableEntries.length, 8)
  assert.equal(current.series.availableEntries[0].path, root + '/01')
  assert.equal(navigationForSeries(current.series).flatMap(g => g.children).length, 8)
  assert.equal(adjacentEntries(current.series, root + '/01').previous, null)
  assert.equal(adjacentEntries(current.series, root + '/01').next.path, root + '/02')
  assert.equal(adjacentEntries(current.series, root + '/08').previous.path, root + '/07')
  assert.equal(adjacentEntries(current.series, root + '/08').next, null)
})

test('each lesson has full content, its notebook, and honest validation scope', () => {
  assert.ok(resolveSeries(catalog, root + '/01'))
  assert.ok(existsSync(new URL('../content' + root + '/01.md', import.meta.url)))
  for (let i = 1; i <= 8; i++) {
    const path = root + '/' + String(i).padStart(2, '0')
    assert.ok(resolveSeries(catalog, path))
    const text = readFileSync(new URL('../content' + path + '.md', import.meta.url), 'utf8')
    assert.ok(text.length > 3000, path + ' must contain the complete lesson')
    assert.match(text, new RegExp('colab.research.google.com/github/jianchengwang/colab-lab/blob/main/notebooks/finetuning-practice/' + String(i).padStart(2, '0') + '-'))
    assert.match(text, /私有/)
    assert.match(text, /Colab/)
    assert.doesNotMatch(text, /<mention|<date|notebook 正在接入/)
  }
})

test('dedicated routes reuse the existing series layout', () => {
  for (const filename of ['index.vue', '[...slug].vue']) {
    const source = readFileSync(new URL('../pages/column/finetuning-practice/' + filename, import.meta.url), 'utf8')
    assert.match(source, /<SeriesPage/)
    assert.match(source, /layout: 'series'/)
  }
})
