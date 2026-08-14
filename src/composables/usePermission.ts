import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * 权限校验 composable
 */
export function usePermission() {
  const authStore = useAuthStore()

  /** 用户拥有的权限列表 */
  const permissions = computed<string[]>(() => authStore.userInfo?.permissions || [])
  /** 用户角色 */
  const roles = computed<string[]>(() => authStore.roles || [])

  /** 是否拥有指定权限 */
  function hasPermission(code: string): boolean {
    const list = permissions.value
    if (list.length === 0) return true // 未配置权限时默认放行
    return list.includes(code) || list.includes('*')
  }

  /** 是否拥有任一权限 */
  function hasAnyPermission(codes: string[]): boolean {
    if (codes.length === 0) return true
    return codes.some((c) => hasPermission(c))
  }

  /** 是否拥有指定角色 */
  function hasRole(role: string): boolean {
    return roles.value.includes(role) || roles.value.includes('*')
  }

  return {
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasRole,
  }
}
