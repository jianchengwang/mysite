<template>
  <div class="min-h-screen bg-[#fcfcfc] font-hand p-4 md:p-8">
    <div class="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
      <div>
        <h1 class="text-4xl font-bold text-zinc-900 mb-2 font-hand">MD to WeChat</h1>
        <p class="text-zinc-600 italic">Convert Markdown to WeChat official account format with style</p>
      </div>
      <div class="flex gap-4">
        <button @click="copyWechatFormat" class="sketch-button bg-zinc-900 text-white flex items-center gap-2">
          <span>📋 Copy for WeChat</span>
        </button>
        <button @click="pasteExample" class="sketch-button bg-white text-zinc-900">
          Example
        </button>
        <button @click="clearInput" class="sketch-button bg-white text-red-500 border-red-200">
          Clear
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
      <!-- Editor -->
      <div class="flex flex-col gap-4 h-full">
        <div class="flex justify-between items-center px-2">
          <span class="text-sm font-bold uppercase tracking-wider text-zinc-400">Markdown Editor</span>
          <span class="text-xs text-zinc-400 italic">{{ markdownInput.length }} characters</span>
        </div>
        <textarea
          v-model="markdownInput"
          class="flex-1 w-full p-6 sketch-card bg-white resize-none outline-none focus:sketch-shadow-sm font-mono text-sm leading-relaxed"
          placeholder="Paste your markdown here..."
        ></textarea>
      </div>

      <!-- Preview -->
      <div class="flex flex-col gap-4 h-full">
        <div class="flex justify-between items-center px-2">
          <span class="text-sm font-bold uppercase tracking-wider text-zinc-400">WeChat Preview</span>
          <div class="flex gap-4">
            <select v-model="currentTheme" class="text-xs bg-transparent border-none outline-none font-hand cursor-pointer text-zinc-500 hover:text-zinc-900">
              <option value="default">Default Theme</option>
              <option value="sketch">Sketchy Theme</option>
              <option value="modern">Modern Theme</option>
            </select>
          </div>
        </div>
        <div class="flex-1 sketch-card bg-white overflow-y-auto p-0 border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div 
            ref="previewArea"
            class="wechat-content p-8 md:p-12"
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

const htmlOutput = computed(() => {
  if (!markdownInput.value) return '<p class="italic text-zinc-400 text-center mt-20">Preview will appear here...</p>'
  
  // Configure marked for code highlighting
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value
      }
      return hljs.highlightAuto(code).value
    },
    breaks: true,
    gfm: true
  })

  return marked(markdownInput.value)
})

const clearInput = () => {
  markdownInput.value = ''
}

const pasteExample = () => {
  markdownInput.value = `# Hello WeChat!

This is a **bold** statement and some *italic* text.

## Features
- Minimalist hand-drawn style
- Code highlighting
- Instant preview

### Code Example
\`\`\`javascript
function hello() {
  console.log("Hello from the sketchy side!");
}
\`\`\`

> Stay hungry, stay sketchy.

---
`
}

const copyWechatFormat = async () => {
  const previewArea = document.querySelector('.wechat-content')
  if (!previewArea) return

  try {
    const range = document.createRange()
    range.selectNode(previewArea)
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand('copy')
      selection.removeAllRanges()
      alert('Copied to clipboard! You can now paste it into the WeChat editor.')
    }
  } catch (err) {
    console.error('Failed to copy:', err)
    alert('Failed to copy. Please try selecting the preview content manually.')
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
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Indie+Flower&family=Long+Cang&display=swap');

.font-hand {
  font-family: 'Patrick Hand', cursive;
}

h1, h2, h3 {
  font-family: 'Indie Flower', cursive;
}

/* WeChat Specific Styling to ensure it looks good when pasted */
:deep(.wechat-content) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
}

:deep(.wechat-content h1) {
  font-size: 24px;
  font-weight: bold;
  margin: 1.5em 0 1em;
  text-align: center;
  color: #000;
}

:deep(.wechat-content h2) {
  font-size: 20px;
  font-weight: bold;
  margin: 1.5em 0 1em;
  border-bottom: 2px solid #000;
  padding-bottom: 5px;
  color: #000;
}

:deep(.wechat-content h3) {
  font-size: 18px;
  font-weight: bold;
  margin: 1.2em 0 0.8em;
  color: #000;
}

:deep(.wechat-content p) {
  margin: 1em 0;
}

:deep(.wechat-content ul), :deep(.wechat-content ol) {
  padding-left: 20px;
  margin: 1em 0;
}

:deep(.wechat-content li) {
  margin: 0.5em 0;
}

:deep(.wechat-content blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 15px;
  color: #666;
  margin: 1.5em 0;
  font-style: italic;
}

:deep(.wechat-content pre) {
  background: #f6f8fa;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1.5em 0;
}

:deep(.wechat-content code) {
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
  font-size: 0.9em;
  background: rgba(175, 184, 193, 0.2);
  padding: 0.2em 0.4em;
  border-radius: 6px;
}

:deep(.wechat-content pre code) {
  background: none;
  padding: 0;
}

/* Sketchy Theme */
:deep(.theme-sketch) {
  font-family: 'Patrick Hand', cursive;
}

:deep(.theme-sketch h1), :deep(.theme-sketch h2), :deep(.theme-sketch h3) {
  font-family: 'Indie Flower', cursive;
  color: #000;
}

:deep(.theme-sketch h2) {
  border-bottom: 2px dashed #000;
}

:deep(.theme-sketch blockquote) {
  border-left: 4px solid #000;
  background: #f9f9f9;
  padding: 10px 20px;
  border-radius: 0 10px 10px 0;
}
</style>
