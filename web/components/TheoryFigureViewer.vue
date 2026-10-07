<template>
  <p class="theory-figure-help">白板图可点按放大，查看细节。</p>
  <Teleport to="body">
    <dialog ref="dialog" class="theory-figure-dialog" aria-label="白板图高清查看" @close="restoreScroll">
      <div class="theory-figure-toolbar">
        <button type="button" @click="fit">适应屏幕</button>
        <button type="button" :disabled="width >= naturalWidth * 2" @click="width = Math.min(naturalWidth * 2, width * 1.5)">放大</button>
        <a :href="src" target="_blank" rel="noopener noreferrer">打开原图</a>
        <button type="button" aria-label="关闭高清图" @click="dialog?.close()">关闭</button>
      </div>
      <div class="theory-figure-canvas"><img v-if="src" :src="src" :alt="alt" :style="{ width: width + 'px' }" /></div>
      <p class="theory-figure-caption">{{ alt }} · 可左右移动查看</p>
    </dialog>
  </Teleport>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
const props = withDefaults(defineProps<{ assetPrefix?: string }>(), { assetPrefix: '/collections-assets/llm-to-agent-learning/' })
const dialog = ref<HTMLDialogElement>()
const src = ref(''), alt = ref(''), width = ref(600), naturalWidth = ref(1600)
let reader: HTMLElement | null = null, observer: MutationObserver | undefined, oldOverflow = ''
const fit = () => { width.value = Math.min(naturalWidth.value, window.innerWidth - 44) }
const restoreScroll = () => { document.body.style.overflow = oldOverflow }
const enhance = () => {
  reader?.querySelectorAll<HTMLImageElement>('.article-body img').forEach(image => {
    if (!image.getAttribute('src')?.startsWith(props.assetPrefix)) return
    image.tabIndex = 0; image.setAttribute('role', 'button')
    image.setAttribute('aria-label', image.alt + '，点按查看高清图')
    image.dataset.theoryFigureZoom = 'true'
  })
}
const open = (event: Event) => {
  const image = event.target as HTMLImageElement
  if (image.tagName !== 'IMG' || image.dataset.theoryFigureZoom !== 'true') return
  if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return
  event.preventDefault(); src.value = image.currentSrc; alt.value = image.alt
  naturalWidth.value = image.naturalWidth || 1600
  width.value = Math.min(naturalWidth.value, Math.max(600, window.innerWidth - 44))
  oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
}
onMounted(() => {
  reader = document.querySelector('.serial-reader:not(.novel-reader)')
  enhance(); reader?.addEventListener('click', open); reader?.addEventListener('keydown', open)
  if (reader) { observer = new MutationObserver(enhance); observer.observe(reader, { childList: true, subtree: true }) }
})
onUnmounted(() => {
  observer?.disconnect(); reader?.removeEventListener('click', open); reader?.removeEventListener('keydown', open)
  if (dialog.value?.open) { dialog.value.close(); restoreScroll() }
})
</script>
<style>
.theory-figure-help{margin:20px 22px;color:var(--muted);font-size:13px;text-align:center}
img[data-theory-figure-zoom]{cursor:zoom-in}
.theory-figure-dialog{padding:0;width:calc(100vw - 24px);max-width:1500px;max-height:calc(100dvh - 24px);border:1px solid #b3beb3;border-radius:8px;background:#fff;color:#263029;overflow:auto}
.theory-figure-dialog::backdrop{background:rgba(13,25,17,.75)}
.theory-figure-toolbar{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;position:sticky;top:0;z-index:1;background:#f4f6f1;padding:10px;border-bottom:1px solid #ccd3c8}
.theory-figure-toolbar button,.theory-figure-toolbar a{display:inline-flex;align-items:center;justify-content:center;padding:8px 10px;min-height:44px;border:1px solid #ccd3c8;border-radius:4px;background:#fff;color:#263029;font-size:14px;text-decoration:none}
.theory-figure-canvas{overflow:auto;max-height:calc(100dvh - 160px);padding:10px;overscroll-behavior:contain;touch-action:pan-x pan-y pinch-zoom}
.theory-figure-canvas img{display:block;max-width:none;height:auto;margin:0}
.theory-figure-caption{margin:12px;font-size:13px;line-height:1.6}
</style>
