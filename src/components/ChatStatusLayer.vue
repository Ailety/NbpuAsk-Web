<template>
  <transition name="conversation-status-fade" type="transition">
    <div
      v-if="activeStatus"
      class="conversation-status-layer"
      :class="[`is-${activeStatus}`, { 'is-fullscreen': fullscreen }]"
    >
      <transition name="conversation-status-card-swap" mode="out-in" type="transition">
        <div
          v-if="activeStatus === 'loading'"
          key="loading"
          class="conversation-status-card conversation-loading-card"
        >
          <span class="conversation-loading-orbit" aria-hidden="true"></span>
          <div class="conversation-status-copy">
            <div class="conversation-loading-title">正在加载对话数据……</div>
            <div class="conversation-status-subtitle">即将为你定位到最新内容</div>
          </div>
        </div>

        <div v-else key="error" class="conversation-status-card conversation-error-card">
          <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
          <div class="conversation-status-copy">
            <div class="conversation-error-title">对话加载失败</div>
            <div class="conversation-status-subtitle">请检查对话链接后重试</div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'ChatStatusLayer' })

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
  fullscreen: {
    type: Boolean,
    default: false,
  },
})

const activeStatus = computed(() => {
  if (props.error) return 'error'
  if (props.loading) return 'loading'
  return ''
})
</script>

<style scoped>
.conversation-status-layer {
  position: absolute;
  top: 104px;
  left: 0;
  right: 14px;
  bottom: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.conversation-status-layer.is-fullscreen {
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 12;
}

.conversation-status-layer.is-loading {
  background: radial-gradient(
    circle at 50% 42%,
    rgba(239, 246, 255, 0.8),
    rgba(252, 252, 252, 0) 44%
  );
}

.conversation-status-layer.is-error {
  background: radial-gradient(
    circle at 50% 42%,
    rgba(254, 242, 242, 0.72),
    rgba(252, 252, 252, 0) 42%
  );
}

.conversation-status-card {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  min-width: 299px;
  padding: 17px 21px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-lg);
  transform: translateY(-42px);
}

.conversation-loading-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.9)),
    #ffffff;
  border: 1px solid rgba(147, 197, 253, 0.32);
  box-shadow:
    0 18px 44px rgba(15, 23, 42, 0.08),
    0 0 42px rgba(96, 165, 250, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  animation: conversation-card-float 2.6s ease-in-out infinite;
}

.conversation-error-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 247, 247, 0.9)),
    #ffffff;
  border: 1px solid rgba(252, 165, 165, 0.34);
  box-shadow:
    0 18px 44px rgba(15, 23, 42, 0.08),
    0 0 38px rgba(248, 113, 113, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.conversation-error-card i {
  color: #ef4444;
  font-size: 27px;
}

.conversation-loading-orbit {
  position: relative;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    var(--color-primary),
    var(--color-accent),
    #22c55e,
    var(--color-primary)
  );
  box-shadow: 0 0 18px rgba(37, 99, 235, 0.22);
  animation: conversation-orbit-spin 1.35s linear infinite;
}

.conversation-loading-orbit::after {
  content: '';
  position: absolute;
  inset: 7px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: inset 0 0 0 1px rgba(219, 234, 254, 0.95);
}

.conversation-status-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.conversation-loading-title {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  background: linear-gradient(90deg, #334155 0%, #2563eb 36%, #0ea5e9 62%, #334155 100%);
  background-size: 220% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: conversation-loading-shimmer 2.2s ease-in-out infinite;
}

.conversation-error-title {
  color: var(--color-text-primary);
  font-size: 17px;
  font-weight: 760;
  line-height: 1.35;
}

.conversation-status-subtitle {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.4;
}

.conversation-status-fade-enter-active,
.conversation-status-fade-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease,
    filter 0.22s ease;
}

.conversation-status-fade-enter-from,
.conversation-status-fade-leave-to {
  opacity: 0;
  filter: blur(4px);
  transform: translateY(8px);
}

.conversation-status-fade-enter-to,
.conversation-status-fade-leave-from {
  opacity: 1;
  filter: blur(0);
  transform: translateY(0);
}

.conversation-status-card-swap-enter-active,
.conversation-status-card-swap-leave-active {
  transition:
    opacity 0.16s ease,
    filter 0.16s ease,
    transform 0.16s ease;
}

.conversation-status-card-swap-enter-active.conversation-loading-card,
.conversation-status-card-swap-leave-active.conversation-loading-card {
  animation: none;
}

.conversation-status-card-swap-enter-from,
.conversation-status-card-swap-leave-to {
  opacity: 0;
  filter: blur(3px);
  transform: translateY(-34px) scale(0.985);
}

.conversation-status-card-swap-enter-to,
.conversation-status-card-swap-leave-from {
  opacity: 1;
  filter: blur(0);
  transform: translateY(-42px) scale(1);
}

@keyframes conversation-orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes conversation-loading-shimmer {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes conversation-card-float {
  0%,
  100% {
    transform: translateY(-42px);
  }
  50% {
    transform: translateY(-45px);
  }
}
</style>
