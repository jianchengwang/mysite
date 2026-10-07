import test from 'node:test'
import assert from 'node:assert/strict'
import { novelReadingDocument } from '../utils/novelParagraphs.mjs'

test('soft lines become independent narrative and dialogue paragraphs without rewriting text', () => {
  const doc = { body: { type: 'minimark', value: [['p', {}, '他说。\n“第一句？”\n“第二句。”'], ['p', {}, '后来，十七个人走了。']] } }
  const original = structuredClone(doc)
  const out = novelReadingDocument(doc)
  assert.deepEqual(out.body.value.map(n => n[2]), ['他说。', '“第一句？”', '“第二句。”', '后来，十七个人走了。'])
  assert.deepEqual(doc, original)
})

test('scene dividers and Markdown code, lists, headings and inline nodes keep their structure', () => {
  const nodes = [['h2', {}, '小节'], ['pre', {}, ['code', {}, 'a\nb']], ['ul', {}, ['li', {}, '一项']], ['p', {}, '——'], ['p', {}, '前文', ['strong', {}, '强调'], '后文']]
  const out = novelReadingDocument({ body: { value: nodes } })
  assert.deepEqual(out.body.value.slice(0, 3), nodes.slice(0, 3))
  assert.equal(out.body.value[3][1].class, 'novel-divider')
  assert.deepEqual(out.body.value[4], nodes[4])
})
