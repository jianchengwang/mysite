<template>
  <div class="min-h-screen bg-[#fcfcfc] font-hand p-4 md:p-8">
    <div class="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <h1 class="text-4xl font-bold text-zinc-900 mb-2">MD to WeChat</h1>
        <p class="text-sm sm:text-base text-zinc-600 italic">Convert Markdown to WeChat official account format with sketch-style polish</p>
      </div>
      <div class="flex w-full flex-wrap gap-3 items-center md:w-auto">
        <button @click="copyWechatFormat" class="sketch-button bg-white text-zinc-900 font-bold">Copy to WeChat</button>
        <button @click="saveWechatDraft" :disabled="isSavingDraft" class="sketch-button !bg-zinc-900 !text-white disabled:opacity-50">
          {{ isSavingDraft ? 'Saving Draft...' : 'Save Draft' }}
        </button>
        <button @click="pasteExample" class="sketch-button bg-white text-zinc-900">Example</button>
        <button @click="clearInput" class="sketch-button bg-white text-red-600">Clear</button>
        <button @click="resetTheme" class="sketch-button bg-white text-zinc-900">Reset Default Style</button>
        <span v-if="statusMessage" class="text-xs font-bold" :class="statusToneClass">
          {{ statusMessage }}
        </span>
      </div>
    </div>

    <div class="max-w-7xl mx-auto mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <section class="sketch-card bg-white p-4 sm:p-5 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-2xl font-bold text-zinc-900">Draft Metadata</h2>
            <p class="text-sm text-zinc-500">Used when saving directly to your WeChat official account draft box.</p>
          </div>
          <button v-if="!hasWechatMpConfig" class="sketch-button py-2 px-3 text-sm" @click="openGlobalSettings">
            Open Settings
          </button>
        </div>

        <div v-if="!hasWechatMpConfig" class="sketch-border bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Missing WeChat MP AppID / AppSecret in global settings. Copy still works, but direct draft save will fail.
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="space-y-2 md:col-span-2">
            <label class="block text-sm font-bold text-zinc-700">Title</label>
            <input
              v-model="articleTitle"
              type="text"
              placeholder="Article title"
              class="w-full p-3 sketch-border bg-white outline-none"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-bold text-zinc-700">Author</label>
            <input
              v-model="articleAuthor"
              type="text"
              placeholder="Author name"
              class="w-full p-3 sketch-border bg-white outline-none"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-bold text-zinc-700">Source URL</label>
            <input
              v-model="articleSourceUrl"
              type="url"
              placeholder="https://..."
              class="w-full p-3 sketch-border bg-white outline-none"
            />
          </div>

          <div class="space-y-2 md:col-span-2">
            <label class="block text-sm font-bold text-zinc-700">Digest</label>
            <textarea
              v-model="articleDigest"
              rows="3"
              placeholder="Short summary shown in the draft list"
              class="w-full resize-none p-3 sketch-border bg-white outline-none"
            ></textarea>
          </div>
        </div>
      </section>

      <section class="sketch-card bg-white p-4 sm:p-5 space-y-4">
        <div>
          <h2 class="text-2xl font-bold text-zinc-900">Cover & Options</h2>
          <p class="text-sm text-zinc-500">If no cover is uploaded, the first article image is used as the fallback cover.</p>
        </div>

        <div class="space-y-3">
          <div class="flex flex-wrap gap-3">
            <button @click="triggerCoverUpload" class="sketch-button py-2 px-3 text-sm">Upload Cover</button>
            <button v-if="coverImageDataUrl" @click="removeCoverImage" class="sketch-button py-2 px-3 text-sm text-red-600">Remove Cover</button>
          </div>
          <input ref="coverFileInput" type="file" accept="image/*" class="hidden" @change="handleCoverUpload" />

          <div v-if="coverImageDataUrl" class="overflow-hidden rounded-3xl border-2 border-zinc-200 bg-zinc-50">
            <img :src="coverImageDataUrl" class="aspect-[16/9] w-full object-cover" />
          </div>
          <div v-else class="rounded-3xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            No manual cover uploaded yet.
          </div>
        </div>

        <label class="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <input v-model="showCoverPic" type="checkbox" class="mt-0.5 h-4 w-4 accent-zinc-900" />
          <span>Show cover image inside the article.</span>
        </label>

        <label class="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <input v-model="needOpenComment" type="checkbox" class="mt-0.5 h-4 w-4 accent-zinc-900" />
          <span>Allow comments on this article.</span>
        </label>

        <label class="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <input v-model="onlyFansCanComment" type="checkbox" :disabled="!needOpenComment" class="mt-0.5 h-4 w-4 accent-zinc-900 disabled:opacity-40" />
          <span>Only followers can comment.</span>
        </label>
      </section>
    </div>

    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 min-h-[70vh]">
      <div class="flex flex-col gap-3 h-auto lg:h-full">
        <div class="flex justify-between items-center px-2">
          <span class="text-sm font-bold uppercase tracking-wider text-zinc-500">Markdown Editor</span>
          <span class="text-xs text-zinc-500 italic">{{ markdownInput.length }} chars</span>
        </div>
        <textarea
          v-model="markdownInput"
          class="flex-1 min-h-[320px] sm:min-h-[420px] lg:min-h-0 w-full p-4 sm:p-6 sketch-card bg-white resize-none outline-none focus:sketch-shadow-sm font-mono text-sm leading-relaxed"
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
        <div class="flex-1 min-h-[320px] sm:min-h-[420px] sketch-card bg-white overflow-y-auto p-0 border-2 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div
            ref="previewArea"
            class="wechat-content p-4 sm:p-7 md:p-10"
            :class="[`theme-${currentTheme}`]"
            v-html="htmlOutput"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Marked } from 'marked'
import { highlightCode } from '~/utils/codeHighlight'
import { useGlobalWechatMpConfig } from '~/composables/useGlobalWechatMpConfig'

definePageMeta({ layout: 'default' })

type ThemeName = 'default' | 'sketch' | 'modern'
type StatusTone = 'success' | 'error'

const STORAGE_KEYS = {
  markdown: 'md-to-wechat-content',
  theme: 'md-to-wechat-theme',
  title: 'md-to-wechat-title',
  author: 'md-to-wechat-author',
  digest: 'md-to-wechat-digest',
  sourceUrl: 'md-to-wechat-source-url',
  coverImage: 'md-to-wechat-cover-image',
  showCoverPic: 'md-to-wechat-show-cover',
  needOpenComment: 'md-to-wechat-need-comment',
  onlyFansCanComment: 'md-to-wechat-only-fans-comment'
} as const

const config = useRuntimeConfig()
const markdownInput = ref('')
const currentTheme = ref<ThemeName>('sketch')
const previewArea = ref<HTMLElement | null>(null)
const coverFileInput = ref<HTMLInputElement | null>(null)
const copyStatus = ref<StatusTone | ''>('')
const copyMessage = ref('')
const saveStatus = ref<StatusTone | ''>('')
const saveMessage = ref('')
const isSavingDraft = ref(false)

const articleTitle = ref('')
const articleAuthor = ref('')
const articleDigest = ref('')
const articleSourceUrl = ref('')
const coverImageDataUrl = ref('')
const showCoverPic = ref(true)
const needOpenComment = ref(false)
const onlyFansCanComment = ref(false)

const { appId, appSecret, hasConfig: hasWechatMpConfig, openGlobalSettings } = useGlobalWechatMpConfig()

const markdownRenderer = new Marked({
  highlight(code, lang) {
    return highlightCode(code, lang)
  },
  breaks: true,
  gfm: true
})

const htmlOutput = computed(() => {
  if (!markdownInput.value) return '<p class="italic text-zinc-400 text-center mt-20">Preview will appear here...</p>'
  return markdownRenderer.parse(markdownInput.value) as string
})

const statusMessage = computed(() => saveMessage.value || copyMessage.value)
const statusToneClass = computed(() => {
  const tone = saveStatus.value || copyStatus.value
  return tone === 'success' ? 'text-green-700' : 'text-red-600'
})

const extractFirstHeading = (source: string) => {
  const match = source.match(/^#\s+(.+)$/m)
  return match?.[1]?.trim() || ''
}

const resolvedArticleTitle = computed(() =>
  articleTitle.value.trim() || extractFirstHeading(markdownInput.value) || 'Untitled Article'
)

const clearInput = () => {
  markdownInput.value = ''
  articleTitle.value = ''
  articleDigest.value = ''
  coverImageDataUrl.value = ''
}

const resetTheme = () => {
  currentTheme.value = 'sketch'
}

const pasteExample = () => {
  markdownInput.value = `# Hello WeChat!\n\nThis is a **bold** statement and some *italic* text.\n\n## Features\n- Minimalist hand-drawn style\n- Code highlighting\n- Instant preview\n\n### Code Example\n\`\`\`javascript\nfunction hello() {\n  console.log("Hello from the sketchy side!");\n}\n\`\`\`\n\n### Data Table\n| Name | Value |\n| ---- | ----: |\n| Speed | Fast |\n| Cost | Low |\n\n> Stay hungry, stay sketchy.\n`
  articleTitle.value = 'Hello WeChat!'
  articleAuthor.value = 'Jiancheng Wang'
  articleDigest.value = 'A quick demo article showing how markdown is converted into a WeChat-friendly layout.'
}

const setTransientStatus = (type: 'copy' | 'save', tone: StatusTone, message: string) => {
  if (type === 'copy') {
    copyStatus.value = tone
    copyMessage.value = message
    setTimeout(() => {
      copyStatus.value = ''
      copyMessage.value = ''
    }, 1800)
    return
  }

  saveStatus.value = tone
  saveMessage.value = message
  setTimeout(() => {
    saveStatus.value = ''
    saveMessage.value = ''
  }, 2600)
}

const fallbackCopy = (html: string, plain: string) => {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.contentEditable = 'true'
  container.innerHTML = html
  document.body.appendChild(container)

  const range = document.createRange()
  range.selectNodeContents(container)
  const selection = window.getSelection()
  if (!selection) {
    document.body.removeChild(container)
    return false
  }

  selection.removeAllRanges()
  selection.addRange(range)
  const ok = document.execCommand('copy')
  selection.removeAllRanges()
  document.body.removeChild(container)

  if (!ok && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(plain).catch(() => {})
  }

  return ok
}

const getThemePalette = (theme: ThemeName) => {
  if (theme === 'modern') {
    return {
      h2Border: '3px solid #0f172a',
      blockquoteBorder: '#2563eb',
      blockquoteBg: '#eff6ff',
      bodyFont: '\'Segoe UI\', \'PingFang SC\', sans-serif',
      bodyColor: '#1f2937'
    }
  }

  if (theme === 'default') {
    return {
      h2Border: '2px solid #111827',
      blockquoteBorder: '#111827',
      blockquoteBg: '#f4f4f5',
      bodyFont: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif',
      bodyColor: '#2f2f2f'
    }
  }

  return {
    h2Border: '2px dashed #111827',
    blockquoteBorder: '#111827',
    blockquoteBg: '#f4f4f5',
    bodyFont: '\'Patrick Hand\', cursive',
    bodyColor: '#2f2f2f'
  }
}

const applyInlineStylesToWechatHtml = (root: HTMLElement, theme: ThemeName) => {
  const palette = getThemePalette(theme)
  root.style.fontFamily = palette.bodyFont
  root.style.fontSize = '16px'
  root.style.lineHeight = '1.75'
  root.style.color = palette.bodyColor

  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.removeAttribute('class')

    if (element.tagName === 'H1') {
      element.style.cssText = 'font-size:26px;font-weight:700;margin:1.4em 0 0.9em;text-align:center;color:#111827;'
    } else if (element.tagName === 'H2') {
      element.style.cssText = `font-size:22px;font-weight:700;margin:1.3em 0 0.8em;padding-bottom:0.35em;border-bottom:${palette.h2Border};color:#111827;`
      if (theme === 'sketch') element.style.fontFamily = '\'Indie Flower\', cursive'
    } else if (element.tagName === 'H3') {
      element.style.cssText = 'font-size:19px;font-weight:700;margin:1.1em 0 0.7em;color:#111827;'
      if (theme === 'sketch') element.style.fontFamily = '\'Indie Flower\', cursive'
    } else if (element.tagName === 'P') {
      element.style.cssText = 'margin:0.9em 0;'
    } else if (element.tagName === 'UL' || element.tagName === 'OL') {
      element.style.cssText = 'padding-left:1.2em;margin:0.9em 0;'
    } else if (element.tagName === 'LI') {
      element.style.cssText = 'margin:0.35em 0;'
    } else if (element.tagName === 'BLOCKQUOTE') {
      element.style.cssText = `border-left:4px solid ${palette.blockquoteBorder};background:${palette.blockquoteBg};border-radius:0 12px 12px 0;color:#4b5563;margin:1.2em 0;padding:0.75em 1em;font-style:italic;`
    } else if (element.tagName === 'PRE') {
      element.style.cssText = 'background:#101828;border:2px solid #111827;border-radius:16px 8px 14px 10px / 10px 14px 8px 16px;padding:14px 16px;overflow-x:auto;margin:1.2em 0;color:#e5e7eb;'
    } else if (element.tagName === 'CODE') {
      if (element.parentElement?.tagName === 'PRE') {
        element.style.cssText = 'background:transparent;color:#e5e7eb;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\'Liberation Mono\',\'Courier New\',monospace;font-size:0.86em;padding:0;'
      } else {
        element.style.cssText = 'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\'Liberation Mono\',\'Courier New\',monospace;font-size:0.88em;background:rgba(148,163,184,0.18);border:1px solid rgba(100,116,139,0.45);border-radius:6px;padding:0.12em 0.35em;'
      }
    } else if (element.tagName === 'TABLE') {
      element.style.cssText = 'width:100%;border-collapse:collapse;margin:1.2em 0;overflow:hidden;border-radius:12px;'
    } else if (element.tagName === 'TH') {
      element.style.cssText = 'border:1px solid #d4d4d8;padding:8px 10px;text-align:left;vertical-align:top;background:#f4f4f5;font-weight:700;'
      if (theme === 'sketch') element.style.background = '#fff7ed'
    } else if (element.tagName === 'TD') {
      element.style.cssText = 'border:1px solid #d4d4d8;padding:8px 10px;text-align:left;vertical-align:top;'
    } else if (element.tagName === 'IMG') {
      element.style.cssText = 'display:block;max-width:100%;height:auto;margin:1em auto;border-radius:12px;'
    } else if (element.tagName === 'A') {
      element.style.cssText = 'color:#2563eb;text-decoration:none;border-bottom:1px solid rgba(37,99,235,0.35);'
    } else if (element.tagName === 'STRONG') {
      element.style.cssText = 'font-weight:700;color:#111827;'
    }
  })
}

const buildStyledWechatHtml = () => {
  const target = previewArea.value
  if (!target) return ''

  const cloned = target.cloneNode(true) as HTMLElement
  applyInlineStylesToWechatHtml(cloned, currentTheme.value)
  return cloned.innerHTML
}

const copyWechatFormat = async () => {
  const target = previewArea.value
  if (!target) return

  const html = buildStyledWechatHtml()
  const plain = target.innerText

  try {
    const ClipboardCtor = (window as any).ClipboardItem
    if (navigator.clipboard?.write && ClipboardCtor) {
      const item = new ClipboardCtor({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' })
      })
      await navigator.clipboard.write([item])
      setTransientStatus('copy', 'success', 'Copied successfully')
      return
    }

    if (fallbackCopy(html, plain)) {
      setTransientStatus('copy', 'success', 'Copied successfully')
    } else {
      setTransientStatus('copy', 'error', 'Copy failed')
    }
  } catch (error) {
    console.error('Failed to copy with Clipboard API:', error)
    if (fallbackCopy(html, plain)) {
      setTransientStatus('copy', 'success', 'Copied successfully')
    } else {
      setTransientStatus('copy', 'error', 'Copy failed')
    }
  }
}

const triggerCoverUpload = () => {
  coverFileInput.value?.click()
}

const handleCoverUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (loadEvent) => {
    if (typeof loadEvent.target?.result === 'string') {
      coverImageDataUrl.value = loadEvent.target.result
    }
  }
  reader.readAsDataURL(file)
  ;(event.target as HTMLInputElement).value = ''
}

const removeCoverImage = () => {
  coverImageDataUrl.value = ''
}

const saveWechatDraft = async () => {
  if (!hasWechatMpConfig.value) {
    setTransientStatus('save', 'error', 'Set WeChat MP AppID/AppSecret first')
    return
  }

  if (!markdownInput.value.trim()) {
    setTransientStatus('save', 'error', 'Article content is empty')
    return
  }

  isSavingDraft.value = true

  try {
    const response = await fetch(`${config.public.apiBase}/api/mp/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: appId.value.trim(),
        app_secret: appSecret.value.trim(),
        title: resolvedArticleTitle.value,
        author: articleAuthor.value.trim(),
        digest: articleDigest.value.trim(),
        content: buildStyledWechatHtml(),
        content_source_url: articleSourceUrl.value.trim(),
        cover_image_data_url: coverImageDataUrl.value || undefined,
        need_open_comment: needOpenComment.value ? 1 : 0,
        only_fans_can_comment: onlyFansCanComment.value ? 1 : 0,
        show_cover_pic: showCoverPic.value ? 1 : 0
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.detail || data.message || 'Failed to save WeChat draft')
    }

    setTransientStatus('save', 'success', `Draft saved: ${data.media_id}`)
  } catch (error: any) {
    setTransientStatus('save', 'error', error.message || 'Failed to save WeChat draft')
  } finally {
    isSavingDraft.value = false
  }
}

onMounted(() => {
  const savedMd = localStorage.getItem(STORAGE_KEYS.markdown)
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme)

  if (savedMd) {
    markdownInput.value = savedMd
  } else {
    pasteExample()
  }

  if (savedTheme === 'default' || savedTheme === 'sketch' || savedTheme === 'modern') {
    currentTheme.value = savedTheme
  }

  articleTitle.value = localStorage.getItem(STORAGE_KEYS.title) || articleTitle.value
  articleAuthor.value = localStorage.getItem(STORAGE_KEYS.author) || articleAuthor.value
  articleDigest.value = localStorage.getItem(STORAGE_KEYS.digest) || articleDigest.value
  articleSourceUrl.value = localStorage.getItem(STORAGE_KEYS.sourceUrl) || articleSourceUrl.value
  coverImageDataUrl.value = localStorage.getItem(STORAGE_KEYS.coverImage) || ''
  showCoverPic.value = localStorage.getItem(STORAGE_KEYS.showCoverPic) !== 'false'
  needOpenComment.value = localStorage.getItem(STORAGE_KEYS.needOpenComment) === 'true'
  onlyFansCanComment.value = localStorage.getItem(STORAGE_KEYS.onlyFansCanComment) === 'true'
})

watch(markdownInput, (value) => {
  localStorage.setItem(STORAGE_KEYS.markdown, value)
  if (!articleTitle.value.trim()) {
    articleTitle.value = extractFirstHeading(value)
  }
})

watch(currentTheme, (value) => {
  localStorage.setItem(STORAGE_KEYS.theme, value)
})

watch(articleTitle, value => {
  localStorage.setItem(STORAGE_KEYS.title, value)
})

watch(articleAuthor, value => {
  localStorage.setItem(STORAGE_KEYS.author, value)
})

watch(articleDigest, value => {
  localStorage.setItem(STORAGE_KEYS.digest, value)
})

watch(articleSourceUrl, value => {
  localStorage.setItem(STORAGE_KEYS.sourceUrl, value)
})

watch(coverImageDataUrl, value => {
  localStorage.setItem(STORAGE_KEYS.coverImage, value)
})

watch(showCoverPic, value => {
  localStorage.setItem(STORAGE_KEYS.showCoverPic, String(value))
})

watch(needOpenComment, value => {
  localStorage.setItem(STORAGE_KEYS.needOpenComment, String(value))
  if (!value) {
    onlyFansCanComment.value = false
  }
})

watch(onlyFansCanComment, value => {
  localStorage.setItem(STORAGE_KEYS.onlyFansCanComment, String(value))
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
