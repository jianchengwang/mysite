import { onMounted } from 'vue'

export function useReaderPreferences() {
  const fontSize = useState<number>('reader-font-size', () => 18)
  const theme = useState<'paper' | 'night'>('reader-background', () => 'paper')
  const loaded = useState<boolean>('reader-preferences-loaded', () => false)
  const save = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch {} }
  onMounted(() => {
    if (loaded.value) return
    loaded.value = true
    try {
      const size = Number(localStorage.getItem('mysite-reading-font-size'))
      if (Number.isInteger(size) && size >= 16 && size <= 24) fontSize.value = size
      const saved = localStorage.getItem('mysite-reading-theme')
      if (saved === 'paper' || saved === 'night') theme.value = saved
      else if (saved === null) {
        const previous = localStorage.getItem('mysite-novel-reading-theme')
        if (previous === 'novel-paper' || previous === 'novel-night') {
          theme.value = previous === 'novel-night' ? 'night' : 'paper'
          save('mysite-reading-theme', theme.value)
        }
      }
    } catch {}
  })
  const resize = (amount: number) => {
    fontSize.value = Math.min(24, Math.max(16, fontSize.value + amount))
    save('mysite-reading-font-size', String(fontSize.value))
  }
  const setTheme = (value: 'paper' | 'night') => {
    theme.value = value
    save('mysite-reading-theme', value)
  }
  return { fontSize, theme, resize, setTheme }
}
