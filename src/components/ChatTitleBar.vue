<template>
  <div class="chat-header">
    <div class="chat-title-shell" :class="{ 'is-title-editing': isEditing }">
      <div class="chat-title-frame" :style="titleFrameStyle" @click.stop="startEdit">
        <input
          v-if="isEditing"
          ref="titleInput"
          v-model="titleDraft"
          class="chat-title-input"
          maxlength="10"
          @click.stop
          @blur="commitEdit"
          @keydown.enter.prevent="commitEdit"
          @keydown.esc.prevent="cancelEdit"
        />
        <h2 v-else class="chat-title">{{ title }}</h2>
      </div>
      <div v-if="subtitle" class="chat-subtitle">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { showMessage } from '@/utils/message'

defineOptions({ name: 'ChatTitleBar' })

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  editable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['rename'])

const titleInput = ref(null)
const isEditing = ref(false)
const titleDraft = ref('')

const titleFrameStyle = computed(() => {
  const titleText = isEditing.value ? titleDraft.value : props.title
  const titleLength = Math.max(Array.from(titleText || '').length, 4)
  const hoverWidth = Math.min(480, Math.max(180, titleLength * 34 + 74))
  const editWidth = Math.min(560, Math.max(320, titleLength * 34 + 128))

  return {
    '--title-frame-width': `${isEditing.value ? editWidth : hoverWidth}px`,
  }
})

function startEdit() {
  if (!props.editable || isEditing.value) return

  titleDraft.value = props.title
  isEditing.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

function cancelEdit() {
  isEditing.value = false
  titleDraft.value = props.title
}

async function commitEdit() {
  if (!isEditing.value) return

  const nextTitle = titleDraft.value.trim()
  const currentTitle = props.title

  if (nextTitle === '' || nextTitle === currentTitle) {
    cancelEdit()
    return
  }

  if (nextTitle.length > 10) {
    showMessage('对话名称不能超过10个字符！', 'error', 2)
    titleDraft.value = currentTitle
    isEditing.value = false
    return
  }

  await emit('rename', nextTitle)
  isEditing.value = false
}
</script>

<style scoped>
.chat-header {
  height: 104px;
  min-height: 104px;
  box-sizing: border-box;
  position: relative;
  z-index: 7;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  text-align: center;
  padding: 16px 0 10px;
  background: var(--color-page-bg);
  color: black;
  overflow: visible;
}

.chat-title-shell {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  max-width: min(760px, 72vw);
  min-height: 66px;
  padding: 0 18px 9px;
  box-sizing: border-box;
}

.chat-title-frame {
  width: var(--title-frame-width, 260px);
  max-width: min(560px, 62vw);
  min-height: 49px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 16px 5px;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 16px;
  cursor: text;
  transition:
    width 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.chat-title-frame:hover,
.chat-title-shell.is-title-editing .chat-title-frame {
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(203, 213, 225, 0.72);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.chat-title-shell.is-title-editing .chat-title-frame {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.92));
  border-color: rgba(59, 130, 246, 0.2);
  box-shadow:
    0 12px 32px rgba(37, 99, 235, 0.09),
    inset 0 0 0 1px rgba(255, 255, 255, 0.7);
}

.chat-title {
  margin: 0;
  max-width: 100%;
  color: var(--color-text-primary);
  font-size: 30px;
  font-weight: 800;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-title-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin: 0;
  padding: 0 8px;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  outline: none;
  text-align: center;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.35;
}

.chat-subtitle {
  margin-top: 2px;
  width: max-content;
  max-width: min(720px, 70vw);
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
