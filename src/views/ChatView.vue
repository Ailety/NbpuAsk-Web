<template>
  <div class="home-container">
    <SideBar
      @toggle-collapse="toggleSidebar"
      @create-new-conversation="createNewConversation"
      @select-conversation="selectConversation"
      @delete-conversation="deleteConversation"
    />

    <ChatWindow
      ref="chatWindow"
      :sidebar-collapsed="sidebarCollapsed"
      :view-state="chatViewState"
      @toggle-sidebar="toggleSidebar"
      @create-new-conversation="createNewConversation"
      @send-message="sendMessage"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeMount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import SideBar from '@/components/SideBar.vue'
import ChatWindow from '@/components/ChatWindow.vue'
import {
  findLocalConvIndexById,
  getLocalConvs,
  getCurConvIndex,
  setCurConvIndex,
  setConversationShares,
  setLocalConvs,
  toggleSidebar,
  updateLocalConvById,
} from '@/utils/functions'
import { showMessage } from '@/utils/message'
import {
  getConversations,
  getConversation,
  deleteConversation as deleteConversationRequest,
} from '@/api/conversation'
import { CHAT_VIEW_STATE } from '@/utils/chatStateMachine'

defineOptions({ name: 'ChatPage' })

const route = useRoute()
const router = useRouter()
const store = useStore()
const chatWindow = ref(null)
const chatViewState = ref(
  route.params.id ? CHAT_VIEW_STATE.LOADING_CONVERSATION : CHAT_VIEW_STATE.INITIALIZING,
)
const sidebarCollapsed = computed(() => store.state.sidebarCollapsed)
let conversationLoadingToken = 0
let conversationLoadingStartedAt = 0

onBeforeMount(async () => {
  setLocalConvs([])
  setConversationShares([])
  setCurConvIndex(-1)
  const initialLoadingToken = route.params.id ? beginConversationLoading() : null

  await initDataAndRoute(initialLoadingToken)
})

onMounted(() => {
  if (route.meta.isAutoLogin) {
    router.replace({
      path: route.path,
      query: route.query,
    })
    setTimeout(() => {
      showMessage('欢迎回来，已为你自动登录！', 'success', 2)
    }, 400)
  }
})

watch(
  () => route.params.id,
  (newId) => {
    handleRouteId(newId)
  },
)

async function initDataAndRoute(loadingToken = null) {
  const convs = await getConversations()
  await handleRouteId(route.params.id, convs, loadingToken)
}

async function handleRouteId(convId, convsList = null, existingLoadingToken = null) {
  const convs = convsList || getLocalConvs()
  if (!convId) {
    setCurConvIndex(-1)
    cancelConversationLoading()
    return
  }

  const index = convs.findIndex((conv) => conv.conversationId === convId)
  if (index === -1) {
    const loadingToken = existingLoadingToken || beginConversationLoading()
    setCurConvIndex(-1)
    await showConversationLoadError(loadingToken)
    return
  }

  if (getCurConvIndex() !== index) {
    const loadingToken = existingLoadingToken || beginConversationLoading()
    const requestedConversationId = convs[index].conversationId
    let shouldJumpToEnd = false
    try {
      await nextTick()
      setCurConvIndex(index)
      const conversation = await getConversation(convs[index], { silent: true })

      if (
        loadingToken !== conversationLoadingToken ||
        route.params.id !== requestedConversationId ||
        conversation?.conversationId !== requestedConversationId
      ) {
        return
      }

      if (!conversation || !updateLocalConvById(conversation)) {
        await showConversationLoadError(loadingToken)
        return
      }

      const updatedIndex = findLocalConvIndexById(requestedConversationId)
      if (updatedIndex === -1) {
        await showConversationLoadError(loadingToken)
        return
      }

      setCurConvIndex(updatedIndex)
      shouldJumpToEnd = true
    } finally {
      finishConversationLoading(loadingToken)
      if (shouldJumpToEnd) {
        await jumpToConversationEnd(requestedConversationId)
      }
    }
  } else if (existingLoadingToken) {
    finishConversationLoading(existingLoadingToken)
  } else {
    chatViewState.value = CHAT_VIEW_STATE.READY
  }
}

function beginConversationLoading() {
  const token = ++conversationLoadingToken
  conversationLoadingStartedAt = performance.now()
  chatViewState.value = CHAT_VIEW_STATE.LOADING_CONVERSATION
  return token
}

function cancelConversationLoading() {
  conversationLoadingToken += 1
  chatViewState.value = resolveStableViewState()
}

async function showConversationLoadError(loadingToken = null) {
  if (loadingToken && loadingToken !== conversationLoadingToken) return

  const elapsed = performance.now() - conversationLoadingStartedAt
  const remaining = Math.max(0, getConversationLoadingMinimumMs() - elapsed)
  if (remaining > 0) {
    await wait(remaining)
  }

  if (loadingToken && loadingToken !== conversationLoadingToken) return

  conversationLoadingToken += 1
  chatViewState.value = CHAT_VIEW_STATE.CONVERSATION_ERROR
}

function getConversationLoadingMinimumMs() {
  const minimumMs = Number(store.state.CONVERSATION_LOADING_MIN_MS)
  return Number.isFinite(minimumMs) && minimumMs > 0 ? minimumMs : 700
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function finishConversationLoading(loadingToken) {
  if (loadingToken === conversationLoadingToken) {
    chatViewState.value = resolveStableViewState()
  }
}

function resolveStableViewState() {
  return getCurConvIndex() === -1 ? CHAT_VIEW_STATE.WELCOME : CHAT_VIEW_STATE.READY
}

function waitForFrames(count = 1) {
  return new Promise((resolve) => {
    const step = () => {
      count -= 1
      if (count <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  })
}

function scheduleConversationEndCalibration(conversationId, delay) {
  window.setTimeout(() => {
    if (route.params.id === conversationId) {
      chatWindow.value?.scrollToBottom?.({ force: true, immediate: true })
    }
  }, delay)
}

async function jumpToConversationEnd(conversationId = route.params.id) {
  await nextTick()
  await waitForFrames(2)
  if (route.params.id !== conversationId) return

  await chatWindow.value?.scrollToBottom?.({ force: true, immediate: true })
  scheduleConversationEndCalibration(conversationId, 120)
  scheduleConversationEndCalibration(conversationId, 420)
}

function createNewConversation() {
  const conversations = getLocalConvs()
  const curConvIndex = getCurConvIndex()

  if (curConvIndex !== -1 && conversations[curConvIndex].conversationData.messages.length === 0) {
    showMessage('当前已经是新对话了！', 'success')
    return
  }

  router.push('/chat')
}

function selectConversation(index) {
  if (index < 0 || index >= getLocalConvs().length) {
    showMessage('参数错误: 请选择一个有效的对话！', 'warning')
    return
  }

  const conv = getLocalConvs()[index]
  if (getCurConvIndex() === index) {
    showMessage('当前对话已经被选中了！', 'info')
    return
  }

  router.push(`/chat/${conv.conversationId}`)
}

async function deleteConversation(index) {
  const conv = getLocalConvs()[index]
  await deleteConversationRequest(index)

  if (route.params.id === conv.conversationId) {
    router.push('/chat')
  }
}

function sendMessage(newMessage) {
  const conversations = getLocalConvs()
  const curConvIndex = getCurConvIndex()
  conversations[curConvIndex].conversationData.timestamp = Date.now()
  conversations[curConvIndex].conversationData.messages.push({
    sender: 'user',
    message: newMessage,
  })
  setLocalConvs(conversations)
}
</script>

<style scoped>
.home-container {
  display: flex;
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #fcfcfc;
}
</style>
