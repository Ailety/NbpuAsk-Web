<template>
  <AnimatedBackground theme="login">
    <div class="login-container">
      <div class="login-card">
        <h2 class="login-title">宁青千问</h2>
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group stagger-1">
            <FloatLabel variant="on">
              <InputText
                id="usernameInput"
                ref="usernameInput"
                style="width: 15.93rem"
                v-model="username"
                size="large"
              />
              <label for="usernameInput">用户名</label>
            </FloatLabel>
          </div>
          <div class="form-group stagger-2">
            <FloatLabel variant="on">
              <Password
                id="passwordInput"
                ref="passwordInput"
                v-model="password"
                toggleMask
                :feedback="false"
                size="large"
              />
              <label for="passwordInput">密码</label>
            </FloatLabel>
          </div>
          <button
            ref="loginBtn"
            type="submit"
            class="login-btn stagger-3"
            :disabled="isLogin"
            :class="{ 'is-loading': isLogin }"
          >
            <ProgressSpinner
              v-if="isLogin"
              style="width: 24px; height: 24px"
              strokeWidth="8"
              fill="transparent"
              animationDuration=".5s"
            />
            <span v-else>{{ loginBtnContent }}</span>
          </button>
        </form>
        <p class="register-link stagger-4">
          没有账号？<router-link to="/register">立即注册</router-link>
        </p>
        <p class="agreement-text stagger-5">
          注册登录即代表已阅读并同意<br />我们的
          <router-link :to="{ path: '/terms', query: { theme: 'login' } }">用户协议</router-link>
          与
          <router-link :to="{ path: '/privacy', query: { theme: 'login' } }">隐私政策</router-link>
        </p>
      </div>
      <div class="footer">
        <p class="copyright-text">{{ copyrightText }}</p>
        <a
          target="_blank"
          class="copyright-text"
          style="text-decoration: none"
          href="https://beian.miit.gov.cn/"
          >浙ICP备2026033825号-1</a
        >
      </div>
    </div>
    <AuthLoadingOverlay
      :visible="spinning"
      title="登录成功"
      subtitle="正在进入宁青千问，请稍候……"
    />
  </AnimatedBackground>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import {
  getTokenStatus,
  removeTokenStatus,
  removeAuthToken,
  setAuthToken,
  setLocalConvs,
  setConversationShares,
  setCurConvIndex,
} from '@/utils/functions'
import { showMessage } from '@/utils/message'
import { loginUser } from '@/api/auth'
import AnimatedBackground from '@/components/AnimatedBackground.vue'
import AuthLoadingOverlay from '@/components/AuthLoadingOverlay.vue'

const router = useRouter()
const store = useStore()

// 数据状态
const spinning = ref(false)
const username = ref('')
const password = ref('')
const isLogin = ref(false)
const loginBtnContent = ref('登录')
const isLoginSuccess = ref(false)

// Refs
const usernameInput = ref(null)
const passwordInput = ref(null)

const copyrightText = computed(() => store.state.copyrightText)

onMounted(() => {
  if (getTokenStatus() == 4 || getTokenStatus() == 5) {
    const text = getTokenStatus() == 4 ? '无效' : '非法'
    removeAuthToken()
    removeTokenStatus()
    setTimeout(() => {
      showMessage(`${text}的登录令牌！请重新登录。`, 'error')
    }, 400)
  }
})

const handleLogin = async () => {
  if (!username.value) {
    showMessage('用户名不能为空！', 'error')
    usernameInput.value.$el.focus()
    return
  }
  if (!password.value) {
    showMessage('密码不能为空！', 'error')
    passwordInput.value.$el.querySelector('input').focus()
    return
  }

  isLogin.value = true

  const response = await loginUser(username.value, password.value)
  if (response?.success) {
    // 登录新账号前，强制清空 Vuex 残留
    setLocalConvs([])
    setConversationShares([])
    setCurConvIndex(-1)

    // 将下发的token存入localStorage
    const authToken = {
      userId: response.data.userId,
      username: response.data.username,
      userData: response.data.userData,
      token: response.data.token,
      accessTime: 0,
    }
    removeAuthToken()
    setAuthToken(authToken)

    // 显示加载动画
    spinning.value = true
    isLogin.value = false
    isLoginSuccess.value = true
    loginBtnContent.value = '登录成功'

    // 关闭加载动画并跳转到首页
    setTimeout(() => {
      spinning.value = false
      router.push('/chat')
    }, 1000)
  } else if (response?.code === 1006) {
    showMessage('用户名或密码错误！', 'error')
  }
  isLogin.value = false
}
</script>

<style scoped>
/* 渐变标题 */
.login-title {
  display: block;
  width: 100%;
  margin-bottom: 1.88rem;
  font-size: 1.88rem;
  text-align: center;
  color: #0f172a;
  font-weight: bold;
  letter-spacing: 0;
}

/* 瀑布流入场动画 */
@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stagger-1 {
  animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
}
.stagger-2 {
  animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
}
.stagger-3 {
  animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}
.stagger-4 {
  animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
}
.stagger-5 {
  animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
}

/* 透传 PrimeVue 组件样式以适配毛玻璃 */
:deep(.p-inputtext) {
  background: rgba(255, 255, 255, 0.82) !important;
  border: 1px solid rgba(203, 213, 225, 0.92) !important;
  color: #1f2937 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72) !important;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease !important;
}

:deep(.p-inputtext:enabled:focus) {
  background: #ffffff !important;
  border-color: rgba(37, 99, 235, 0.54) !important;
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.84) !important;
}

:deep(.p-floatlabel label) {
  background-color: transparent !important;
  color: #64748b !important;
  padding: 0 4px;
}

:deep(.p-floatlabel:has(.p-inputtext:focus) label) {
  color: #2563eb !important;
}

.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  will-change: transform, opacity;
  z-index: 10;
}

.login-card {
  display: flex;
  align-items: center;
  flex-direction: column;
  position: relative;
  width: 23.13rem;
  margin: 0;
  padding: 2.5rem;
  font-size: 1rem;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.48)),
    rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(28px) saturate(1.08);
  -webkit-backdrop-filter: blur(28px) saturate(1.08);
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-top-color: rgba(255, 255, 255, 0.96);
  border-radius: 18px;
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.92) inset,
    0 0 0 1px rgba(148, 163, 184, 0.08);
}

.login-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 22% 0%, rgba(255, 255, 255, 0.82), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 42%);
  opacity: 0.72;
}

.login-card > * {
  position: relative;
  z-index: 1;
}

.login-form {
  display: flex;
  align-items: center;
  flex-direction: column;
  width: 17.5rem;
  margin-top: 0 0 1.25rem 0;
}

.form-group {
  margin-bottom: 1.25rem;
}

.login-btn {
  width: 15.93rem;
  height: 3.13rem;
  padding: 0.75rem;
  color: white;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  font-size: 1rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.18);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: saturate(1.04);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.22);
}

.login-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.login-btn:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

.login-btn.is-loading {
  background: #94a3b8;
  box-shadow: none;
}

.register-link {
  text-align: center;
  color: #666;
}

.register-link a {
  color: #2563eb;
  text-decoration: none;
  transition: color 0.3s;
}
.register-link a:hover {
  color: #1d4ed8;
}

.agreement-text {
  text-align: center;
  color: #666;
  font-size: 0.75rem;
  margin-top: 1.25rem;
}

.agreement-text a {
  color: #2563eb;
  text-decoration: none;
  transition: color 0.3s;
}
.agreement-text a:hover {
  color: #1d4ed8;
}

.footer {
  text-align: center;
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
}

.copyright-text {
  text-align: center;
  color: #666;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: auto;
}
</style>
