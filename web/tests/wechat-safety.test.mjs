import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { renderSafeMarkdown } from '../utils/safeRichText.ts'

test('raw HTML cannot execute in the credential-bearing editor', () => {
  const output = renderSafeMarkdown('<img src=x onerror="alert(1)"><script>bad()</script>')
  assert.ok(!output.includes('<script>'))
  assert.ok(!output.includes('<img src=x'))
  assert.ok(output.includes('&lt;'))
})
test('script links are not emitted; ordinary Markdown images still work', () => {
  const output = renderSafeMarkdown('[unsafe](javascript:alert(1))\n\n![test](https://example.com/fixture.png)')
  assert.ok(!output.includes('href="javascript:'))
  assert.ok(output.includes('src="https://example.com/fixture.png"'))
})
test('draft transport uses durable keys, mandatory auth and no client WeChat token', () => {
  const source = readFileSync(new URL('../pages/tools/md-to-wechat/index.vue', import.meta.url), 'utf8')
  assert.ok(source.includes("'Idempotency-Key': key"))
  assert.ok(source.includes("'Authorization': `Bearer ${backendKey.value.trim()}`"))
  assert.ok(source.includes('saved.key : digest'))
  assert.ok(source.includes('needs_reconciliation'))
  assert.ok(!source.includes('access_token:'))
  assert.ok(!source.includes('crypto.randomUUID()'))
})
test('browser settings retain backend auth only for this tab session', () => {
  const source = readFileSync(new URL('../components/Header.vue', import.meta.url), 'utf8')
  assert.ok(source.includes('sessionStorage.setItem(BACKEND_ACCESS_KEY_STORAGE_KEY'))
  assert.ok(!source.includes('localStorage.setItem(BACKEND_ACCESS_KEY_STORAGE_KEY'))
  assert.ok(!source.includes('v-model="wechatAccessToken"'))
})
