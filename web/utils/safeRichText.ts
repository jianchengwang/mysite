import { Marked, Renderer } from 'marked'

const DATA_IMAGE_URL_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/]+=*$/i

const escapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => escapeMap[char] || char)

const escapeAttribute = (value: string) => escapeHtml(value).replace(/`/g, '&#96;')

const isSafeUrl = (value: string | null | undefined, options: { allowDataImage?: boolean } = {}) => {
  const normalized = value?.trim() || ''
  if (!normalized) return false
  if (normalized.startsWith('#')) return true

  if (options.allowDataImage && DATA_IMAGE_URL_PATTERN.test(normalized)) {
    return true
  }

  try {
    const parsed = new URL(normalized, 'https://safe.local')
    const hasProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(normalized)

    if (!hasProtocol) {
      return true
    }

    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

const renderer = new Renderer()

renderer.html = (token: any) => escapeHtml(token?.text || token?.raw || '')

renderer.link = function (this: any, { href, title, tokens }: any) {
  const text = this.parser.parseInline(tokens)
  if (!isSafeUrl(href)) {
    return text
  }

  const titleAttr = title ? ` title="${escapeAttribute(title)}"` : ''
  return `<a href="${escapeAttribute(href)}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
}

renderer.image = ({ href, title, text }: any) => {
  if (!isSafeUrl(href, { allowDataImage: true })) {
    return escapeHtml(text || '')
  }

  const titleAttr = title ? ` title="${escapeAttribute(title)}"` : ''
  const altAttr = escapeAttribute(text || '')
  return `<img src="${escapeAttribute(href)}" alt="${altAttr}"${titleAttr} />`
}

const safeMarkdown = new Marked({
  gfm: true,
  breaks: true,
  renderer
})

export const renderSafeMarkdown = (value: string) => safeMarkdown.parse(value || '') as string
