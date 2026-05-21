import { axios, getApiUrl, handleError } from './http'
import { getAuthToken, incrementAccessTime, setAuthToken } from '@/utils/functions'

export async function verifyToken() {
  const authToken = getAuthToken()
  if (!authToken) {
    return {
      status: 1,
      isAuthenticated: false,
      message: '无登录令牌',
    }
  }

  try {
    const response = await axios.post(getApiUrl('/verify/auth-token'), null, {
      headers: {
        Authorization: `Bearer ${authToken.token}`,
      },
    })

    if (response.data.code === 200) {
      incrementAccessTime()
      return {
        status: 2,
        isAuthenticated: true,
        message: '令牌验证通过',
      }
    }

    if (response.data.code === 1007) {
      const newToken = response.data.data?.newToken || response.data.data
      if (!newToken) {
        return {
          status: 7,
          isAuthenticated: false,
          message: '认证异常',
        }
      }

      setAuthToken({
        userId: authToken.userId,
        username: authToken.username,
        userData: authToken.userData,
        token: newToken,
        accessTime: 1,
      })
      return {
        status: 3,
        isAuthenticated: true,
        message: '令牌验证通过，但已过期，已更新新的令牌',
      }
    }

    if (response.data.code === 1008) {
      return {
        status: 4,
        isAuthenticated: false,
        message: '令牌验证失败',
      }
    }

    if (response.data.code === 1009) {
      return {
        status: 5,
        isAuthenticated: false,
        message: '令牌与用户信息不匹配',
      }
    }

    return {
      status: 7,
      isAuthenticated: false,
      message: '认证异常',
    }
  } catch (error) {
    console.error('请求失败:', error)
    return {
      status: 6,
      isAuthenticated: false,
      message: '请求失败',
    }
  }
}

export async function loginUser(username, password) {
  try {
    const response = await axios.post(getApiUrl('/user/login'), {
      username,
      password,
    })
    return response.data
  } catch (error) {
    handleError(error, '登录失败，请稍后重试。')
    return null
  }
}

export async function verifyRegister(registerData) {
  try {
    const response = await axios.post(getApiUrl('/verify/register'), registerData)
    return response.data
  } catch (error) {
    handleError(error, '注册信息校验失败，请稍后重试。')
    return null
  }
}

export async function registerUser(registerData) {
  try {
    const response = await axios.post(getApiUrl('/user/register'), registerData)
    return response.data
  } catch (error) {
    handleError(error, '注册失败，请稍后重试。')
    return null
  }
}
