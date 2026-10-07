const names: Record<string, string> = { go: 'Go', vue: 'Vue', java: 'Java', live2d: 'Live2D', api: 'API', bsc: 'BSC', css: 'CSS', html: 'HTML' }
export const displayTitle = (title?: string) => {
  if (!title) return ''
  return title.replace(/-/g, ' ').replace(/\b(go|vue|java|live2d|api|bsc|css|html)\b/gi, (word) => names[word.toLowerCase()] || word).replace(/^./, (letter) => letter.toUpperCase())
}
export const contentDate = (item: { date?: unknown; meta?: Record<string, unknown> }) => {
  const raw = item.date || item.meta?.date
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return ''
  const date = new Date(raw.slice(0, 10) + 'T00:00:00Z')
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
}
