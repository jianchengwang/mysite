import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { highlightCode } from '../utils/codeHighlight.ts'

test('article code highlighting escapes HTML while retaining code text', () => {
  const output = highlightCode('<script>alert("example")</script>', 'html')
  assert.ok(!output.includes('<script>'))
  assert.ok(output.includes('&lt;'))
  assert.ok(output.includes('script'))
})

test('article TypeScript code still receives syntax highlighting', () => {
  const output = highlightCode('const answer: number = 42', 'typescript')
  assert.ok(output.includes('hljs-keyword'))
  assert.ok(output.includes('42'))
})

test('every retained column entry points to an existing article', () => {
  const { columns } = JSON.parse(readFileSync(new URL('../content/dataset/columns.json', import.meta.url), 'utf8'))
  assert.ok(columns.length > 0)
  for (const column of columns) {
    assert.ok(column.path.startsWith('/column/'))
    assert.ok(existsSync(new URL(`../content${column.path}.md`, import.meta.url)), column.path)
  }
})
