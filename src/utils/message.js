// 封装 message 方法
import { message } from 'ant-design-vue'

message.config({
  maxCount: 10,
})

const recentMessages = new Map()
const DEFAULT_DEDUPLICATE_MS = 900

export const showMessage = (content, type, duration = 3) => {
  const normalizedContent = String(content || '')
  const key = `${type}:${normalizedContent}`
  const now = Date.now()
  const lastShownAt = recentMessages.get(key) || 0

  if (now - lastShownAt < DEFAULT_DEDUPLICATE_MS) {
    return
  }

  recentMessages.set(key, now)
  window.setTimeout(() => {
    if (recentMessages.get(key) === now) {
      recentMessages.delete(key)
    }
  }, DEFAULT_DEDUPLICATE_MS)

  message[type](normalizedContent, duration)
}
