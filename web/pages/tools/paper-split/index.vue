<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center py-10">
    <div class="w-[90vw] max-w-7xl bg-white rounded-xl shadow-lg p-8">
      <h1 class="text-2xl font-bold mb-8 text-center">试卷分割与AI批改工具</h1>
      <!-- 图片上传区 -->
      <div class="mb-12 flex flex-col items-center">
        <FileUpload
          mode="basic"
          name="papers"
          :multiple="true"
          accept="image/*"
          :auto="false"
          customUpload
          @select="onSelect"
          class="w-full max-w-md p-button-outlined"
        />
      </div>

      <!-- 区域标注区：支持拖拽排序和删除 -->
      <client-only>
        <draggable v-if="images.length" v-model="images" item-key="id" class="flex flex-row gap-8 overflow-x-auto pb-4" :animation="200">
          <template #item="{element: img, index: idx}">
            <div class="bg-gray-50 rounded-lg shadow p-4 flex flex-col items-center min-w-[340px] relative group">
              <div class="mb-2 w-full flex items-center justify-between">
                <span class="font-semibold">图片{{ idx + 1 }} 区域标注</span>
                <span class="text-xs text-gray-500">已标注 {{ img.questions.length }} 个区域</span>
                <button class="absolute top-2 right-2 z-10 bg-white border border-gray-300 rounded-full shadow p-0.5 text-xs text-red-500 hover:bg-red-100 opacity-80 group-hover:opacity-100" @click.stop="removeImage(img.id)">×</button>
              </div>
              <img :src="img.url" class="w-64 h-80 object-contain border rounded cursor-pointer" @click="openCropper(img)" />
              <div class="text-xs text-blue-500 mt-2 cursor-pointer" @click="openCropper(img)">点击图片放大标注</div>
            </div>
          </template>
        </draggable>
      </client-only>

      <!-- 题目图片列表 -->
      <div v-if="questionImages.length" class="mt-10">
        <h2 class="text-lg font-bold mb-4">题目图片列表</h2>
        <div class="space-y-8">
          <div v-for="(q, idx) in questionImages" :key="q.id" class="bg-gray-50 rounded shadow p-4 space-y-4 w-full">
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
          <Button label="AI批改" icon="pi pi-send" class="px-6 py-2" :disabled="!questionImages.length || grading" :loading="grading" @click="onBatchGrade" />
        </div>
      </div>

      <!-- 放大标注弹窗 -->
      <Dialog v-model:visible="cropperDialogVisible" modal :closable="true" @hide="closeCropper" :style="dialogStyle" contentClass="flex items-center justify-center p-0">
        <template #header>
          <div class="w-full flex items-center justify-center py-2 font-semibold text-base">图片标注（原图像素级别）</div>
        </template>
        <div v-if="currentCropImg" class="flex items-center justify-center w-full h-full" style="padding:0;">
          <!-- 隐藏图片用于裁剪源 -->
          <img ref="cropSrcRef" :src="currentCropImg.url" class="hidden" />
          <MultiCropper
            :src="currentCropImg.url"
            v-model="currentCropImg.questions"
            :useOriginalSize="true"
            class="border rounded bg-white"
            style="max-width:1200px; max-height:90vh; overflow:auto;"
          />
        </div>
        <template #footer>
          <Button label="完成标注" @click="closeCropper" />
        </template>
      </Dialog>

      <!-- 预览弹窗 -->
      <Dialog v-model:visible="previewVisible" modal :closable="true" contentClass="flex items-center justify-center p-0">
        <template #header>
          <div class="w-full flex justify-center py-2 font-semibold">图片预览</div>
        </template>
        <img :src="previewImage" class="max-w-[90vw] max-h-[90vh] object-contain" />
        <template #footer>
          <Button label="关闭" @click="previewVisible = false" />
        </template>
      </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
// @ts-ignore: no type declarations for vuedraggable
import draggable from 'vuedraggable'
import MultiCropper from '~/components/MultiCropper.vue'
import { marked } from 'marked'
const config = useRuntimeConfig()

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

const dialogStyle = computed(() => ({
  maxWidth: '1200px',
  width: 'auto',
  minWidth: 'auto',
  minHeight: 'auto',
  maxHeight: '90vh',
  padding: '0',
  overflow: 'visible',
  background: '#fff'
}))

function onSelect(event: any) {
  const files = event.files as File[]
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
  questionImages.value = []
}

function removeImage(id: string) {
  images.value = images.value.filter(img => img.id !== id)
}

function openCropper(img: PaperImage) {
  currentCropImg.value = img
  cropperDialogVisible.value = true
}

async function closeCropper() {
  if (currentCropImg.value) {
    for (const area of currentCropImg.value.questions) {
      // 直接使用 MultiCropper 中保存的 croppedUrl
      questionImages.value.push({
        id: `${currentCropImg.value.id}-${area.id}`,
        croppedUrl: area.croppedUrl as string,
        fromImgId: currentCropImg.value.id,
        area: { id: area.id, x: area.x, y: area.y, width: area.width, height: area.height }
      })
    }
  }
  cropperDialogVisible.value = false
  currentCropImg.value = null
}

async function onBatchGrade() {
  if (!questionImages.value.length) return
  grading.value = true
  const prompt = '你是一个优秀的中国大陆的K12老师，请你只用中文回答。如果学生有作答，请你给出评测结果，看是否作答正确；如果学生没有作答，你要给出解题思路，并给出正确的答案；'
  const tasks = questionImages.value.map(async q => {
    // 去掉 data URI 前缀，并构建数组
    const pureBase64 = q.croppedUrl.replace(/^data:image\/\w+;base64,/, '')
    try {
      const res = await fetch(`${config.public.apiBase}/api/paper-split/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_urls: [pureBase64], prompt })
      })
      if (!res.ok) throw new Error('AI接口返回错误')
      const data = await res.json()
      q.aiResult = data.content
      q.markdownHtml = await marked(data.content)
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
