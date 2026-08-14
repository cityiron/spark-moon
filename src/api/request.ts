import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { message } from 'ant-design-vue'
import type { Result } from '@/types/api'
import { setupMock } from '@/mock'

/** 业务错误码: 未登录/登录失效 */
const CODE_UNAUTHORIZED = 900401

const TOKEN_KEY = 'badminton_admin_token'

/** 获取本地 token */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/** 设置本地 token */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/** 清除本地 token */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/** axios 实例 */
const service: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
})

// 安装 Mock 拦截 (仅 VITE_USE_MOCK=true 时生效)
setupMock(service)

/** 请求拦截器: 注入 JWT */
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

/** 响应拦截器: 拆解 Result<T>, 统一错误处理 */
service.interceptors.response.use(
  (response) => {
    const res = response.data as Result

    // 非 JSON / 无 code 字段 (例如文件流), 直接返回
    if (res === null || typeof res !== 'object' || res.code === undefined) {
      return response.data
    }

    // 业务成功 (code = 0)
    if (res.code === 0) {
      return res.data
    }

    // 登录失效
    if (res.code === CODE_UNAUTHORIZED) {
      clearToken()
      message.error('登录已失效，请重新登录')
      // 延迟跳转，避免在 store 初始化前调用
      setTimeout(() => {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?redirect=${redirect}`
      }, 800)
      return Promise.reject(new Error(res.message || '登录已失效'))
    }

    // 其他业务错误
    message.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || 'Error'))
  },
  (error) => {
    // HTTP 层错误
    const status = error?.response?.status
    let tip = error.message || '网络异常，请稍后重试'
    if (status === 401) {
      clearToken()
      tip = '登录已失效，请重新登录'
      setTimeout(() => {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?redirect=${redirect}`
      }, 800)
    } else if (status === 403) {
      tip = '没有权限访问该资源'
    } else if (status === 404) {
      tip = '请求的资源不存在'
    } else if (status && status >= 500) {
      tip = '服务器开小差了，请稍后重试'
    }
    message.error(tip)
    return Promise.reject(error)
  },
)

/** 封装请求方法, 返回 data 部分 (已由拦截器拆解) */
export function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  return service.request<unknown, T>(config)
}

export default service
