import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface BreadcrumbItem {
  title: string
  path?: string
}

export const useAppStore = defineStore('app', () => {
  // 侧边栏折叠状态
  const sidebarCollapsed = ref<boolean>(false)
  // 面包屑
  const breadcrumbs = ref<BreadcrumbItem[]>([])

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSidebarCollapsed(val: boolean) {
    sidebarCollapsed.value = val
  }

  function setBreadcrumbs(items: BreadcrumbItem[]) {
    breadcrumbs.value = items
  }

  return {
    sidebarCollapsed,
    breadcrumbs,
    toggleSidebar,
    setSidebarCollapsed,
    setBreadcrumbs,
  }
})
