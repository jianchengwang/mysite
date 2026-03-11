import { computed, onMounted, onUnmounted } from 'vue'
import { useState } from '#imports'

const GLOBAL_WECHAT_ACCESS_TOKEN_STORAGE = 'global_wechat_access_token'
const GLOBAL_BACKEND_ACCESS_KEY_STORAGE = 'global_backend_access_key'

export const useGlobalWechatDraftAccess = () => {
  const accessToken = useState<string>('global-wechat-access-token', () => '')
  const backendKey = useState<string>('global-backend-access-key', () => '')

  const syncConfig = () => {
    if (!import.meta.client) return
    accessToken.value = localStorage.getItem(GLOBAL_WECHAT_ACCESS_TOKEN_STORAGE) || ''
    backendKey.value = localStorage.getItem(GLOBAL_BACKEND_ACCESS_KEY_STORAGE) || ''
  }

  const hasAccessToken = computed(() => Boolean(accessToken.value.trim()))

  const openGlobalSettings = () => {
    if (!import.meta.client) return
    window.dispatchEvent(new Event('open-global-settings'))
  }

  onMounted(() => {
    syncConfig()
    window.addEventListener('storage', syncConfig)
    window.addEventListener('global-wechat-draft-access-updated', syncConfig as EventListener)
  })

  onUnmounted(() => {
    window.removeEventListener('storage', syncConfig)
    window.removeEventListener('global-wechat-draft-access-updated', syncConfig as EventListener)
  })

  return {
    accessToken,
    backendKey,
    hasAccessToken,
    syncConfig,
    openGlobalSettings
  }
}
