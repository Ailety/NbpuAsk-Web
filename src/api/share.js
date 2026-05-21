import { axios, getApiUrl, getAuthConfig, handleError, notifyResultError } from './http'
import { setConversationShares } from '@/utils/functions'

export async function getConversationShares() {
  try {
    const response = await axios.post(getApiUrl('/conversation/shares'), null, getAuthConfig())

    if (response.data.success) {
      const shares = response.data.data || []
      setConversationShares(shares)
      return shares
    }

    notifyResultError(response.data, '获取分享状态失败！')
    setConversationShares([])
    return []
  } catch (error) {
    handleError(error, '获取分享状态失败！')
    setConversationShares([])
    return []
  }
}

export async function getSharedConversation(conversationId) {
  try {
    const response = await axios.get(
      getApiUrl(`/conversation/shared/${encodeURIComponent(conversationId)}`),
    )
    if (response.data.success) {
      return response.data.data
    }

    return null
  } catch (error) {
    handleError(error, '分享对话不可用。', { silent: true })
    return null
  }
}

export async function createConversationShare(conversation, shareId) {
  try {
    const response = await axios.post(
      getApiUrl('/conversation/share'),
      {
        shareId,
        conversationId: conversation.conversationId,
      },
      getAuthConfig(),
    )

    if (response.data.success) {
      return response.data.data
    }

    notifyResultError(response.data, '对话分享失败，请稍后重试。', { duration: 2 })
    return null
  } catch (error) {
    handleError(error, '对话分享失败，请稍后重试。', { duration: 2 })
    return null
  }
}

export async function cancelConversationShare(conversation) {
  try {
    const response = await axios.post(
      getApiUrl('/conversation/share/cancel'),
      {
        conversationId: conversation.conversationId,
      },
      getAuthConfig(),
    )

    if (response.data.success) {
      return true
    }

    notifyResultError(response.data, '对话取消分享失败，请稍后重试。', { duration: 2 })
    return false
  } catch (error) {
    handleError(error, '对话取消分享失败，请稍后重试。', { duration: 2 })
    return false
  }
}
