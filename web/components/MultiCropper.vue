<template>
  <div class="relative inline-block overflow-auto max-h-[90vh]" ref="containerRef">
    <img :src="src" ref="imgRef" @load="onImgLoad" class="max-w-full select-none" draggable="false" />
    <svg
      v-if="imgLoaded"
      :width="imgWidth"
      :height="imgHeight"
      class="absolute top-0 left-0 pointer-events-none"
      style="z-index:1"
    >
      <rect
        v-for="(rect, idx) in areas"
        :key="rect.id"
        :x="rect.x"
        :y="rect.y"
        :width="rect.width"
        :height="rect.height"
        fill="rgba(59,130,246,0.15)"
        stroke="#2563eb"
        stroke-width="2"
        rx="4"
      />
    </svg>
    <!-- 绘制中的矩形 -->
    <svg
      v-if="drawing && imgLoaded"
      :width="imgWidth"
      :height="imgHeight"
      class="absolute top-0 left-0 pointer-events-none"
      style="z-index:2"
    >
      <rect
        :x="drawRect.x"
        :y="drawRect.y"
        :width="drawRect.width"
        :height="drawRect.height"
        fill="rgba(16,185,129,0.15)"
        stroke="#10b981"
        stroke-width="2"
        rx="4"
      />
    </svg>
    <!-- 鼠标交互层 -->
    <div
      v-if="imgLoaded"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      class="absolute top-0 left-0 cursor-crosshair"
      :style="{ zIndex: 10, width: imgWidth + 'px', height: imgHeight + 'px' }"
    ></div>
    <!-- 区域删除按钮 -->
    <template v-for="(rect, idx) in areas">
      <button
        v-if="imgLoaded"
        :key="rect.id + '-btn'"
        class="absolute z-20 bg-white border border-gray-300 rounded-full shadow p-0.5 text-xs text-red-500 hover:bg-red-100"
        :style="deleteBtnStyle(rect)"
        @click.stop="removeArea(rect.id)"
        title="删除区域"
      >×</button>
    </template>
    <!-- 区域列表（可拖拽排序+删除） -->
    <div v-if="areas.length" class="mt-4 bg-gray-50 rounded p-2">
      <draggable v-model="areas" item-key="id" @end="onDragEnd" class="space-y-2">
        <template #item="{element, index}">
          <div class="flex items-center gap-2 p-1 border rounded bg-white hover:bg-blue-50 cursor-move">
            <span class="text-xs text-gray-600">区域{{ index + 1 }} (x:{{element.x}}, y:{{element.y}}, w:{{element.width}}, h:{{element.height}})</span>
            <button class="ml-2 text-red-500 hover:text-red-700 text-xs" @click.stop="removeArea(element.id)">删除</button>
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import draggable from 'vuedraggable'

const props = defineProps<{
  src: string
  modelValue: AreaRect[]
}>()
const emit = defineEmits(['update:modelValue'])

interface AreaRect {
  id: string
  x: number
  y: number
  width: number
  height: number
  croppedUrl?: string
}

const areas = ref<AreaRect[]>([])
const drawing = ref(false)
const drawRect = reactive({ x: 0, y: 0, width: 0, height: 0 })
const start = reactive({ x: 0, y: 0 })
const imgRef = ref<HTMLImageElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const imgLoaded = ref(false)
const imgWidth = ref(0)  // displayed width
const imgHeight = ref(0) // displayed height
const naturalWidth = ref(0)
const naturalHeight = ref(0)

watch(() => props.modelValue, (val) => {
  areas.value = val ? [...val] : []
}, { immediate: true })

function onImgLoad() {
  imgLoaded.value = true
  nextTick(() => {
    if (imgRef.value) {
      naturalWidth.value = imgRef.value.naturalWidth
      naturalHeight.value = imgRef.value.naturalHeight
      imgWidth.value = imgRef.value.clientWidth
      imgHeight.value = imgRef.value.clientHeight
    }
  })
}

function onMouseDown(e: MouseEvent) {
  if (!imgLoaded.value || !imgRef.value) return
  const rect = imgRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  start.x = x
  start.y = y
  drawRect.x = x
  drawRect.y = y
  drawRect.width = 0
  drawRect.height = 0
  drawing.value = true
}

function onMouseMove(e: MouseEvent) {
  if (!drawing.value || !imgRef.value) return
  const rect = imgRef.value.getBoundingClientRect()
  let x = e.clientX - rect.left
  let y = e.clientY - rect.top
  let dx = x - start.x
  let dy = y - start.y
  drawRect.x = dx < 0 ? x : start.x
  drawRect.y = dy < 0 ? y : start.y
  drawRect.width = Math.abs(dx)
  drawRect.height = Math.abs(dy)
}

function onMouseUp() {
  if (!drawing.value || !imgRef.value) return
  drawing.value = false
  if (drawRect.width > 10 && drawRect.height > 10) {
    // 计算相对原图像素坐标
    const scaleX = naturalWidth.value / imgWidth.value
    const scaleY = naturalHeight.value / imgHeight.value
    const rx = Math.round(drawRect.x * scaleX)
    const ry = Math.round(drawRect.y * scaleY)
    const rw = Math.round(drawRect.width * scaleX)
    const rh = Math.round(drawRect.height * scaleY)
    // 裁剪为base64
    const canvas = document.createElement('canvas')
    canvas.width = rw
    canvas.height = rh
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(imgRef.value, rx, ry, rw, rh, 0, 0, rw, rh)
    const croppedUrl = canvas.toDataURL('image/png')
    // 新区域包含裁剪结果
    const newRect: AreaRect = {
      id: `${Date.now()}-${Math.random()}`,
      x: Math.round(drawRect.x),
      y: Math.round(drawRect.y),
      width: Math.round(drawRect.width),
      height: Math.round(drawRect.height),
      croppedUrl
    }
    areas.value.push(newRect)
    emit('update:modelValue', [...areas.value])
  }
  drawRect.x = drawRect.y = drawRect.width = drawRect.height = 0
}

function removeArea(id: string) {
  areas.value = areas.value.filter(a => a.id !== id)
  emit('update:modelValue', [...areas.value])
}

function onDragEnd() {
  emit('update:modelValue', [...areas.value])
}

function deleteBtnStyle(rect: AreaRect) {
  return `left:${rect.x + rect.width - 12}px;top:${rect.y - 12}px;`
}
</script>

<style scoped>
.relative {
  user-select: none;
}
</style> 