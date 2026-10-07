const segment = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const versionMarker = /(?:^|[^a-z\d])v6(?:$|[^a-z\d])/i
const retired = new Set(['wenroudao', 'changanluan', 'mingyuelei'])
export const cleanPath = (path) => path.replace(/\/+$/, '') || '/'
export const seriesPath = (series) => `/${series.section}/${series.id}`
export const entryPath = (series, entry) => `${seriesPath(series)}/${entry.slug}`

export function validateCatalog(catalog) {
  if (!Array.isArray(catalog.collections)) throw new Error('collections must be an array')
  const paths = new Set()
  for (const series of catalog.collections) {
    if (!['column', 'store'].includes(series.section) || !segment.test(series.id)) throw new Error('Invalid collection route')
    if (series.section === 'store' && retired.has(series.id)) throw new Error('Retired Store route is reserved')
    for (const text of [series.title, series.summary, series.id, series.cover || '']) {
      if (typeof text !== 'string' || versionMarker.test(text)) throw new Error('Invalid public collection text')
    }
    const root = seriesPath(series)
    if (paths.has(root)) throw new Error('Duplicate collection')
    paths.add(root)
    if (!Array.isArray(series.groups)) throw new Error('Collection groups required')
    const groups = new Set()
    for (const group of series.groups) {
      if (!segment.test(group.id) || groups.has(group.id) || typeof group.title !== 'string' || versionMarker.test(group.title)) throw new Error('Invalid group')
      groups.add(group.id)
      for (const entry of group.entries) {
        if (!entry.slug.split('/').every(part => segment.test(part)) || !entry.title || versionMarker.test(entry.title + ' ' + entry.slug + ' ' + (entry.description || '') + ' ' + (entry.cover || ''))) throw new Error('Invalid entry')
        const path = entryPath(series, entry)
        if (paths.has(path)) throw new Error('Duplicate entry')
        paths.add(path)
      }
    }
  }
  return catalog
}

export function collectionView(series, preview = false) {
  const path = seriesPath(series)
  let number = 0
  const groups = series.groups.map(group => ({
    ...group,
    entries: group.entries.map(entry => ({
      ...entry, path: entryPath(series, entry), number: entry.order || ++number,
      groupTitle: group.title, available: preview || (series.published === true && entry.published === true)
    }))
  }))
  const entries = groups.flatMap(group => group.entries)
  return { ...series, path, groups, entries, availableEntries: entries.filter(entry => entry.available), count: entries.length, preview }
}

export function visibleCollections(catalog, section, preview = false) {
  return catalog.collections.filter(series => series.section === section && (preview || series.published === true))
    .map(series => collectionView(series, preview))
}

export function resolveSeries(catalog, routePath, preview = false) {
  const path = cleanPath(routePath)
  const source = catalog.collections.find(series => {
    const root = seriesPath(series)
    return (preview || series.published === true) && (path === root || path.startsWith(root + '/'))
  })
  if (!source) return null
  const series = collectionView(source, preview)
  if (path === series.path) return { series, entry: null, directory: true }
  const entry = series.availableEntries.find(entry => entry.path === path)
  return entry ? { series, entry, directory: false } : null
}

export function adjacentEntries(series, currentPath) {
  const index = series.availableEntries.findIndex(entry => entry.path === cleanPath(currentPath))
  return {
    previous: index > 0 ? series.availableEntries[index - 1] : null,
    next: index >= 0 ? series.availableEntries[index + 1] || null : null
  }
}

export function navigationForSeries(series) {
  return series.groups.map(group => ({
    title: group.title,
    children: group.entries.filter(entry => entry.available).map(entry => ({ title: entry.title, path: entry.path }))
  })).filter(group => group.children.length)
}
