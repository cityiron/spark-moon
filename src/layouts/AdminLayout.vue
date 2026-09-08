<template>
  <a-layout class="admin-layout">
    <!-- 侧边栏 -->
    <a-layout-sider
      v-model:collapsed="collapsed"
      collapsible
      :trigger="null"
      :width="220"
      class="admin-sider"
    >
      <div class="logo-area" @click="goHome">
        <div class="logo-icon">
          <img :src="logoSvg" alt="logo" />
        </div>
        <transition name="fade">
          <span v-show="!collapsed" class="logo-text">羽球管家</span>
        </transition>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        mode="inline"
        theme="dark"
        :items="menuItems"
        @click="onMenuClick"
      />
    </a-layout-sider>

    <a-layout class="admin-main">
      <!-- 顶部 -->
      <a-layout-header class="admin-header">
        <div class="header-left">
          <a-button type="text" class="collapse-btn" @click="toggleCollapsed">
            <menu-unfold-outlined v-if="collapsed" />
            <menu-fold-outlined v-else />
          </a-button>
          <a-breadcrumb class="header-breadcrumb">
            <a-breadcrumb-item v-for="item in breadcrumbList" :key="item.path">
              {{ item.title }}
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>
        <div class="header-right">
          <a-tooltip title="刷新">
            <a-button type="text" @click="reload">
              <reload-outlined />
            </a-button>
          </a-tooltip>
          <a-dropdown>
            <div class="user-info">
              <a-avatar :size="32" :src="authStore.avatar">
                <template #icon><user-outlined /></template>
              </a-avatar>
              <span class="username">{{ authStore.username || '管理员' }}</span>
            </div>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile" disabled>
                  <user-outlined />
                  <span>个人中心</span>
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout">
                  <logout-outlined />
                  <span>退出登录</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>

      <!-- 内容区 -->
      <a-layout-content class="admin-content">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <!-- :key 保证路由切换时旧组件先完整卸载, 避免 transition 过程中对已销毁 DOM 做 patch 报 parentNode null -->
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { ROLE_MENUS } from '@/router'
import {
  EnvironmentOutlined,
  CalendarOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  UserOutlined,
  LogoutOutlined,
  CrownOutlined,
  ReadOutlined,
  ScheduleOutlined,
  WalletOutlined,
  IdcardOutlined,
  UsergroupAddOutlined,
  ProfileOutlined,
  FlagOutlined,
} from '@ant-design/icons-vue'
import type { ItemType } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const logoSvg =
  'data:image/svg+xml;base64,' +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#059669"/><path d="M14 30c2-8 6-13 10-13s8 5 10 13" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="24" cy="14" r="3.5" fill="#fff"/></svg>`)

const collapsed = computed({
  get: () => appStore.sidebarCollapsed,
  set: (val) => appStore.setSidebarCollapsed(val),
})

function toggleCollapsed() {
  appStore.toggleSidebar()
}

// 菜单配置（账号管理为入口, 后接业务功能）; 按角色权限过滤
const menuItems = computed<ItemType[]>(() => {
  const all: ItemType[] = [
    {
      key: '/operator',
      icon: () => h(TeamOutlined),
      label: '账号管理',
    },
    {
      key: '/venue',
      icon: () => h(EnvironmentOutlined),
      label: '球馆管理',
    },
    {
      key: '/booking',
      icon: () => h(CalendarOutlined),
      label: '场地预订',
    },
    {
      key: '/orders',
      icon: () => h(ProfileOutlined),
      label: '订单管理',
    },
    {
      key: '/member',
      icon: () => h(UserOutlined),
      label: '会员管理',
    },
    {
      key: '/friend',
      icon: () => h(UsergroupAddOutlined),
      label: '球友管理',
    },
    {
      key: '/platform-card',
      icon: () => h(IdcardOutlined),
      label: '平台会员卡',
    },
    {
      key: '/vip',
      icon: () => h(CrownOutlined),
      label: '俱乐部会员卡',
    },
    {
      key: '/training',
      icon: () => h(ReadOutlined),
      label: '培训课程管理',
    },
    {
      key: '/schedule',
      icon: () => h(ScheduleOutlined),
      label: '课时排课',
    },
    {
      key: '/activity',
      icon: () => h(FlagOutlined),
      label: '活动管理',
    },
    {
      key: '/finance',
      icon: () => h(WalletOutlined),
      label: '财务管理',
    },
  ]
  return all.filter((item) => {
    if (!item) return false
    const allowed = ROLE_MENUS[item.key as string]
    return !allowed || allowed.some((r) => authStore.roles.includes(r))
  })
})

const selectedKeys = ref<string[]>([route.path])
const openKeys = ref<string[]>([])

watch(
  () => route.path,
  (path) => {
    selectedKeys.value = [path]
  },
  { immediate: true },
)

function onMenuClick({ key }: { key: string }) {
  if (key.startsWith('/')) {
    router.push(key)
  }
}

// 面包屑
const breadcrumbList = computed(() => {
  const list = [{ title: '首页', path: '/' }]
  if (route.meta.title) {
    list.push({ title: route.meta.title as string, path: route.path })
  }
  appStore.setBreadcrumbs(list)
  return list
})

function goHome() {
  router.push('/')
}

function reload() {
  router.replace({ path: '/redirect' + route.fullPath }).catch(() => {
    location.reload()
  })
}

async function handleLogout() {
  Modal.confirm({
    title: '确认退出登录?',
    content: '退出后需要重新登录才能继续使用',
    okText: '确认退出',
    cancelText: '取消',
    async onOk() {
      await authStore.logout()
      message.success('已退出登录')
      router.replace('/login')
    },
  })
}
</script>

<style scoped lang="scss">
.admin-layout {
  height: 100vh;
}

.admin-sider {
  background: #001529;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  :deep(.ant-layout-sider-children) {
    display: flex;
    flex-direction: column;
  }
  :deep(.ant-menu) {
    flex: 1;
    border-right: none;
  }
}

.logo-area {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  .logo-icon {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    img {
      width: 100%;
      height: 100%;
    }
  }
  .logo-text {
    color: #fff;
    font-size: 18px;
    font-weight: 600;
    white-space: nowrap;
    letter-spacing: 1px;
  }
}

.admin-main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-header {
  background: #fff;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  z-index: 9;
  height: 56px;
  line-height: 56px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  .collapse-btn {
    font-size: 18px;
    color: #333;
  }
  .header-breadcrumb {
    font-size: 15px;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 0 8px;
    height: 56px;
    border-radius: 4px;
    transition: background 0.2s;
    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }
    .username {
      font-size: 14px;
      color: #333;
    }
  }
}

.admin-content {
  flex: 1;
  overflow: auto;
  background: #f5f5f5;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-fade-leave-to {
  opacity: 0;
}
</style>
