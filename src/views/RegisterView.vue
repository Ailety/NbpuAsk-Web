<template>
  <AnimatedBackground theme="register">
    <div class="register-container">
      <div class="register-card">
        <h2 class="register-title">宁青千问</h2>
        <form @submit.prevent="handleRegister" class="register-form">
          <div class="form-group stagger-1">
            <FloatLabel variant="on">
              <InputText
                style="width: 15.93rem"
                id="usernameInput"
                ref="usernameInput"
                v-model="username"
                v-tooltip.focus.bottom="'用户名需以字母开头，并保证长度在2-12位'"
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
                inputRef="pwdInput"
                toggleMask
                size="large"
                promptLabel="请输入你的密码。"
                weakLabel="你的密码强度过低。"
                mediumLabel="你的密码强度中等。"
                strongLabel="相当复杂的密码。"
              >
                <template #footer>
                  <Divider />
                  <ul class="register-tips">
                    <li>至少有一个数字</li>
                    <li>至少有一个小/大写字母</li>
                    <li>至少有8位，但不超过16位</li>
                    <li>只允许数字、英文和特殊字符</li>
                  </ul>
                </template>
              </Password>
              <label for="passwordInput" id="test">密码</label>
            </FloatLabel>
          </div>
          <div class="form-group-last stagger-3">
            <FloatLabel variant="on">
              <Password
                id="confirmInput"
                ref="confirmInput"
                v-model="confirmPassword"
                aria-label="confirmPassword"
                toggleMask
                :feedback="false"
                size="large"
              />
              <label for="confirmInput">确认密码</label>
            </FloatLabel>
            <div class="auto-login">
              <Checkbox v-model="isAutoLogin" inputId="autoLogin" binary size="small" />
              <label for="autoLogin">不想再次登录，注册成功后自动登录</label>
            </div>
          </div>
          <button
            ref="registerBtn"
            type="submit"
            class="register-btn stagger-4"
            :disabled="isRegister"
            :class="{ 'is-loading': isRegister }"
          >
            <ProgressSpinner
              v-if="isRegister && !isRegisterRedirecting"
              style="width: 24px; height: 24px"
              strokeWidth="8"
              fill="transparent"
              animationDuration=".5s"
            />
            <span v-else>{{ regBtnContent }}</span>
          </button>
        </form>
        <p class="login-link stagger-5">
          已有账号？<router-link to="/login">立即登录</router-link>
        </p>
        <p class="agreement-text stagger-6">
          注册登录即代表已阅读并同意<br />我们的
          <router-link :to="{ path: '/terms', query: { theme: 'register' } }">用户协议</router-link>
          与
          <router-link :to="{ path: '/privacy', query: { theme: 'register' } }"
            >隐私政策</router-link
          >
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
      title="注册成功"
      subtitle="正在自动登录并进入宁青千问……"
    />
  </AnimatedBackground>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { showMessage } from '@/utils/message'
import { loginUser, registerUser, verifyRegister } from '@/api/auth'
import { removeAuthToken, setAuthToken } from '@/utils/functions'
import AnimatedBackground from '@/components/AnimatedBackground.vue'
import AuthLoadingOverlay from '@/components/AuthLoadingOverlay.vue'

const router = useRouter()
const store = useStore()

// 数据状态
const spinning = ref(false)
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const isRegister = ref(false)
const isRegisterRedirecting = ref(false)
const isAutoLogin = ref(false)
const regBtnContent = ref('注册')

// Refs
const usernameInput = ref(null)
const passwordInput = ref(null)
const confirmInput = ref(null)

const copyrightText = computed(() => store.state.copyrightText)

const handleRegister = async () => {
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
  if (!confirmPassword.value) {
    showMessage('请再次输入密码以确认！', 'error')
    confirmInput.value.$el.querySelector('input').focus()
    return
  }
  if (password.value !== confirmPassword.value) {
    showMessage('两次输入的密码不一致！', 'error')
    return
  }

  isRegister.value = true
  isRegisterRedirecting.value = false
  regBtnContent.value = '注册'
  const date = new Date()
  const registerData = {
    username: username.value,
    password: password.value,
    userData: {
      nickname: username.value,
      registrationDate: `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`,
      settings: {
        text: '该用户暂无简介。',
      },
    },
  }

  try {
    const verifyResult = await verifyRegister(registerData)
    if (!verifyResult?.success) {
      showMessage(`注册失败: ${verifyResult?.message || '未知错误'}`, 'error')
      return
    }

    const registerResult = await registerUser(registerData)
    if (!registerResult?.success) {
      showMessage(`注册失败: ${registerResult?.message || '未知错误'}`, 'error')
      return
    }

    if (isAutoLogin.value) {
      const loginResult = await loginUser(username.value, password.value)
      if (loginResult?.success) {
        const authToken = {
          userId: loginResult.data.userId,
          username: loginResult.data.username,
          userData: loginResult.data.userData,
          token: loginResult.data.token,
          accessTime: 0,
        }
        removeAuthToken()
        setAuthToken(authToken)

        spinning.value = true

        setTimeout(() => {
          spinning.value = false
          router.push('/chat')
        }, 1000)
      } else {
        showMessage('自动登录时出现异常！', 'error')
      }
    } else {
      isRegisterRedirecting.value = true
      regBtnContent.value = '注册成功，等待跳转'
      showMessage('注册成功，即将跳转到登录页面！', 'success', 1.5)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  } finally {
    if (!isRegisterRedirecting.value) {
      isRegister.value = false
    }
  }
}
</script>

<style scoped>
/* 渐变标题 */
.register-title {
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
.stagger-6 {
  animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
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

:deep(.p-checkbox .p-checkbox-box) {
  background: rgba(255, 255, 255, 0.82) !important;
  border: 1px solid rgba(203, 213, 225, 0.92) !important;
}

:deep(.p-checkbox.p-checkbox-checked .p-checkbox-box) {
  background: #2563eb !important;
  border-color: #2563eb !important;
}

:deep(.p-floatlabel:has(.p-inputtext:focus) label) {
  color: #2563eb !important;
}

.register-container {
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

.register-card {
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

.register-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 22% 0%, rgba(255, 255, 255, 0.82), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 42%);
  opacity: 0.72;
}

.register-card > * {
  position: relative;
  z-index: 1;
}

.register-form {
  display: flex;
  align-items: center;
  flex-direction: column;
  width: 17.5rem;
  margin-top: 0 0 1.25rem 0;
}

.register-tips {
  padding-left: 20px;
  margin: 0.5rem 0;
  color: #64748b;
  font-size: 0.85rem;
}

.register-tips li {
  margin-bottom: 4px;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group-last {
  margin-bottom: 0.63rem;
}

.auto-login {
  display: flex;
  align-items: center;
  margin-top: 0.63rem;
  color: #64748b;
  font-size: 0.88rem;
  gap: 0.75rem;
}

.register-btn {
  width: 15.93rem;
  height: 3.13rem;
  padding: 0.75rem;
  color: white;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  border: none;
  border-radius: 10px;
  font-size: 1rem;
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

.register-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: saturate(1.04);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.22);
}

.register-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.register-btn:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

.register-btn.is-loading {
  background: #94a3b8;
  box-shadow: none;
}

.login-link {
  text-align: center;
  color: #666;
}

.login-link a {
  color: #2563eb;
  text-decoration: none;
  transition: color 0.3s;
}

.login-link a:hover {
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
