<template>
  <div class="chat-container" :class="{ collapsed: isSidebarCollapsed }">
    <div class="sidebar-controls">
      <div
        class="expand-btn has-tooltip"
        @click="emit('toggle-sidebar')"
        @mouseenter="showTooltip($event, '展开侧边栏')"
        @mouseleave="hideTooltip"
      >
        <ExpandBtn />
      </div>
      <div
        class="new-chat-btn has-tooltip"
        @click="emit('create-new-conversation')"
        @mouseenter="showTooltip($event, '开启新对话')"
        @mouseleave="hideTooltip"
      >
        <NewChatBtn />
      </div>
    </div>

    <div class="chat-window" :class="{ 'welcome-mode': isWelcomeMode }">
      <div ref="welcomeElements" class="welcome-elements" v-if="isWelcomeMode">
        <div class="welcome-content">
          <div class="welcome-logo">
            <img src="@/assets/logo.png" alt="Logo" />
          </div>
          <h1 class="welcome-title" :data-title="welcomeTitle">{{ welcomeTitle }}</h1>
        </div>
      </div>
      <div
        v-if="welcomeSnapshotVisible"
        class="welcome-leave-snapshot"
        :style="welcomeSnapshotStyle"
        @animationend="clearWelcomeSnapshot"
      >
        <div class="welcome-content">
          <div class="welcome-logo">
            <img src="@/assets/logo.png" alt="Logo" />
          </div>
          <h1 class="welcome-title" :data-title="welcomeTitle">{{ welcomeTitle }}</h1>
        </div>
      </div>

      <div
        class="chat-area"
        :class="{ 'fade-out': isWelcomeMode, 'is-status-hidden': isConversationStatusMode }"
      >
        <ChatTitleBar
          :title="curConvTitle"
          :subtitle="chatSubtitle"
          :editable="hasActiveConversation"
          @rename="renameTitle"
        />
        <div class="chat-masking chat-header-masking"></div>

        <div
          ref="chatMessages"
          class="chat-messages"
          :class="{ 'is-preparing-conversation': shouldDisplayConversationLoading }"
          @scroll="handleScroll"
          @wheel.passive="handleUserScrollIntent"
          @pointerdown="handleUserScrollIntent"
          @touchstart.passive="handleUserScrollIntent"
        >
          <div
            v-show="showScrollButton && curConvData.messages.length !== 0"
            class="scroll-to-bottom"
            @click.stop="scrollToBottom({ force: true })"
          >
            <ScrollBottomBtn />
          </div>

          <ConversationMessage
            v-for="(message, index) in curConvData.messages"
            :key="index"
            class="chat-rendered-message"
            :message="message"
            :elapsed-now="elapsedNow"
            enable-streaming-tail
          />
        </div>
        <div class="chat-masking chat-footer-masking"></div>
      </div>

      <ChatStatusLayer
        fullscreen
        :loading="shouldDisplayConversationLoading"
        :error="shouldDisplayConversationError"
      />

      <ChatInputBox
        ref="chatInput"
        v-model="newMessage"
        :class="{ 'is-status-reserved': isConversationStatusMode }"
        :disabled="!canSendMessage"
        :tooltip-text="inputBtnTip"
        @send="sendMessage"
        @show-tooltip="showTooltip"
        @hide-tooltip="hideTooltip"
      />

      <p v-if="hasActiveConversation && !isConversationStatusMode" class="copyright-text">
        {{ copyrightText }} | 宁青千问 是一款 AI 工具，其回答未必正确无误
      </p>

      <div class="floating-tooltip" v-if="tooltip.visible" :style="tooltipStyle">
        {{ tooltip.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import ExpandBtn from '@/components/icons/ChatWindow/expandBtn.vue'
import NewChatBtn from '@/components/icons/ChatWindow/newChatBtnS.vue'
import ScrollBottomBtn from '@/components/icons/ChatWindow/scrollBottomBtn.vue'
import ConversationMessage from '@/components/messages/ConversationMessage.vue'
import ChatStatusLayer from '@/components/ChatStatusLayer.vue'
import ChatTitleBar from '@/components/ChatTitleBar.vue'
import ChatInputBox from '@/components/ChatInputBox.vue'
import {
  getLocalConvs,
  getCurConvTitle,
  getCurConv,
  getCurConvIndex,
  getServerUrl,
  setCurConv,
  getAuthToken,
  formatDate,
  getConvStatusByTimestamp,
  updateLocalConvById,
} from '@/utils/functions'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { createConversation, getConversation, renameConversation } from '@/api/conversation'
import { resolveResultErrorMessage } from '@/api/http'
import { isThinkingMessage } from '@/utils/messageRendering'
import {
  CHAT_RUN_STATE,
  CHAT_VIEW_STATE,
  isChatRunBusyState,
  isConversationErrorState,
  isConversationLoadingState,
  isWelcomeState,
} from '@/utils/chatStateMachine'
import { useFloatingTooltip } from '@/composables/useFloatingTooltip'

defineOptions({ name: 'ChatWindow' })

const props = defineProps({
  sidebarCollapsed: {
    type: Boolean,
    default: false,
  },
  viewState: {
    type: String,
    default: CHAT_VIEW_STATE.INITIALIZING,
  },
})

const emit = defineEmits(['toggle-sidebar', 'create-new-conversation', 'send-message'])

const router = useRouter()
const store = useStore()

const newMessage = ref('')
const showScrollButton = ref(false)
const chatRunState = ref(CHAT_RUN_STATE.IDLE)
const modelAnswerIndex = ref(-1)
const chatInput = ref(null)
const chatMessages = ref(null)
const welcomeElements = ref(null)
const elapsedNow = ref(Date.now())
const showConversationLoading = ref(false)
const welcomeSnapshotVisible = ref(false)
const welcomeSnapshotStyle = ref({})
const { tooltip, tooltipStyle, showTooltip, hideTooltip } = useFloatingTooltip()
let thinkingTimer = null
let autoScrollFrame = null
let lastAutoScrollAt = 0
let conversationLoadingHideTimer = null
let conversationLoadingVisibleAt = 0
let conversationLoadingCycle = 0
let isConversationLoadingPainted = false
let isConversationLoadingHidePending = false

const AUTO_SCROLL_THRESHOLD = 220
const SCROLL_BUTTON_THRESHOLD = 70
const TITLE_GENERATING_STATUS = 'GENERATING'
const AUTO_TITLE_REFRESH_DELAYS = [350, 700, 1000, 1800, 2600]
const CONVERSATION_LOADING_MIN_MS = computed(() => store.state.CONVERSATION_LOADING_MIN_MS)
const welcomeTitles = [
  '有什么我可以帮你的？',
  '今天想问点什么？',
  '把问题交给宁青千问。',
  '需要查资料、写内容，还是理思路？',
  '我在这里，随时开始提问。',
]
const welcomeTitle = ref(welcomeTitles[Math.floor(Math.random() * welcomeTitles.length)])

const isSidebarCollapsed = computed(() => props.sidebarCollapsed || store.state.sidebarCollapsed)
const copyrightText = computed(() => store.state.copyrightText)
const wantsConversationLoading = computed(() => isConversationLoadingState(props.viewState))
const wantsConversationError = computed(() => isConversationErrorState(props.viewState))
const shouldDisplayConversationLoading = computed(
  () => wantsConversationLoading.value || showConversationLoading.value,
)
const shouldDisplayConversationError = computed(
  () => wantsConversationError.value && !shouldDisplayConversationLoading.value,
)
const isConversationStatusMode = computed(
  () => shouldDisplayConversationLoading.value || wantsConversationError.value,
)
const isWelcomeMode = computed(
  () =>
    isWelcomeState(props.viewState) &&
    !hasActiveConversation.value &&
    !isConversationStatusMode.value,
)
const isModelThinking = computed(() => isChatRunBusyState(chatRunState.value))

watch(
  isWelcomeMode,
  (nextWelcomeMode, previousWelcomeMode) => {
    if (previousWelcomeMode && !nextWelcomeMode) {
      showWelcomeLeaveSnapshot()
    }

    if (nextWelcomeMode) {
      clearWelcomeSnapshot()
    }
  },
  { flush: 'sync' },
)

const hasActiveConversation = computed(() => getLocalConvs().length > 0 && getCurConvIndex() !== -1)
const curConvTitle = computed(() => (hasActiveConversation.value ? getCurConvTitle() : ''))
const curConvData = computed(() =>
  hasActiveConversation.value ? getCurConv().conversationData : { messages: [] },
)
const chatSubtitle = computed(() => {
  if (!hasActiveConversation.value) return ''

  const data = curConvData.value
  const createdDate = formatDate(data.createdTime || data.timestamp)
  const lastStatus = getConvStatusByTimestamp(data.timestamp)
  const createdText = createdDate ? `对话创建于 ${createdDate}` : ''
  const lastText = lastStatus ? `上次对话于 ${lastStatus}` : ''

  return [createdText, lastText].filter(Boolean).join(' · ')
})
function showWelcomeLeaveSnapshot() {
  const rect = welcomeElements.value?.getBoundingClientRect()
  if (!rect) return

  welcomeSnapshotStyle.value = {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
  welcomeSnapshotVisible.value = true
}

function clearWelcomeSnapshot() {
  welcomeSnapshotVisible.value = false
  welcomeSnapshotStyle.value = {}
}

const pendingModelMessage = computed(() => {
  const messages = curConvData.value.messages || []
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.sender === 'model') return isThinkingMessage(message) ? message : null
    if (message.sender === 'user') return null
  }
  return null
})
const hasPendingModelResponse = computed(() => Boolean(pendingModelMessage.value))
const canSendMessage = computed(
  () => newMessage.value.trim() !== '' && !isModelThinking.value && !hasPendingModelResponse.value,
)
const inputBtnTip = computed(() =>
  hasPendingModelResponse.value || isModelThinking.value ? '宁青千问正在思考中...' : '发送消息',
)

onMounted(() => {
  nextTick(() => {
    adjustTextareaHeight()
  })

  thinkingTimer = window.setInterval(() => {
    elapsedNow.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  conversationLoadingCycle += 1
  if (thinkingTimer) {
    window.clearInterval(thinkingTimer)
    thinkingTimer = null
  }
  if (conversationLoadingHideTimer) {
    window.clearTimeout(conversationLoadingHideTimer)
    conversationLoadingHideTimer = null
  }
  cancelAutoScroll()
})

watch(
  wantsConversationLoading,
  (shouldShowLoading) => {
    if (shouldShowLoading) {
      showConversationLoadingCard()
    } else {
      hideConversationLoadingCard()
    }
  },
  { immediate: true },
)

watch(
  wantsConversationError,
  (shouldShowError) => {
    if (shouldShowError) {
      hideConversationLoadingCard()
    }
  },
  { flush: 'sync' },
)

watch(
  hasActiveConversation,
  () => {
    nextTick(() => {
      adjustTextareaHeight()
      updateScrollButton()
    })
  },
  { immediate: true },
)

watch(
  () => [curConvData.value.messages?.length || 0, getCurConvIndex()],
  () => {
    nextTick(() => {
      updateScrollButton()
    })
  },
)

function handleScroll(event) {
  const container = event.target
  updateScrollButton(container)

  if (
    autoScrollFrame &&
    performance.now() - lastAutoScrollAt > 120 &&
    getBottomDistance(container) > AUTO_SCROLL_THRESHOLD
  ) {
    cancelAutoScroll()
  }
}

async function renameTitle(nextTitle) {
  await renameConversation(getCurConvIndex(), nextTitle)
}

function updateScrollButton(container = chatMessages.value) {
  if (!container || !hasActiveConversation.value) {
    showScrollButton.value = false
    return
  }

  showScrollButton.value = getBottomDistance(container) > SCROLL_BUTTON_THRESHOLD
}

function getBottomDistance(container = chatMessages.value) {
  if (!container) return 0
  return Math.max(0, container.scrollHeight - container.scrollTop - container.clientHeight)
}

function isNearBottom(container = chatMessages.value, threshold = AUTO_SCROLL_THRESHOLD) {
  return getBottomDistance(container) <= threshold
}

function cancelAutoScroll() {
  if (autoScrollFrame) {
    cancelAnimationFrame(autoScrollFrame)
    autoScrollFrame = null
  }
}

function handleUserScrollIntent() {
  cancelAutoScroll()
}

function waitForAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(resolve)
  })
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function showConversationLoadingCard() {
  conversationLoadingCycle += 1
  const cycle = conversationLoadingCycle

  if (conversationLoadingHideTimer) {
    window.clearTimeout(conversationLoadingHideTimer)
    conversationLoadingHideTimer = null
  }

  isConversationLoadingPainted = false
  isConversationLoadingHidePending = false
  showConversationLoading.value = true
  await nextTick()
  await waitForAnimationFrame()
  await waitForAnimationFrame()

  if (cycle !== conversationLoadingCycle || !showConversationLoading.value) {
    return
  }

  conversationLoadingVisibleAt = performance.now()
  isConversationLoadingPainted = true

  if (!wantsConversationLoading.value || isConversationLoadingHidePending) {
    isConversationLoadingHidePending = true
    scheduleConversationLoadingHide()
  }
}

function hideConversationLoadingCard() {
  if (!showConversationLoading.value) return

  isConversationLoadingHidePending = true
  if (!isConversationLoadingPainted) return

  scheduleConversationLoadingHide()
}

function scheduleConversationLoadingHide() {
  if (conversationLoadingHideTimer) {
    window.clearTimeout(conversationLoadingHideTimer)
  }

  const visibleAt = conversationLoadingVisibleAt || performance.now()
  const elapsed = performance.now() - visibleAt
  const remaining = Math.max(0, CONVERSATION_LOADING_MIN_MS.value - elapsed)

  conversationLoadingHideTimer = window.setTimeout(() => {
    if (!wantsConversationLoading.value && isConversationLoadingHidePending) {
      showConversationLoading.value = false
      isConversationLoadingPainted = false
      isConversationLoadingHidePending = false
      conversationLoadingVisibleAt = 0
    }
    conversationLoadingHideTimer = null
  }, remaining)
}

async function scrollToBottom({ force = true, immediate = false } = {}) {
  const container = chatMessages.value
  if (!container) return
  if (!force && !isNearBottom(container)) {
    updateScrollButton(container)
    return
  }

  await nextTick()

  if (force) {
    cancelAutoScroll()
  }

  if (immediate) {
    await new Promise((resolve) => {
      const jumpToBottom = () => {
        const targetScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
        container.scrollTop = targetScrollTop
        updateScrollButton(container)
      }

      jumpToBottom()
      requestAnimationFrame(() => {
        jumpToBottom()
        requestAnimationFrame(() => {
          jumpToBottom()
          resolve()
        })
      })
    })
    return
  }

  if (autoScrollFrame) return

  await new Promise((resolve) => {
    const getTargetScrollTop = () => Math.max(0, container.scrollHeight - container.clientHeight)
    const startScrollTop = container.scrollTop
    const startTime = performance.now()
    const initialDistance = Math.abs(getTargetScrollTop() - startScrollTop)
    const duration = Math.min(680, Math.max(260, initialDistance * 0.18))
    const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3)

    const animationStep = (now) => {
      const targetScrollTop = getTargetScrollTop()
      const progress = Math.min((now - startTime) / duration, 1)
      const easedProgress = easeOutCubic(progress)
      container.scrollTop = startScrollTop + (targetScrollTop - startScrollTop) * easedProgress
      lastAutoScrollAt = now
      updateScrollButton(container)

      if (progress >= 1 || Math.abs(targetScrollTop - container.scrollTop) <= 0.6) {
        container.scrollTop = targetScrollTop
        autoScrollFrame = null
        updateScrollButton(container)
        resolve()
        return
      }

      autoScrollFrame = requestAnimationFrame(animationStep)
    }

    if (initialDistance <= 0.6) {
      container.scrollTop = getTargetScrollTop()
      autoScrollFrame = null
      updateScrollButton(container)
      resolve()
      return
    }

    autoScrollFrame = requestAnimationFrame(animationStep)
  })
}

function adjustTextareaHeight() {
  chatInput.value?.adjustHeight?.()
}

function setCurrentModelMessageError(message) {
  const conv = getCurConv()
  const modelMessage = conv?.conversationData?.messages?.[modelAnswerIndex.value]
  if (!modelMessage) return

  modelMessage.message = message
  modelMessage.isStreaming = false
  modelMessage.thinking = false
  setCurConv(conv)
}

async function refreshConversationAfterRun() {
  const conversationId = getCurConv()?.conversationId
  if (!conversationId) return

  for (const delay of AUTO_TITLE_REFRESH_DELAYS) {
    if (delay > 0) {
      await wait(delay)
    }

    if (getCurConv()?.conversationId !== conversationId) {
      return
    }

    const latestConversation = await getConversation({ conversationId }, { silent: true })
    if (!latestConversation || getCurConv()?.conversationId !== conversationId) {
      return
    }

    updateLocalConvById(latestConversation)

    if (latestConversation.conversationData?.titleStatus !== TITLE_GENERATING_STATUS) {
      return
    }
  }
}

async function sendMessage() {
  if (!canSendMessage.value) return

  const query = newMessage.value
  newMessage.value = ''
  nextTick(() => {
    adjustTextareaHeight()
  })

  if (!hasActiveConversation.value) {
    chatRunState.value = CHAT_RUN_STATE.CREATING_CONVERSATION
    const newConv = await createConversation()
    if (!newConv) {
      chatRunState.value = CHAT_RUN_STATE.IDLE
      return
    }
    router.push(`/chat/${newConv.conversationId}`)
    await new Promise((resolve) => setTimeout(resolve, 50))
    await nextTick()
  }

  emit('send-message', query)
  nextTick(() => {
    scrollToBottom({ force: true })
  })

  const modelAnswer = {
    sender: 'model',
    message: '',
    isStreaming: true,
    streamPulse: 'a',
    thinking: true,
    thinkingStartTime: Date.now(),
  }
  const conversation = getCurConv()
  conversation.conversationData.messages.push(modelAnswer)
  modelAnswerIndex.value = conversation.conversationData.messages.length - 1
  setCurConv(conversation)

  chatRunState.value = CHAT_RUN_STATE.STREAMING
  const abortController = new AbortController()

  try {
    const authToken = getAuthToken()

    await fetchEventSource(`${getServerUrl()}/conversation/runs`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.token}`,
      },
      body: JSON.stringify({
        query,
        conversation_id: getCurConv().conversationId,
      }),
      signal: abortController.signal,
      openWhenHidden: true,
      onopen: (response) => {
        if (response.ok) return

        if (response.status >= 400) {
          const errorMsg = `服务器响应异常（状态码: ${response.status}），请稍后重试。`
          const conv = getCurConv()
          conv.conversationData.messages[modelAnswerIndex.value].message = errorMsg
          setCurConv(conv)
          abortController.abort()
          throw new Error(errorMsg)
        }
      },
      onmessage: (event) => {
        try {
          if (!event.data) return
          const parsed = JSON.parse(event.data)
          if (parsed.error) {
            const errorMsg = resolveResultErrorMessage(parsed, '连接中断或服务异常。')
            setCurrentModelMessageError(errorMsg)
            abortController.abort()
            return
          }

          const answerChunk = parsed.text

          if (answerChunk) {
            const shouldFollowOutput = isNearBottom()
            const conv = getCurConv()
            const modelMessage = conv.conversationData.messages[modelAnswerIndex.value]
            modelMessage.message += answerChunk
            modelMessage.streamPulse = modelMessage.streamPulse === 'a' ? 'b' : 'a'
            setCurConv(conv)
            scrollToBottom({ force: shouldFollowOutput })
          }
        } catch (err) {
          console.error('SSE 数据解析错误: ', err)
        }
      },
      onclose: () => {},
      onerror: (err) => {
        console.error('SSE 连接错误或中断: ', err)
        const conv = getCurConv()
        if (!conv.conversationData.messages[modelAnswerIndex.value].message) {
          conv.conversationData.messages[modelAnswerIndex.value].message =
            err?.message || '连接中断或服务异常。'
          setCurConv(conv)
        }
        abortController.abort()
        throw err
      },
    })
  } catch (err) {
    chatRunState.value = CHAT_RUN_STATE.IDLE
    console.error('请求失败:', err)
  } finally {
    chatRunState.value = CHAT_RUN_STATE.IDLE
    if (
      modelAnswerIndex.value !== -1 &&
      getCurConv()?.conversationData?.messages[modelAnswerIndex.value]
    ) {
      const conv = getCurConv()
      const message = conv.conversationData.messages[modelAnswerIndex.value]
      message.isStreaming = false
      message.thinking = false
      const finishedTime = Date.now()
      message.thinkingFinishedTime = finishedTime
      if (message.thinkingStartTime) {
        message.thinkingDurationSeconds = Math.max(
          0,
          Math.ceil((finishedTime - Number(message.thinkingStartTime)) / 1000),
        )
      }
      setCurConv(conv)
      nextTick(() => {
        scrollToBottom({ force: true })
      })
      await refreshConversationAfterRun()
      nextTick(() => {
        scrollToBottom({ force: true })
      })
    }
  }
}

defineExpose({
  scrollToBottom,
})
</script>

<style scoped>
.sidebar-controls {
  position: fixed;
  left: 10px;
  top: 50%;
  transform: translateY(-100%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px;
  border: 1px solid rgba(226, 232, 240, 0.82);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(12px);
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity var(--duration-base) ease 0s,
    visibility 0s linear var(--duration-base);
}

/* SideBar收起后才显示controls，延迟显示避免与SideBar重叠 */
.chat-container.collapsed .sidebar-controls {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition:
    opacity 0.25s ease 0.15s,
    visibility 0s linear 0s;
}

.expand-btn,
.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  border: none;
  cursor: pointer;
  transition:
    color var(--duration-base) ease,
    background var(--duration-base) ease,
    box-shadow var(--duration-base) ease,
    transform var(--duration-base) ease;
}

.expand-btn:hover,
.new-chat-btn:hover {
  color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.expand-btn:active,
.new-chat-btn:active {
  transform: translateY(0);
}

.chat-container {
  display: flex;
  position: absolute;
  left: 260px;
  right: 0;
  height: 100vh;
  background: var(--color-page-bg);
  transition: left var(--duration-panel) cubic-bezier(0.38, 0, 0.24, 1);
}

.chat-container.collapsed {
  left: 0;
  transition: left var(--duration-panel) cubic-bezier(0.38, 0, 0.24, 1);
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  background: transparent;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-xs);
}

/* 欢迎元素 */
.chat-window.welcome-mode {
  align-items: center;
  justify-content: center;
  gap: clamp(16px, 3vh, 28px);
  padding: clamp(24px, 4vh, 48px) 24px;
  box-sizing: border-box;
}

.welcome-elements {
  position: absolute;
  top: clamp(132px, 34vh, 340px);
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(720px, calc(100vw - 48px));
  padding: 0 24px;
  box-sizing: border-box;
  z-index: 5;
}

.chat-window.welcome-mode .welcome-elements {
  position: relative;
  top: auto;
  left: auto;
  transform: none;
  flex: 0 0 auto;
  width: min(720px, 100%);
  padding: 0;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
}

@keyframes fadeInWelcome {
  from {
    opacity: 0;
    transform: translate(-50%, -40%); /* 初始状态稍微偏下一点 */
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%); /* 最终状态完美回到中心 */
  }
}

@keyframes fadeInWelcomeStack {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-leave-snapshot {
  position: fixed;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  pointer-events: none;
  animation: welcome-snapshot-leave 0.24s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.chat-masking {
  position: absolute;
  left: 0;
  right: 14px;
  pointer-events: none;
  z-index: 6;
}

.chat-header-masking {
  top: 88px;
  height: 58px;
  background: linear-gradient(
    to bottom,
    rgba(252, 252, 252, 0.98) 0%,
    rgba(252, 252, 252, 0.9) 28%,
    rgba(252, 252, 252, 0.58) 68%,
    rgba(252, 252, 252, 0) 100%
  );
}

.chat-footer-masking {
  bottom: 0;
  height: 18px;
  background: linear-gradient(
    to top,
    rgba(252, 252, 252, 0.92) 0%,
    rgba(252, 252, 252, 0.48) 54%,
    rgba(252, 252, 252, 0) 100%
  );
}

.scroll-to-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  position: sticky;
  top: 15px;
  left: 50.44%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  background: var(--color-surface);
  color: black;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 10;
  margin-bottom: 10px;
}

.scroll-to-bottom:hover {
  background: var(--color-surface-hover);
}

.scroll-to-bottom svg {
  width: 20px;
  height: 20px;
}

.chat-messages {
  flex: 1;
  height: 77vh;
  padding: 34px 20px 18px;
  overflow-y: auto;
  background: transparent;
  overscroll-behavior: contain;
  scroll-padding: 34px 0 18px;
  scrollbar-gutter: stable; /* 始终预留滚动条空间，防止内容偏移 */
  scrollbar-width: thin; /* Firefox滚动条宽度 */
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent; /* Firefox滚动条颜色 */
}

/* Webkit浏览器自定义滚动条（Chrome, Edge, Safari） */
.chat-messages.is-preparing-conversation {
  visibility: hidden;
}

.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
  margin: 10px 0;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  transition: background 0.2s;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.chat-rendered-message {
  --message-width: 100%;
  --message-max-width: 50%;
  --message-margin: 0 auto 30px;
  --message-last-margin-bottom: 0;
  --message-last-thinking-margin-bottom: 24px;
  --user-message-content-max-width: 100%;
  --user-message-content-margin: 20px 10px 10px 0;
  --user-message-background: #f3f3f3;
  --model-message-content-padding: 8px 0 0;
  --message-link-color: #6e8efb;
}

/* =========================================
   欢迎界面的专属过渡 (避开全局 fade 污染)
   ========================================= */
.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.welcome-fade-leave-active {
  pointer-events: none;
  animation: none !important;
  transition:
    opacity 0.22s ease,
    transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1),
    filter 0.22s ease;
}

.welcome-elements.is-leaving,
.welcome-fade-leave-active .welcome-content {
  animation: none !important;
}

/* 进入前和离开后的状态：透明，且稍微偏下 */
.welcome-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

/* 进入后和离开前的状态：不透明，且完美居中 */
.welcome-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* 对话区 */
.welcome-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.welcome-fade-leave-to {
  opacity: 0;
  filter: blur(3px);
  transform: translateY(8px);
}

@keyframes welcome-snapshot-leave {
  from {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
  to {
    opacity: 0;
    filter: blur(3px);
    transform: translateY(8px);
  }
}

.chat-area {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  width: 100%;
  opacity: 1;
  min-height: 0;
  transition:
    flex-grow 0.5s cubic-bezier(0.2, 0.8, 0.2, 1),
    flex-basis 0.5s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.28s ease-in-out;
}
.chat-area.fade-out {
  opacity: 0;
  pointer-events: none;
}

.chat-area.is-status-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.chat-window.welcome-mode .chat-area {
  flex: 0 1 0;
  width: 100%;
  height: 0;
  min-height: 0;
  overflow: hidden;
}

.chat-window.welcome-mode :deep(.chat-input) {
  width: clamp(320px, 50vw, 650px) !important;
  max-width: min(650px, 100%) !important;
  flex: 0 0 auto;
  margin: 0 auto;
  transform: none;
}

.chat-window.welcome-mode :deep(.input-frame textarea) {
  min-height: clamp(72px, 12vh, 110px);
  padding-top: clamp(10px, 1.6vh, 15px);
}

.chat-window.welcome-mode :deep(.send-button-wrap) {
  right: 36px;
  bottom: 31px;
}

.chat-window.welcome-mode :deep(.chat-input button) {
  position: relative;
}

:deep(.chat-input.is-status-reserved) {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.copyright-text {
  position: absolute;
  bottom: 12px;
  left: 0;
  width: 100%;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 12px;
  margin: 0;
  pointer-events: none; /* 防止遮挡下方可能存在的点击事件 */
}

.welcome-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(52px, 7vw, 72px);
  height: clamp(52px, 7vw, 72px);
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: clamp(14px, 2.4vh, 24px);
}

.welcome-logo img {
  width: clamp(34px, 4.6vw, 48px);
  height: clamp(34px, 4.6vw, 48px);
  border-radius: 50%;
}

.welcome-title {
  position: relative;
  --welcome-shine-width: clamp(96px, 18vw, 176px);
  max-width: 100%;
  font-size: clamp(20px, 2.2vw, 28px);
  font-weight: 500;
  line-height: 1.35;
  text-align: center;
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--color-text-primary);
}

.welcome-title::after {
  content: attr(data-title);
  position: absolute;
  inset: 0;
  pointer-events: none;
  color: transparent;
  background: linear-gradient(
    105deg,
    rgba(37, 99, 235, 0) 0%,
    rgba(147, 197, 253, 0.46) 35%,
    rgba(255, 255, 255, 0.94) 49%,
    rgba(37, 99, 235, 0.88) 58%,
    rgba(37, 99, 235, 0) 100%
  );
  background-repeat: no-repeat;
  background-size: var(--welcome-shine-width) 100%;
  background-position: calc(-1 * var(--welcome-shine-width)) 0;
  background-clip: text;
  -webkit-background-clip: text;
  animation: welcome-title-shine 8s linear infinite;
}

@keyframes welcome-title-shine {
  0%,
  68% {
    background-position: calc(-1 * var(--welcome-shine-width)) 0;
  }
  88%,
  100% {
    background-position: calc(100% + var(--welcome-shine-width)) 0;
  }
}
</style>
