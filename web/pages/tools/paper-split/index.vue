<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-6 sm:py-10">
    <div class="w-full max-w-7xl rounded-xl bg-white p-4 shadow-lg sm:p-8">
      <h1 class="mb-6 text-center text-xl font-bold sm:mb-8 sm:text-2xl">试卷分割与AI批改工具</h1>
      <div v-if="!apiKey" class="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        请先在右上角全局设置里填写 OpenRouter API Key，当前页面会直接从前端请求 OpenRouter。
        <button type="button" class="ml-2 font-semibold underline" @click="openGlobalSettings">打开设置</button>
      </div>
      <!-- 图片上传区 -->
      <div class="mb-12 flex flex-col items-center">
        <label class="flex w-full max-w-md cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-400 bg-zinc-50 px-6 py-8 text-center text-sm text-zinc-600 transition hover:border-zinc-900 hover:bg-white">
          <input
            type="file"
            name="papers"
            multiple
            accept="image/*"
            class="hidden"
            @change="onSelect"
          />
          <span>点击上传试卷图片</span>
        </label>
      </div>

      <!-- 区域标注区：支持拖拽排序和删除 -->
      <client-only>
        <draggable v-if="images.length" v-model="images" item-key="id" class="flex flex-row gap-4 overflow-x-auto pb-4 sm:gap-8" :animation="200">
          <template #item="{element: img, index: idx}">
            <div class="relative flex min-w-[260px] flex-col items-center rounded-lg bg-gray-50 p-4 shadow group sm:min-w-[340px]">
              <div class="mb-2 w-full flex items-center justify-between">
                <span class="font-semibold">图片{{ idx + 1 }} 区域标注</span>
                <span class="text-xs text-gray-500">已标注 {{ img.questions.length }} 个区域</span>
                <button class="absolute top-2 right-2 z-10 bg-white border border-gray-300 rounded-full shadow p-0.5 text-xs text-red-500 hover:bg-red-100 opacity-80 group-hover:opacity-100" @click.stop="removeImage(img.id)">×</button>
              </div>
              <img :src="img.url" class="h-72 w-full max-w-64 cursor-pointer rounded border object-contain sm:h-80" @click="openCropper(img)" />
              <div class="text-xs text-blue-500 mt-2 cursor-pointer" @click="openCropper(img)">点击图片放大标注</div>
            </div>
          </template>
        </draggable>
      </client-only>

      <!-- 题目图片列表 -->
      <div v-if="questionImages.length" class="mt-10">
        <h2 class="text-lg font-bold mb-4">题目图片列表</h2>
        <div class="space-y-8">
          <div v-for="(q, idx) in questionImages" :key="q.id" class="w-full space-y-4 rounded bg-gray-50 p-4 shadow">
            <div class="flex flex-col items-start gap-2">
              <span class="text-sm font-semibold text-gray-700">题目 {{ idx + 1 }}</span>
              <img
                :src="q.croppedUrl"
                class="w-full h-auto object-contain border rounded bg-white cursor-pointer"
                @click="openPreview(q.croppedUrl)"
              />
            </div>
            <div class="w-full text-left">
              <span class="text-xs text-gray-500">AI批改结果：</span>
              <div class="border rounded bg-gray-50 p-4 min-h-[40px] mt-1 text-sm prose prose-sm max-w-none w-full text-left">
                <span v-if="!q.aiResult" class="text-gray-400">（等待批改）</span>
                <div v-else v-html="q.markdownHtml"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end mt-8">
          <button
            type="button"
            class="rounded-lg bg-zinc-900 px-6 py-2 text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            :disabled="!questionImages.length || grading"
            @click="onBatchGrade"
          >
            {{ grading ? '批改中...' : 'AI批改' }}
          </button>
        </div>
      </div>

      <!-- 放大标注弹窗 -->
      <Teleport to="body">
        <div
          v-if="cropperDialogVisible"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="closeCropper"
        >
          <div class="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-h-[90vh]">
            <div class="flex items-center justify-between border-b px-5 py-4">
              <div class="font-semibold text-base">图片标注（原图像素级别）</div>
              <button type="button" class="text-2xl leading-none text-zinc-500 hover:text-zinc-900" @click="closeCropper">×</button>
            </div>
            <div v-if="currentCropImg" class="flex items-center justify-center overflow-auto p-2 sm:p-4">
              <img ref="cropSrcRef" :src="currentCropImg.url" class="hidden" />
              <MultiCropper
                :src="currentCropImg.url"
                v-model="currentCropImg.questions"
                :useOriginalSize="true"
                class="border rounded bg-white"
                style="max-width:1200px; max-height:90vh; overflow:auto;"
              />
            </div>
            <div class="flex justify-end border-t px-5 py-4">
              <button
                type="button"
                class="rounded-lg bg-zinc-900 px-5 py-2 text-white transition hover:bg-zinc-700"
                @click="closeCropper"
              >
                完成标注
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- 预览弹窗 -->
      <Teleport to="body">
        <div
          v-if="previewVisible"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          @click.self="previewVisible = false"
        >
          <div class="flex max-h-[96dvh] w-full max-w-[96vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-[90vw]">
            <div class="flex items-center justify-between border-b px-5 py-4">
              <div class="font-semibold">图片预览</div>
              <button type="button" class="text-2xl leading-none text-zinc-500 hover:text-zinc-900" @click="previewVisible = false">×</button>
            </div>
            <div class="overflow-auto p-4">
              <img :src="previewImage" class="max-h-[70vh] max-w-full object-contain sm:max-w-[90vw]" />
            </div>
            <div class="flex justify-end border-t px-5 py-4">
              <button
                type="button"
                class="rounded-lg border border-zinc-300 bg-white px-5 py-2 text-zinc-900 transition hover:border-zinc-900"
                @click="previewVisible = false"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// @ts-ignore: no type declarations for vuedraggable
import draggable from 'vuedraggable'
import MultiCropper from '~/components/MultiCropper.vue'
import { useGlobalOpenRouterKey } from '~/composables/useGlobalOpenRouterKey'
import { marked } from 'marked'

interface QuestionArea {
  id: string
  x: number
  y: number
  width: number
  height: number
  croppedUrl?: string
}
interface PaperImage {
  id: string
  url: string
  name: string
  size: number
  questions: QuestionArea[]
}
interface QuestionImage {
  id: string
  croppedUrl: string
  fromImgId: string
  area: QuestionArea
  aiResult?: string
  markdownHtml?: string
}

const images = ref<PaperImage[]>([])
const questionImages = ref<QuestionImage[]>([])
const cropperDialogVisible = ref(false)
const currentCropImg = ref<PaperImage | null>(null)
const cropSrcRef = ref<HTMLImageElement|null>(null)
const previewVisible = ref(false)
const previewImage = ref<string>("")
const grading = ref(false)
const { apiKey, openGlobalSettings } = useGlobalOpenRouterKey()

const syncQuestionImages = () => {
  questionImages.value = images.value.flatMap((img) =>
    img.questions
      .filter(area => area.croppedUrl)
      .map((area) => ({
        id: `${img.id}-${area.id}`,
        croppedUrl: area.croppedUrl as string,
        fromImgId: img.id,
        area: { id: area.id, x: area.x, y: area.y, width: area.width, height: area.height }
      }))
  )
}

function onSelect(event: Event) {
  const target = event.target as HTMLInputElement | null
  const files = target?.files ? Array.from(target.files) : []
  if (!files.length) return

  for (const file of files) {
    const reader = new FileReader()
    reader.onload = (e) => {
      images.value.push({
        id: `${Date.now()}-${Math.random()}`,
        url: e.target?.result as string,
        name: file.name,
        size: file.size,
        questions: []
      })
    }
    reader.readAsDataURL(file)
  }

  target.value = ''
  questionImages.value = []
}

function removeImage(id: string) {
  images.value = images.value.filter(img => img.id !== id)
  syncQuestionImages()
}

function openCropper(img: PaperImage) {
  currentCropImg.value = img
  cropperDialogVisible.value = true
}

async function closeCropper() {
  syncQuestionImages()
  cropperDialogVisible.value = false
  currentCropImg.value = null
}

async function onBatchGrade() {
  if (!questionImages.value.length) return
  if (!apiKey.value) {
    alert('请先在右上角全局设置里填写 OpenRouter API Key')
    return
  }

  grading.value = true
  const prompt = '你是一个优秀的中国大陆的K12老师，请你只用中文回答。如果学生有作答，请你给出评测结果，看是否作答正确；如果学生没有作答，你要给出解题思路，并给出正确的答案；'
  const tasks = questionImages.value.map(async q => {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.value}`
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: q.croppedUrl } }
              ]
            }
          ]
        })
      })
      if (!res.ok) throw new Error('OpenRouter 接口返回错误')
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (!content || typeof content !== 'string') {
        throw new Error('AI 未返回可用内容')
      }
      q.aiResult = content
      q.markdownHtml = await marked(content)
    } catch (e) {
      q.aiResult = 'AI批改失败'
      q.markdownHtml = '<p>AI批改失败</p>'
    }
  })
  await Promise.all(tasks)
  grading.value = false
}

function openPreview(url: string) {
  previewImage.value = url
  previewVisible.value = true
}
</script>

<style scoped>
</style>
