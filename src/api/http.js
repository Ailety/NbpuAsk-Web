import axios from 'axios'
import { showMessage } from '@/utils/message'
import { getAuthToken, getServerUrl } from '@/utils/functions'

const RESULT_CODE_MESSAGES = {
  400: '请求参数有误，请检查后重试。',
  401: '登录状态已失效，请重新登录。',
  404: '请求的资源不存在。',
  405: '请求方式错误。',
  500: '服务器处理异常，请稍后重试。',
  1001: '参数无效，请检查后重试。',
  1002: '缺少必要参数，请检查后重试。',
  1003: '用户名不合法。',
  1004: '密码不合法。',
  1005: '用户已存在。',
  1006: '用户名或密码错误。',
  1007: '登录令牌已过期，请重新登录。',
  1008: '登录令牌无效，请重新登录。',
  1009: '登录令牌与用户信息不匹配，请重新登录。',
  1010: '登录状态校验未通过，请重新登录。',
  1300: '创建对话失败，请稍后重试。',
  1301: '获取对话失败，请稍后重试。',
  1302: '保存对话失败，请稍后重试。',
  1303: '删除对话失败，请稍后重试。',
  1304: '对话不存在，请检查链接后重试。',
  1305: '模型响应异常，请稍后重试。',
  1306: '当前对话仍有未完成的模型响应，请稍后再试。',
}

export function getApiUrl(path) {
  return `${getServerUrl()}${path}`
}

export function getRequiredAuthToken() {
  const authToken = getAuthToken()
  if (!authToken?.token) {
    throw new Error('登录状态已失效，请重新登录')
  }

  return authToken
}

export function getAuthHeaders() {
  const authToken = getRequiredAuthToken()
  return {
    Authorization: `Bearer ${authToken.token}`,
  }
}

export function getAuthConfig() {
  return {
    headers: getAuthHeaders(),
  }
}

export function resolveResultErrorMessage(result, fallbackMessage = '请求失败，请稍后重试。') {
  if (!result) return fallbackMessage

  const codeMessage = RESULT_CODE_MESSAGES[result.code]
  return codeMessage || result.message || fallbackMessage
}

export function notifyResultError(result, fallbackMessage, options = {}) {
  if (options.silent) return
  showMessage(resolveResultErrorMessage(result, fallbackMessage), 'error', options.duration ?? 3)
}

export function handleError(error, fallbackMessage = '请求失败，请稍后重试。', options = {}) {
  if (options.silent) return

  const responseData = error?.response?.data
  if (responseData?.code || responseData?.message) {
    notifyResultError(responseData, fallbackMessage, options)
    return
  }

  if (error?.message === 'Network Error') {
    showMessage('网络连接失败，请检查网络或服务状态。', 'error', options.duration ?? 3)
    return
  }

  if (error?.response?.status >= 500) {
    showMessage('服务器处理异常，请稍后重试。', 'error', options.duration ?? 3)
    return
  }

  showMessage(fallbackMessage, 'error', options.duration ?? 3)
}

export { axios }
