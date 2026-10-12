import test from 'node:test'
import assert from 'node:assert/strict'
import { collectionView, startLinks } from '../utils/seriesCatalog.mjs'

const daily = (groups) => collectionView({
  id: 'daily-english', section: 'column', title: '每日英语', summary: 's', published: true, groups
})
const entry = (slug, order, published = true) => ({ slug, title: '每日英语｜' + slug, order, published })
const paths = (series) => series.availableEntries.map(e => e.path)

test('daily-english starts at the latest date across month groups even when order numbers restart', () => {
  const series = daily([
    { id: '2026-10', title: '2026年10月', entries: [entry('2026-10-30', 31), entry('2026-10-31', 30)] },
    { id: '2026-11', title: '2026年11月', entries: [entry('2026-11-01', 2), entry('2026-11-02', 1)] }
  ])
  const links = startLinks(series)
  assert.equal(links.primary.label, '阅读最新一期')
  assert.equal(links.primary.path, '/column/daily-english/2026-11-02')
  assert.equal(links.secondary.label, '从第一篇开始')
  assert.equal(links.secondary.path, '/column/daily-english/2026-10-30')
})

test('daily-english picks by slug date, never by the highest order value', () => {
  const series = daily([
    { id: '2026-10', title: '2026年10月', entries: [entry('2026-10-11', 99), entry('2026-10-12', 1)] }
  ])
  const links = startLinks(series)
  assert.equal(links.primary.path, '/column/daily-english/2026-10-12')
  assert.equal(links.secondary.path, '/column/daily-english/2026-10-11')
})

test('daily-english never targets an unpublished entry', () => {
  const series = daily([
    { id: '2026-10', title: '2026年10月', entries: [entry('2026-10-11', 1), entry('2026-10-12', 2), entry('2026-10-13', 3, false)] }
  ])
  const links = startLinks(series)
  assert.equal(links.primary.path, '/column/daily-english/2026-10-12')
  assert.equal(links.secondary.path, '/column/daily-english/2026-10-11')
})

test('daily-english skips slugs that look dated but are not valid ISO dates', () => {
  const series = daily([
    { id: '2026-10', title: '2026年10月', entries: [entry('2026-10-11', 1), entry('2026-12-31', 2), entry('2026-13-01', 3), entry('2026-02-30', 4)] }
  ])
  const links = startLinks(series)
  assert.equal(links.primary.path, '/column/daily-english/2026-12-31')
})

test('daily-english rejects a rollover date that would otherwise outrank the latest valid date', () => {
  const series = daily([
    { id: '2026-02', title: '2026年2月', entries: [entry('2026-02-15', 1), entry('2026-02-30', 2)] }
  ])
  const links = startLinks(series)
  assert.equal(links.primary.path, '/column/daily-english/2026-02-15')
  assert.equal(links.secondary, null)
})

test('daily-english rejects non-leap February 29 but keeps a real leap-year date', () => {
  const nonLeap = daily([
    { id: '2025-02', title: '2025年2月', entries: [entry('2025-02-28', 1), entry('2025-02-29', 2)] }
  ])
  assert.equal(startLinks(nonLeap).primary.path, '/column/daily-english/2025-02-28')

  const leap = daily([
    { id: '2028-02', title: '2028年2月', entries: [entry('2028-02-28', 1), entry('2028-02-29', 2)] }
  ])
  const links = startLinks(leap)
  assert.equal(links.primary.path, '/column/daily-english/2028-02-29')
  assert.equal(links.secondary.path, '/column/daily-english/2028-02-28')
})

test('daily-english with a single entry renders one link, not two to the same target', () => {
  const series = daily([
    { id: '2026-10', title: '2026年10月', entries: [entry('2026-10-11', 1)] }
  ])
  const links = startLinks(series)
  assert.equal(links.primary.label, '阅读最新一期')
  assert.equal(links.primary.path, '/column/daily-english/2026-10-11')
  assert.equal(links.secondary, null)
})

test('daily-english falls back to the first entry when no dated slug is available', () => {
  const series = daily([
    { id: 'basics', title: '基础', entries: [entry('intro', 1), entry('warmup', 2)] }
  ])
  const links = startLinks(series)
  assert.equal(links.primary.label, '开始阅读')
  assert.equal(links.primary.path, '/column/daily-english/intro')
  assert.equal(links.secondary, null)
})

test('collections without any available entry expose no start link', () => {
  const series = daily([
    { id: '2026-10', title: '2026年10月', entries: [entry('2026-10-11', 1, false), entry('2026-10-12', 2, false)] }
  ])
  const links = startLinks(series)
  assert.equal(links.primary, null)
  assert.equal(links.secondary, null)
})

test('ordered tutorials keep the existing first-available 开始阅读 flow', () => {
  const series = collectionView({
    id: 'intro-to-vue', section: 'column', title: 'Vue 入门', summary: 's', published: true,
    groups: [{ id: 'basics', title: '基础', entries: [
      { slug: '01-why', title: '为什么', order: 1, published: false },
      { slug: '02-setup', title: '安装', order: 2, published: true },
      { slug: '03-template', title: '模板', order: 3, published: true }
    ] }]
  })
  const links = startLinks(series)
  assert.equal(links.primary.label, '开始阅读')
  assert.equal(links.primary.path, '/column/intro-to-vue/02-setup')
  assert.equal(links.secondary, null)
})

test('startLinks leaves the availableEntries order untouched', () => {
  const series = daily([
    { id: '2026-10', title: '2026年10月', entries: [entry('2026-10-11', 2), entry('2026-10-12', 1)] }
  ])
  const before = paths(series)
  startLinks(series)
  assert.deepEqual(paths(series), before)
  assert.deepEqual(before, ['/column/daily-english/2026-10-11', '/column/daily-english/2026-10-12'])
})
