import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  login as loginApi,
  getUserInfo,
  getOperators,
  switchOperator as switchOperatorApi,
  logout as logoutApi,
} from '@/api/auth'
import { setToken, clearToken, getToken } from '@/api/request'
import type { LoginParams } from '@/types/api'
import type { OperatorScope, UserInfo } from '@/types/models'

const USER_INFO_KEY = 'badminton_admin_user'

export const useAuthStore = defineStore('auth', () => {
  // state
  const token = ref<string>(getToken() || '')
  const userInfo = ref<UserInfo | null>(loadUserInfo())
  const roles = ref<string[]>(userInfo.value?.roles || [])
  // 当前激活的经营者主体 (super_admin 为 null)
  const activeOperatorId = ref<string | number | null>(userInfo.value?.activeOperatorId ?? null)
  // 可切换的经营者主体列表
  const operatorList = ref<OperatorScope[]>(userInfo.value?.operators || [])

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
  /** 当前激活主体对象 (无则 undefined) */
  const activeOperator = computed(() =>
    operatorList.value.find((o) => String(o.operatorId) === String(activeOperatorId.value)),
  )

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
    activeOperatorId.value = info.activeOperatorId ?? null
    operatorList.value = info.operators || []
    persistUserInfo(info)
    return info
  }

  /** 刷新可切换主体列表(切换主体后 token 已更新, 单独拉取) */
  async function refreshOperators() {
    const list = await getOperators()
    operatorList.value = list || []
    return list
  }

  /** 切换当前经营者主体: 后端返回携带新 operatorId 的 token */
  async function switchOperator(operatorId: string | number) {
    const res = await switchOperatorApi(operatorId)
    token.value = res.token
    setToken(res.token)
    await fetchUserInfo()
    return res
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
    activeOperatorId.value = null
    operatorList.value = []
    clearToken()
    persistUserInfo(null)
  }

  return {
    token,
    userInfo,
    roles,
    activeOperatorId,
    operatorList,
    activeOperator,
    isLogin,
    username,
    avatar,
    login,
    fetchUserInfo,
    refreshOperators,
    switchOperator,
    logout,
  }
})
