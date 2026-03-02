<template>
  <div class="min-h-screen bg-[#fcfcfc] font-hand p-4 md:p-8">
    <div class="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <h1 class="text-4xl font-bold text-zinc-900 mb-2">MD to WeChat</h1>
        <p class="text-zinc-600 italic">Convert Markdown to WeChat official account format with sketch-style polish</p>
      </div>
      <div class="flex flex-wrap gap-3 items-center">
        <button @click="copyWechatFormat" class="sketch-button bg-white text-zinc-900 font-bold">Copy to WeChat</button>
        <button @click="pasteExample" class="sketch-button bg-white text-zinc-900">Example</button>
        <button @click="clearInput" class="sketch-button bg-white text-red-600">Clear</button>
        <button @click="resetTheme" class="sketch-button bg-white text-zinc-900">Reset Default Style</button>
        <span v-if="copyStatus !== 'idle'" class="text-xs font-bold" :class="copyStatus === 'success' ? 'text-green-700' : 'text-red-600'">
          {{ copyStatus === 'success' ? 'Copied successfully' : 'Copy failed' }}
        </span>
      </div>
    </div>

    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[70vh]">
      <div class="flex flex-col gap-3 h-auto lg:h-full">
        <div class="flex justify-between items-center px-2">
          <span class="text-sm font-bold uppercase tracking-wider text-zinc-500">Markdown Editor</span>
          <span class="text-xs text-zinc-500 italic">{{ markdownInput.length }} chars</span>
        </div>
        <textarea
          v-model="markdownInput"
          class="flex-1 min-h-[420px] lg:min-h-0 w-full p-6 sketch-card bg-white resize-none outline-none focus:sketch-shadow-sm font-mono text-sm leading-relaxed"
          placeholder="Paste your markdown here..."
        ></textarea>
      </div>

      <div class="flex flex-col gap-3 h-auto lg:h-full">
        <div class="flex justify-between items-center px-2 gap-4">
          <span class="text-sm font-bold uppercase tracking-wider text-zinc-500">WeChat Preview</span>
          <div class="flex items-center gap-2">
            <label class="text-xs text-zinc-500 uppercase tracking-wider">Theme</label>
            <select v-model="currentTheme" class="sketch-border bg-white px-2 py-1 text-xs outline-none font-hand">
              <option value="default">Default</option>
              <option value="sketch">Sketch</option>
              <option value="modern">Modern</option>
            </select>
          </div>
        </div>
        <div class="flex-1 min-h-[420px] sketch-card bg-white overflow-y-auto p-0 border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div
            ref="previewArea"
            class="wechat-content p-7 md:p-10"
            :class="[`theme-${currentTheme}`]"
            v-html="htmlOutput"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

definePageMeta({ layout: 'default' })

const markdownInput = ref('')
const currentTheme = ref('sketch')
const previewArea = ref<HTMLElement | null>(null)
const copyStatus = ref<'idle' | 'success' | 'error'>('idle')

marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
})

const htmlOutput = computed(() => {
  if (!markdownInput.value) return '<p class="italic text-zinc-400 text-center mt-20">Preview will appear here...</p>'
  return marked.parse(markdownInput.value) as string
})

const clearInput = () => {
  markdownInput.value = ''
}

const resetTheme = () => {
  currentTheme.value = 'sketch'
}

const pasteExample = () => {
  markdownInput.value = `# Hello WeChat!\n\nThis is a **bold** statement and some *italic* text.\n\n## Features\n- Minimalist hand-drawn style\n- Code highlighting\n- Instant preview\n\n### Code Example\n\`\`\`javascript\nfunction hello() {\n  console.log("Hello from the sketchy side!");\n}\n\`\`\`\n\n### Data Table\n| Name | Value |\n| ---- | ----: |\n| Speed | Fast |\n| Cost | Low |\n\n> Stay hungry, stay sketchy.\n`
}

const setCopyStatus = (status: 'success' | 'error') => {
  copyStatus.value = status
  setTimeout(() => {
    copyStatus.value = 'idle'
  }, 1800)
}

const fallbackCopy = (target: HTMLElement): boolean => {
  const range = document.createRange()
  range.selectNode(target)
  const selection = window.getSelection()
  if (!selection) return false
  selection.removeAllRanges()
  selection.addRange(range)
  const ok = document.execCommand('copy')
  selection.removeAllRanges()
  return ok
}

const copyWechatFormat = async () => {
  const target = previewArea.value
  if (!target) return

  const html = target.innerHTML
  const plain = target.innerText

  try {
    const ClipboardCtor = (window as any).ClipboardItem
    if (navigator.clipboard?.write && ClipboardCtor) {
      const item = new ClipboardCtor({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' })
      })
      await navigator.clipboard.write([item])
      setCopyStatus('success')
      return
    }

    if (fallbackCopy(target)) {
      setCopyStatus('success')
    } else {
      setCopyStatus('error')
    }
  } catch (err) {
    console.error('Failed to copy with Clipboard API:', err)
    try {
      if (fallbackCopy(target)) {
        setCopyStatus('success')
      } else {
        setCopyStatus('error')
      }
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError)
      setCopyStatus('error')
    }
  }
}

onMounted(() => {
  const savedMd = localStorage.getItem('md-to-wechat-content')
  if (savedMd) markdownInput.value = savedMd
  else pasteExample()
})

watch(markdownInput, (val) => {
  localStorage.setItem('md-to-wechat-content', val)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Indie+Flower&display=swap');

.font-hand {
  font-family: 'Patrick Hand', cursive;
}

h1, h2, h3 {
  font-family: 'Indie Flower', cursive;
}

:deep(.wechat-content) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: #2f2f2f;
}

:deep(.wechat-content h1) {
  font-size: 26px;
  font-weight: 700;
  margin: 1.4em 0 0.9em;
  text-align: center;
}

:deep(.wechat-content h2) {
  font-size: 22px;
  font-weight: 700;
  margin: 1.3em 0 0.8em;
  padding-bottom: 0.35em;
}

:deep(.wechat-content h3) {
  font-size: 19px;
  font-weight: 700;
  margin: 1.1em 0 0.7em;
}

:deep(.wechat-content p) {
  margin: 0.9em 0;
}

:deep(.wechat-content ul),
:deep(.wechat-content ol) {
  padding-left: 1.2em;
  margin: 0.9em 0;
}

:deep(.wechat-content li) {
  margin: 0.35em 0;
}

:deep(.wechat-content blockquote) {
  border-left: 4px solid #111827;
  background: #f4f4f5;
  border-radius: 0 12px 12px 0;
  color: #4b5563;
  margin: 1.2em 0;
  padding: 0.75em 1em;
  font-style: italic;
}

:deep(.wechat-content pre) {
  background: #101828;
  border: 2px solid #111827;
  border-radius: 16px 8px 14px 10px / 10px 14px 8px 16px;
  padding: 14px 16px;
  overflow-x: auto;
  margin: 1.2em 0;
}

:deep(.wechat-content pre code) {
  background: transparent;
  color: #e5e7eb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.86em;
  padding: 0;
}

:deep(.wechat-content :not(pre) > code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.88em;
  background: rgba(148, 163, 184, 0.18);
  border: 1px solid rgba(100, 116, 139, 0.45);
  border-radius: 6px;
  padding: 0.12em 0.35em;
}

:deep(.wechat-content table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2em 0;
  overflow: hidden;
  border-radius: 12px;
}

:deep(.wechat-content th),
:deep(.wechat-content td) {
  border: 1px solid #d4d4d8;
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}

:deep(.wechat-content th) {
  background: #f4f4f5;
  font-weight: 700;
}

:deep(.theme-default h2) {
  border-bottom: 2px solid #111827;
}

:deep(.theme-sketch) {
  font-family: 'Patrick Hand', cursive;
}

:deep(.theme-sketch h1),
:deep(.theme-sketch h2),
:deep(.theme-sketch h3) {
  font-family: 'Indie Flower', cursive;
}

:deep(.theme-sketch h2) {
  border-bottom: 2px dashed #111827;
}

:deep(.theme-sketch table th) {
  background: #fff7ed;
}

:deep(.theme-modern) {
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
  color: #1f2937;
}

:deep(.theme-modern h2) {
  border-bottom: 3px solid #0f172a;
}

:deep(.theme-modern blockquote) {
  border-left-color: #2563eb;
  background: #eff6ff;
}
</style>
