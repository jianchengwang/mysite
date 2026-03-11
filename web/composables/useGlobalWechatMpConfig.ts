import { computed, onMounted, onUnmounted } from 'vue'
import { useState } from '#imports'

const GLOBAL_WECHAT_MP_APP_ID_STORAGE = 'global_wechat_mp_app_id'
const GLOBAL_WECHAT_MP_APP_SECRET_STORAGE = 'global_wechat_mp_app_secret'

export const useGlobalWechatMpConfig = () => {
  const appId = useState<string>('global-wechat-mp-app-id', () => '')
  const appSecret = useState<string>('global-wechat-mp-app-secret', () => '')

  const syncConfig = () => {
    if (!import.meta.client) return
    appId.value = localStorage.getItem(GLOBAL_WECHAT_MP_APP_ID_STORAGE) || ''
    appSecret.value = localStorage.getItem(GLOBAL_WECHAT_MP_APP_SECRET_STORAGE) || ''
  }

  const hasConfig = computed(() => Boolean(appId.value.trim() && appSecret.value.trim()))

  const openGlobalSettings = () => {
    if (!import.meta.client) return
    window.dispatchEvent(new Event('open-global-settings'))
  }

  onMounted(() => {
    syncConfig()
    window.addEventListener('storage', syncConfig)
    window.addEventListener('global-wechat-mp-settings-updated', syncConfig as EventListener)
  })

  onUnmounted(() => {
    window.removeEventListener('storage', syncConfig)
    window.removeEventListener('global-wechat-mp-settings-updated', syncConfig as EventListener)
  })

  return {
    appId,
    appSecret,
    hasConfig,
    syncConfig,
    openGlobalSettings
  }
}
