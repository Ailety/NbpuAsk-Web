<template>
  <div class="chat-input">
    <div class="input-frame">
      <textarea
        ref="messageInput"
        id="newMessageInput"
        :value="modelValue"
        @input="handleInput"
        @keydown.enter="handleKeyDown"
        placeholder="给 宁青千问 发送消息"
        rows="3"
      ></textarea>
    </div>
    <div
      class="send-button-wrap"
      @mouseenter="emit('show-tooltip', $event, tooltipText)"
      @mouseleave="emit('hide-tooltip')"
    >
      <button @click="emit('send')" :disabled="disabled">
        <div class="send-icon">
          <SendMsgBtn />
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import SendMsgBtn from '@/components/icons/ChatWindow/sendMsgBtn.vue'

defineOptions({ name: 'ChatInputBox' })

defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  tooltipText: {
    type: String,
    default: '发送消息',
  },
})

const emit = defineEmits(['update:modelValue', 'send', 'show-tooltip', 'hide-tooltip'])
const messageInput = ref(null)

function handleInput(event) {
  emit('update:modelValue', event.target.value)
  adjustHeight()
}

function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    emit('send')
  }
}

function adjustHeight() {
  const textarea = messageInput.value
  if (!textarea) return

  textarea.style.transition = 'none'
  textarea.style.height = 'auto'
  textarea.offsetHeight

  const lineHeight = 24
  const minLines = 1
  const maxLines = 6
  const minHeight = lineHeight * minLines
  const maxHeight = lineHeight * maxLines

  let newHeight = textarea.scrollHeight

  if (newHeight < minHeight) {
    newHeight = minHeight
  } else if (newHeight > maxHeight) {
    newHeight = maxHeight
    textarea.style.overflowY = 'auto'
  } else {
    textarea.style.overflowY = 'hidden'
  }

  textarea.style.height = `${newHeight}px`
  textarea.offsetHeight
  textarea.style.transition = ''
}

function focus() {
  messageInput.value?.focus()
}

defineExpose({
  adjustHeight: () => nextTick(adjustHeight),
  focus,
})
</script>

<style scoped>
.chat-input {
  width: 50%;
  display: flex;
  position: relative;
  padding: 0 15px 15px;
  margin: 0 auto;
  margin-bottom: 25px;
  background: transparent;
  z-index: 10;
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  transform: translateY(0);
}

.input-frame {
  flex: 1;
  display: flex;
  position: relative;
  border: 1px solid rgba(203, 213, 225, 0.95);
  border-radius: 22px;
  padding: 7px 15px 11px 15px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.92)), #ffffff;
  box-shadow:
    0 14px 34px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.input-frame:focus-within {
  border-color: rgba(37, 99, 235, 0.38);
  background: var(--color-surface);
  box-shadow:
    0 18px 40px rgba(37, 99, 235, 0.11),
    0 0 0 4px rgba(37, 99, 235, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.input-frame textarea {
  flex: 1;
  padding: 10px 44px 10px 10px;
  outline: none;
  border: none;
  background: transparent;
  resize: none;
  min-height: 24px;
  max-height: 144px;
  line-height: 24px;
  font-size: inherit;
  color: var(--color-text-primary);
  overflow-y: hidden;
  transition: height 0.1s ease;
}

.input-frame textarea::placeholder {
  color: var(--color-text-subtle);
}

.send-button-wrap {
  position: absolute;
  right: 48px;
  bottom: 39px;
  display: flex;
}

button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 36%),
    linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow:
    0 10px 22px rgba(37, 99, 235, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease,
    background 0.2s ease;
  align-self: flex-end;
}

button:hover {
  filter: saturate(1.08);
  box-shadow:
    0 14px 28px rgba(37, 99, 235, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.36);
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
  box-shadow:
    0 8px 18px rgba(37, 99, 235, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

button:disabled {
  background: var(--color-border-strong);
  box-shadow: none;
  transform: none;
  cursor: not-allowed;
}

.send-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 16px;
}

.input-frame textarea,
button {
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
</style>
