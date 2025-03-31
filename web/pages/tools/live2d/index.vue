<!-- Live2D Viewer -->
<template>
  <div class="page-container">
    <div class="main-content">
      <div class="content-wrapper">
        <!-- 左侧：Live2D 模型显示区域 -->
        <div class="character-container">
          <div id="L2dCanvas" class="live2d-canvas">
            <!-- Tips will appear here -->
          </div>
        </div>

        <!-- 右侧：聊天控制区域 -->
        <div class="control-panel">
          <!-- 角色选择 -->
          <div class="character-selector">
            <label for="character-select">选择角色：</label>
            <select 
              id="character-select" 
              v-model="currentModel" 
              class="character-select"
              @change="handleModelChange"
            >
              <option v-for="model in availableModels" :key="model.id" :value="model.id">
                {{ model.name }}
              </option>
            </select>
          </div>

          <!-- 回复内容显示 -->
          <div class="response-container">
            <div class="response-bubble" v-if="characterResponse">
              {{ characterResponse }}
            </div>
            <div class="empty-response" v-else>
              和{{ currentCharacterName }}聊天吧~
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 聊天输入框固定在页面底部 -->
    <div class="global-input-wrapper">
      <div class="input-container">
        <input 
          v-model="userInput" 
          @keyup.enter="sendMessage"
          placeholder="输入消息..."
          class="chat-input"
        >
        <button @click="sendMessage" class="send-button">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
const config = useRuntimeConfig()

// Extend window interface for l2dv
declare global {
  interface Window {
    l2dv: any;
    L2dViewer: any;
  }
}

// Canvas reference
const live2dCanvas = ref<HTMLCanvasElement | null>(null)

// Current state
const currentModel = ref('xuefeng_3')
const isModelLoaded = ref(false)
const userInput = ref('')
const characterResponse = ref('')
const isLoading = ref(false)

// Chat state
const messages = ref<Array<{text: string, isUser: boolean}>>([])
const chatMessages = ref<HTMLDivElement>()

// Available models (二次元风格的模型)
const availableModels = ref([
  { id: 'xuefeng_3', name: '雪风' },
  { id: 'xuefeng', name: '苦菜' },
  { id: 'lafei_4', name: '拉菲' },
  { id: 'lafei', name: '白菜' },
  { id: 'chuixue_3', name: '翠雪' }
])

// Calculate current character name
const currentCharacterName = computed(() => {
  const model = availableModels.value.find(m => m.id === currentModel.value)
  return model ? model.name : '雪风'
})

// Live2D instance and speech synthesis reference
let l2dv: any = null
let speechSynthesis: SpeechSynthesis | null = null

// Load Live2D SDK
const loadSDK = async () => {
  try {
    await Promise.all([
      loadScript('https://unpkg.com/core-js-bundle@3.6.1/minified.js'),
      loadScript('https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/lib/live2dcubismcore.min.js'),
      loadScript('https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/live2dv3.js'),
      loadScript('https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/js/charData.js'),
    ])
    return true
  } catch (error) {
    console.error('Failed to load Live2D SDK:', error)
    return false
  }
}

// Helper functions
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

// Initialize Live2D viewer
const initializeLive2D = async () => {
  try {
    const canvas = document.getElementById('L2dCanvas')
    if (!canvas) {
      console.error('Canvas element not found')
      return
    }
    
    console.log('Initializing Live2D with model:', currentModel.value)
    
    // 清除旧的实例
    if (l2dv) {
      l2dv = null
    }
    
    // 清除旧的内容
    canvas.innerHTML = ''
    
    // 创建 Live2D 实例
    window.l2dv = new window.L2dViewer({
      el: canvas,
      modelHomePath: 'https://cdn.jsdelivr.net/gh/jianchengwang/live2d_models@main/assets/model/moc3/',
      model: currentModel.value,
      width: 600,
      height: 600,
      autoMotion: true
    })
    
    // 保存引用
    l2dv = window.l2dv
    isModelLoaded.value = true
    
    // 初始化语音合成
    if (window.speechSynthesis) {
      speechSynthesis = window.speechSynthesis
    }
    
    console.log('Live2D initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Live2D viewer:', error)
  }
}

// Handle model change
const handleModelChange = async () => {
  try {
    console.log('Changing model to:',  currentModel.value)
    
    // Stop current speech playback
    if (speechSynthesis) {
      speechSynthesis.cancel()
    }
    
    l2dv.loadModel(currentModel.value)
    
    // 清除响应
    characterResponse.value = ''
    
    // 显示欢迎消息
    setTimeout(() => {
      showWelcomeMessage()
    }, 500)
  } catch (error) {
    console.error('Failed to change model:', error)
    // 如果切换失败，回退到默认模型
    currentModel.value = 'xuefeng_3'
  }
}

// Show welcome message
const showWelcomeMessage = () => {
  const messages: Record<string, string> = {
    '雪风': '你好呀~ 有什么想和我聊的吗？(｡･ω･｡)',
    '拉菲': '唔...主人好呀，有什么需要拉菲做的吗？',
    '翠雪': '主人，今天也要元气满满哦！(*^▽^*)'
  };
  
  const name = currentCharacterName.value;
  characterResponse.value = messages[name] || messages['雪风'];
  
  // Play welcome voice
  if (characterResponse.value) {
    playVoice(characterResponse.value);
  }
}

// Send message to AI
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return
  
  const message = userInput.value
  userInput.value = '' // Clear input immediately for better UX
  isLoading.value = true
  
  try {
    // Use relative path to ensure correct API endpoint is found
    const response = await fetch(`${config.public.apiBase}/api/live2d/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        character: currentCharacterName.value,
        temperature: 0.7,
        max_tokens: 100
      })
    })

    if (!response.ok) {
      throw new Error('API request failed with status ' + response.status)
    }

    const data = await response.json()
    
    // Update character response
    characterResponse.value = data.message
    
    // If emotion is returned, trigger corresponding action
    if (data.emotion) {
      triggerEmotion(data.emotion)
    }
    
    // Play voice
    playVoice(data.message)

  } catch (error) {
    console.error('Chat API Error:', error)
    characterResponse.value = '抱歉，我现在有点累了呢 (｡>﹏<｡)'
    triggerEmotion('困倦')
  } finally {
    isLoading.value = false
  }
}

// Play voice
const playVoice = (text: string) => {
  if (!speechSynthesis) return
  
  try {
    // Cancel previous speech
    speechSynthesis.cancel()
    
    // Create new speech
    const utterance = new SpeechSynthesisUtterance(text)
    
    // Set to female voice
    utterance.lang = 'zh-CN'
    utterance.pitch = 1.2 // Higher pitch for cuter voice
    utterance.rate = 1.1  // Slightly faster
    
    // Try to select female voice
    const voices = speechSynthesis.getVoices()
    const femaleVoice = voices.find(voice => 
      voice.lang.includes('zh') && voice.name.includes('female')
    )
    
    if (femaleVoice) {
      utterance.voice = femaleVoice
    } else {
      // If no specific female voice found, try to find Chinese voice
      const chineseVoice = voices.find(voice => voice.lang.includes('zh'))
      if (chineseVoice) {
        utterance.voice = chineseVoice
      }
    }
    
    // Play voice
    speechSynthesis.speak(utterance)
  } catch (error) {
    console.error('Failed to play voice:', error)
  }
}

// Trigger Live2D model emotion/action
const triggerEmotion = (emotion: string) => {
  if (!l2dv) return
  
  try {
    // Trigger different actions based on emotion
    switch (emotion) {
      case '开心':
        l2dv.startMotion('tap_body')
        break
      case '害羞':
        l2dv.startMotion('shake')
        break
      case '困倦':
        l2dv.startMotion('idle')
        break
      case '惊讶':
        l2dv.startMotion('tap_face')
        break
      case '生气':
        l2dv.startMotion('pinch')
        break
    }
  } catch (error) {
    console.error('Failed to trigger emotion:', error)
  }
}

onMounted(async () => {
  const sdkLoaded = await loadSDK()
  if (sdkLoaded) {
    await initializeLive2D()
    
    // Delay showing welcome message until model is loaded
    setTimeout(() => {
      showWelcomeMessage()
    }, 1000)
    
    // Preload speech synthesis voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
    }
  }
})

onUnmounted(() => {
  if (l2dv) {
    l2dv = null
  }
  if (speechSynthesis) {
    speechSynthesis.cancel()
  }
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  width: 100%;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  padding-bottom: 120px; /* 为底部输入框预留空间 */
}

.main-content {
  flex: 1;
  padding: 40px;
  padding-bottom: 40px; /* 减小底部padding */
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 30px;
  align-items: flex-start;
  justify-content: center;
}

.control-panel {
  width: 450px;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 600px;
}

.character-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  width: 600px;
  height: 600px;
}

.live2d-canvas {
  width: 100% !important;
  height: 100% !important;
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

#L2dCanvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.character-selector {
  padding: 20px 20px 10px;
  border-bottom: 1px solid #eee;
}

.character-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: white;
  font-size: 16px;
  width: 100%;
  margin-top: 8px;
}

.response-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  margin-bottom: 0;
}

.response-bubble {
  background: #fff;
  border: 1px solid #eee;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-size: 16px;
  line-height: 1.5;
  animation: fadeIn 0.3s ease;
}

.empty-response {
  color: #999;
  text-align: center;
  padding: 20px;
  font-style: italic;
}

.global-input-wrapper {
  position: fixed;
  bottom: 180px; /* 从底部抬高 */
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  width: 800px;
  border-radius: 12px;
}

.input-container {
  width: 100%;
  display: flex;
  gap: 10px;
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  outline: none;
  font-size: 16px;
}

.chat-input:focus {
  border-color: #007bff;
}

.send-button {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-weight: bold;
}

.send-button:hover {
  background: #0056b3;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1024px) {
  .content-wrapper {
    flex-direction: column-reverse;
    align-items: center;
    padding-bottom: 40px;
  }
  
  .control-panel, .character-container {
    width: 100%;
    max-width: 600px;
  }
  
  .character-container {
    margin-bottom: 20px;
  }

  .global-input-wrapper {
    width: calc(100% - 40px);
    bottom: 20px;
    padding: 15px;
  }
}
</style> 