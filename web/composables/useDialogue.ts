import { computed } from 'vue'

export function useDialogue() {
  const isDialogue = (content: string): boolean => {
    if (!content) return false
    return content.includes('"') && 
           (content.includes('said') || 
            content.includes('replied') || 
            content.includes('asked') ||
            content.includes('exclaimed') ||
            content.includes('added') ||
            content.includes('continued') ||
            content.includes('responded') ||
            content.includes('chuckled') ||
            content.includes('laughed') ||
            content.includes('sighed'))
  }

  const formatDialogue = (content: string): string[] => {
    if (!content) return []
    
    let cleanContent = content
      .replace(/"([^"]+)"/g, '$1') 
      .replace(/\s*(said|replied|asked|chuckled|sighed|added|continued|responded|laughed|exclaimed)[^.]*/g, '')
      .replace(/Sarah:|Mark:/g, '') 
      .replace(/\s+/g, ' ') 
      .trim()
    
    let sentences = cleanContent.split(/[.!?]+\s*/)
    
    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }

  const highlightChunks = (text: string, chunks: { phrase: string }[]): string => {
    if (!text || !chunks) return text
    let highlightedText = text
    chunks.forEach(chunk => {
      if (chunk.phrase) {
        const regex = new RegExp(`(${chunk.phrase})`, 'gi')
        highlightedText = highlightedText.replace(regex, '<span class="chunk-highlight">$1</span>')
      }
    })
    return highlightedText
  }

  return {
    isDialogue,
    formatDialogue,
    highlightChunks
  }
}
