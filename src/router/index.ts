import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getToken } from '@/api/request'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/W00-Login.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/apply',
    name: 'OperatorApply',
    component: () => import('@/views/operator/W01-OperatorApply.vue'),
    meta: { title: '经营者入驻申请', requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/operator',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'operator',
        name: 'OperatorManage',
        component: () => import('@/views/operator/W01-OperatorManage.vue'),
        meta: { title: '账号管理', icon: 'TeamOutlined' },
      },
      {
        path: 'venue',
        name: 'VenueManage',
        component: () => import('@/views/venue/W02-VenueManage.vue'),
        meta: { title: '球馆管理', icon: 'EnvironmentOutlined' },
      },
      {
        path: 'booking',
        name: 'BookingManage',
        component: () => import('@/views/booking/W08-BookingManage.vue'),
        meta: { title: '预订管理', icon: 'CalendarOutlined' },
      },
      {
        path: 'member',
        name: 'MemberManage',
        component: () => import('@/views/member/W03-MemberManage.vue'),
        meta: { title: '会员管理', icon: 'TeamOutlined' },
      },
      {
        path: 'platform-card',
        name: 'PlatformCardManage',
        component: () => import('@/views/member/PlatformCardManage.vue'),
        meta: { title: '平台会员卡', icon: 'IdcardOutlined' },
      },
      {
        path: 'vip',
        name: 'VipPlanManage',
        component: () => import('@/views/vip/W04-VipPlanManage.vue'),
        meta: { title: 'VIP 权益配置', icon: 'CrownOutlined' },
      },
      {
        path: 'training',
        name: 'TrainingCourseManage',
        component: () => import('@/views/training/W05-TrainingCourseManage.vue'),
        meta: { title: '培训课程管理', icon: 'ReadOutlined' },
      },
      {
        path: 'schedule',
        name: 'ScheduleManage',
        component: () => import('@/views/schedule/W06-ScheduleManage.vue'),
        meta: { title: '课时排课', icon: 'ScheduleOutlined' },
      },
      {
        path: 'finance',
        name: 'FinanceManage',
        component: () => import('@/views/finance/W13-FinanceManage.vue'),
        meta: { title: '财务管理', icon: 'WalletOutlined' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/login/W00-Login.vue'),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// 白名单(无需登录可访问)
const WHITE_LIST = ['/login']

// ==================== 菜单角色权限表 ====================
// key: 菜单路径 → 可访问角色 (与 AdminLayout 菜单一致)
// 经营者(operator)可访问球馆管理 / 场地预订 / 会员管理(仅自己俱乐部数据)
export const ROLE_MENUS: Record<string, string[]> = {
  '/operator': ['super_admin'], // 账号管理: 仅平台超管
  '/venue': ['super_admin', 'operator', 'admin'], // 球馆管理
  '/booking': ['super_admin', 'operator', 'admin', 'staff'], // 场地预订
  '/member': ['super_admin', 'admin', 'staff', 'operator'], // 会员管理（俱乐部视角）
  '/platform-card': ['super_admin', 'admin'], // 平台会员卡: 平台维护
  '/vip': ['super_admin', 'admin'], // VIP 权益配置（球馆卡）
  '/training': ['super_admin', 'admin', 'coach'], // 培训课程管理
  '/schedule': ['super_admin', 'admin', 'coach'], // 课时排课
  '/finance': ['super_admin', 'admin'], // 财务管理
}

/** 返回该角色第一个可访问的菜单路径, 无则默认球馆管理 */
export function firstAllowedPath(roles: string[]) {
  return (
    Object.keys(ROLE_MENUS).find((path) =>
      ROLE_MENUS[path].some((r) => roles.includes(r)),
    ) || '/venue'
  )
}

/** 判断某路径是否可被该角色访问 */
export function canAccess(path: string, roles: string[]) {
  const allowed = ROLE_MENUS[path]
  if (!allowed) return true // 非菜单路径不做限制
  return allowed.some((r) => roles.includes(r))
}

router.beforeEach((to, _from, next) => {
  const token = getToken()
  document.title = (to.meta.title as string) ? `${to.meta.title} - 羽球管家` : '羽球管家'

  if (token) {
    if (to.path === '/login') {
      next({ path: '/' })
    } else {
      // 已登录但未获取用户信息, 则获取
      const authStore = useAuthStore()
      if (!authStore.userInfo) {
        authStore.fetchUserInfo().catch(() => {
          // 获取失败则退出
          authStore.logout()
          next({ path: '/login', query: { redirect: to.fullPath } })
        })
      }
      // 菜单权限校验: 无权限则跳转到该角色第一个可访问页面
      if (!canAccess(to.path, authStore.roles)) {
        next({ path: firstAllowedPath(authStore.roles) })
        return
      }
      next()
    }
  } else {
    if (WHITE_LIST.includes(to.path) || to.meta.requiresAuth === false) {
      next()
    } else {
      next({ path: '/login', query: { redirect: to.fullPath } })
    }
  }
})

export default router
