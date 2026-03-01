import { ref, onMounted } from 'vue'

export function useTTS() {
  const isPlaying = ref(false)
  const speechSynthesis = ref<SpeechSynthesis | null>(null)

  onMounted(() => {
    if (process.client) {
      speechSynthesis.value = window.speechSynthesis
    }
  })

  const stop = () => {
    if (speechSynthesis.value) {
      speechSynthesis.value.cancel()
      isPlaying.value = false
    }
  }

  const speak = (lines: string[], onEnd?: () => void) => {
    if (!speechSynthesis.value) return

    stop()
    isPlaying.value = true

    lines.forEach((line, index) => {
      const utterance = new SpeechSynthesisUtterance(line)
      const voices = window.speechSynthesis.getVoices()
      const femaleVoice = voices.find(voice => voice.name.toLowerCase().includes('female'))
      const maleVoice = voices.find(voice => voice.name.toLowerCase().includes('male'))

      if (index % 2 === 0 && femaleVoice) {
        utterance.voice = femaleVoice
        utterance.pitch = 1.1
      } else if (maleVoice) {
        utterance.voice = maleVoice
        utterance.pitch = 0.9
      }

      if (index === lines.length - 1) {
        utterance.onend = () => {
          isPlaying.value = false
          if (onEnd) onEnd()
        }
      }
      speechSynthesis.value?.speak(utterance)
    })
  }

  return {
    isPlaying,
    speak,
    stop
  }
}
