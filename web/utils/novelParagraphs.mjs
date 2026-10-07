// The approved novel uses one narrative/dialogue paragraph per source line.
// Split only plain top-level prose; leave Markdown structures and source data intact.
export function novelReadingDocument(doc) {
  if (!doc?.body?.value) return doc
  const value = doc.body.value.flatMap(node => {
    if (!Array.isArray(node) || node[0] !== 'p' || !node.slice(2).every(child => typeof child === 'string')) return [node]
    return node.slice(2).join('').split(/\r?\n/).filter(line => line.trim().length).map(line => {
      const divider = /^[\s*＊·•—–\-_=…]+$/u.test(line)
      return ['p', { ...node[1], class: [node[1]?.class, divider ? 'novel-divider' : 'novel-paragraph'].filter(Boolean).join(' ') }, line]
    })
  })
  return { ...doc, body: { ...doc.body, value } }
}
