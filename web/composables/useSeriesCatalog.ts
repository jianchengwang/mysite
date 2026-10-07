import data from '~/content/dataset/collections.json'
import { resolveSeries, visibleCollections } from '~/utils/seriesCatalog.mjs'
const catalog = data
export function useSeriesCatalog() {
  const route = useRoute()
  const preview = computed(() => false)
  const current = computed(() => resolveSeries(catalog, route.path, preview.value))
  const forSection = (section: string) => visibleCollections(catalog, section, preview.value)
  return { catalog, preview, current, forSection }
}

