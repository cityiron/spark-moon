import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, getUserInfo, logout as logoutApi } from '@/api/auth'
import { setToken, clearToken, getToken } from '@/api/request'
import type { LoginParams } from '@/types/api'
import type { UserInfo } from '@/types/models'

const USER_INFO_KEY = 'badminton_admin_user'

export const useAuthStore = defineStore('auth', () => {
  // state
  const token = ref<string>(getToken() || '')
  const userInfo = ref<UserInfo | null>(loadUserInfo())
  const roles = ref<string[]>(userInfo.value?.roles || [])

  function loadUserInfo(): UserInfo | null {
    try {
      const raw = localStorage.getItem(USER_INFO_KEY)
      return raw ? (JSON.parse(raw) as UserInfo) : null
    } catch {
      return null
    }
  }

  function persistUserInfo(info: UserInfo | null) {
    if (info) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(info))
    } else {
      localStorage.removeItem(USER_INFO_KEY)
    }
  }

  // getters
  const isLogin = computed(() => !!token.value)
  const username = computed(() => userInfo.value?.nickname || userInfo.value?.username || '')
  const avatar = computed(() => userInfo.value?.avatar || '')

  // actions
  async function login(params: LoginParams) {
    const res = await loginApi(params)
    token.value = res.token
    setToken(res.token)
    return res
  }

  async function fetchUserInfo() {
    const info = await getUserInfo()
    userInfo.value = info
    roles.value = info.roles || []
    persistUserInfo(info)
    return info
  }

  async function logout() {
    try {
      await logoutApi()
    } catch {
      // 忽略退出接口错误
    }
    token.value = ''
    userInfo.value = null
    roles.value = []
    clearToken()
    persistUserInfo(null)
  }

  return {
    token,
    userInfo,
    roles,
    isLogin,
    username,
    avatar,
    login,
    fetchUserInfo,
    logout,
  }
})
