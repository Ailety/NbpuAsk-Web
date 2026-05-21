import { axios, getApiUrl, getAuthConfig, handleError, notifyResultError } from './http'
import { getConversationShares } from './share'
import {
  addLocalConv,
  getLocalConvs,
  removeConversationShare,
  setConversationShares,
  setCurConvIndex,
  setLocalConvs,
} from '@/utils/functions'
import { showMessage } from '@/utils/message'

function getConversationPayload(conversation) {
  return {
    conversationId: conversation.conversationId,
  }
}

function getConversationSavePayload(conversation) {
  return {
    conversationId: conversation.conversationId,
    conversationAvailable: conversation.conversationAvailable ?? true,
    conversationData: conversation.conversationData,
  }
}

export async function getConversations() {
  try {
    const [response] = await Promise.all([
      axios.post(getApiUrl('/conversation/get-all'), null, getAuthConfig()),
      getConversationShares(),
    ])

    if (response.data.success) {
      const conversations = response.data.data
      conversations.sort((a, b) => {
        return Number(b.conversationData.timestamp) - Number(a.conversationData.timestamp)
      })
      setLocalConvs(conversations)
      return conversations
    }

    notifyResultError(response.data, '获取对话列表失败！')
    return []
  } catch (error) {
    handleError(error, '获取对话列表失败！')
    return []
  }
}

export async function getConversation(conversation, options = {}) {
  try {
    const response = await axios.post(
      getApiUrl('/conversation/get'),
      getConversationPayload(conversation),
      getAuthConfig(),
    )
    if (response.data.success) {
      return response.data.data
    }

    notifyResultError(response.data, '获取对话数据失败！', options)
    return null
  } catch (error) {
    handleError(error, '获取对话数据失败！', options)
    return null
  }
}

export async function setConversation(conversation) {
  try {
    const response = await axios.post(
      getApiUrl('/conversation/set'),
      getConversationSavePayload(conversation),
      getAuthConfig(),
    )
    if (response.data.success) {
      return true
    }

    notifyResultError(response.data, '同步对话数据失败！')
    return false
  } catch (error) {
    handleError(error, '同步对话数据失败！')
    return false
  }
}

export async function createConversation() {
  try {
    const response = await axios.post(getApiUrl('/conversation/create'), null, getAuthConfig())
    if (response.data.success) {
      const newConversation = response.data.data
      addLocalConv(newConversation)
      setCurConvIndex(getLocalConvs().length - 1)
      return newConversation
    }

    notifyResultError(response.data, '创建对话失败！')
    return null
  } catch (error) {
    handleError(error, '创建对话失败！')
    return null
  }
}

export async function renameConversation(index, newTitle) {
  try {
    const conversation = getLocalConvs()[index]
    conversation.conversationData.title = newTitle
    conversation.conversationData.titleStatus = 'MANUAL'
    const response = await axios.post(
      getApiUrl('/conversation/set'),
      getConversationSavePayload(conversation),
      getAuthConfig(),
    )
    if (response.data.success) {
      const conversations = getLocalConvs()
      conversations[index].conversationData.title = newTitle
      conversations[index].conversationData.titleStatus = 'MANUAL'
      setLocalConvs(conversations)
      showMessage('重命名对话成功！', 'success')
    } else {
      notifyResultError(response.data, '重命名对话失败！')
    }
  } catch (error) {
    handleError(error, '重命名对话失败！')
  }
}

export async function deleteConversation(index) {
  try {
    const conversation = getLocalConvs()[index]
    const response = await axios.post(
      getApiUrl('/conversation/delete'),
      getConversationPayload(conversation),
      getAuthConfig(),
    )
    if (response.data.success) {
      const conversations = getLocalConvs()
      conversations.splice(index, 1)
      setLocalConvs(conversations)
      removeConversationShare(conversation.conversationId)
      setCurConvIndex(-1)
      showMessage('删除成功！', 'success')
    } else {
      notifyResultError(response.data, '删除对话失败！')
    }
  } catch (error) {
    handleError(error, '删除对话失败！')
  }
}

export async function deleteAllConversations() {
  try {
    const response = await axios.post(getApiUrl('/conversation/delete-all'), null, getAuthConfig())
    if (response.data.success) {
      setConversationShares([])
      setLocalConvs([])
      setCurConvIndex(-1)
      return true
    }

    notifyResultError(response.data, '删除所有对话失败！')
    return false
  } catch (error) {
    handleError(error, '删除所有对话失败！')
    return false
  }
}
