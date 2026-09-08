<template>
  <div class="page-container">
    <!-- 顶部统计卡 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">球友总数</div>
        <div class="stat-value text-primary">{{ stats.totalFriends }}</div>
        <div class="stat-sub">持卡会员 {{ stats.memberCount }} 人</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本月新增</div>
        <div class="stat-value text-accent">{{ stats.monthNew }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">订场球友</div>
        <div class="stat-value text-success">{{ stats.consumedFriends }}</div>
        <div class="stat-sub">累计订场 {{ stats.totalBookings }} 次</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">订场金额合计</div>
        <div class="stat-value">¥ {{ formatFen(stats.totalBookingAmount) }}</div>
      </div>
    </div>

    <div class="page-card">
      <!-- 搜索栏 -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <a-select
            v-if="isPlatformRole"
            v-model:value="searchOperatorId"
            placeholder="全部俱乐部"
            style="width: 200px"
            allow-clear
            show-search
            option-filter-prop="label"
            :options="clubOptions"
            :loading="clubLoading"
            @change="handleSearch"
          />
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="昵称 / 手机号"
            style="width: 240px"
            allow-clear
            @search="handleSearch"
          />
          <a-select
            v-model:value="searchHasCard"
            placeholder="是否持卡"
            style="width: 140px"
            allow-clear
            :options="hasCardOptions"
            @change="handleSearch"
          />
          <a-button @click="handleReset">重置</a-button>
        </div>
      </div>

      <!-- 球友表格 -->
      <a-table
        :columns="columns"
        :data-source="dataList"
        :loading="loading"
        row-key="id"
        :pagination="pagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'user'">
            <a-space>
              <a-avatar :size="32" :src="record.avatar">
                {{ (record.nickname || record.phone || '球')?.charAt(0) }}
              </a-avatar>
              <div>
                <div>{{ record.nickname || '未设置昵称' }}</div>
                <div class="sub-text">{{ record.phone || '-' }}</div>
              </div>
            </a-space>
          </template>
          <template v-else-if="column.dataIndex === 'hasCard'">
            <a-tag v-if="record.hasCard" color="green">持卡</a-tag>
            <a-tag v-else>未持卡</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'operatorName'">
            <span v-if="record.mainOperatorName">
              <a-tag color="green" style="margin-right: 0">{{ record.mainOperatorName }}</a-tag>
            </span>
            <span v-else-if="record.cardOperatorName">{{ record.cardOperatorName }}</span>
            <span v-else class="text-muted">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'bookingAmount'">
            <span v-if="record.bookingCount > 0" class="balance-text">¥ {{ formatFen(record.bookingAmount) }}</span>
            <span v-else class="text-muted">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'lastBookingAt'">
            <span v-if="record.lastBookingAt">{{ record.lastBookingAt }}</span>
            <span v-else class="text-muted">未订场</span>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  getFriendList,
  getFriendStats,
  type FriendQuery,
} from '@/api/friend'
import { getOperatorList } from '@/api/operator'
import { useAuthStore } from '@/stores/auth'
import { useTable } from '@/composables/useTable'
import type { Friend, FriendStats } from '@/types/models'

// ===== 当前角色 & 俱乐部 =====
const authStore = useAuthStore()
/** 平台角色: 超管/管理员可切换俱乐部查看；经营者固定自己俱乐部（后端强制） */
const isPlatformRole = computed(
  () => authStore.roles.includes('super_admin') || authStore.roles.includes('admin'),
)
const clubOptions = ref<{ label: string, value: string | number }[]>([])
const clubLoading = ref(false)
const searchOperatorId = ref<string | number | undefined>(undefined)

async function loadClubs() {
  if (!isPlatformRole.value) return
  clubLoading.value = true
  try {
    const res = await getOperatorList({ page: 1, size: 100, status: 'approved' })
    clubOptions.value = (res.list || []).map((o) => ({
      label: o.companyName || `俱乐部 #${o.id}`,
      value: o.id,
    }))
  } catch {
    clubOptions.value = []
  } finally {
    clubLoading.value = false
  }
}

/** 当前生效的俱乐部过滤（经营者不传，后端强制自己） */
const currentOperatorId = computed(() => (isPlatformRole.value ? searchOperatorId.value : undefined))

// ===== 工具 =====
/** 分转元, 保留两位小数 */
function formatFen(fen: number | undefined): string {
  if (fen === undefined || fen === null) return '0.00'
  return (fen / 100).toFixed(2)
}

// ===== 映射 =====
const hasCardOptions = [
  { label: '持卡', value: 'true' },
  { label: '未持卡', value: 'false' },
]

// ===== 统计 =====
const stats = reactive<FriendStats>({
  totalFriends: 0,
  monthNew: 0,
  memberCount: 0,
  consumedFriends: 0,
  totalBookings: 0,
  totalBookingAmount: 0,
})

async function loadStats() {
  try {
    const data = await getFriendStats(currentOperatorId.value)
    Object.assign(stats, data)
  } catch {
    // 静默失败, 保持 0
  }
}

// ===== 搜索 =====
const searchKeyword = ref('')
const searchHasCard = ref<string | undefined>(undefined)

function handleSearch() {
  queryParams.keyword = searchKeyword.value || undefined
  queryParams.hasCard = searchHasCard.value === undefined ? undefined : searchHasCard.value === 'true'
  queryParams.operatorId = currentOperatorId.value
  refresh()
  loadStats()
}
function handleReset() {
  searchKeyword.value = ''
  searchHasCard.value = undefined
  searchOperatorId.value = undefined
  resetQuery()
  loadStats()
}

// ===== 列表 =====
const columns: TableColumnsType = [
  { title: '球友', dataIndex: 'user', width: 220 },
  { title: '归属俱乐部', dataIndex: 'operatorName', width: 160 },
  { title: '是否持卡', dataIndex: 'hasCard', width: 100 },
  { title: '注册时间', dataIndex: 'createdAt', width: 170 },
  { title: '最后登录', dataIndex: 'lastLoginAt', width: 170 },
  { title: '订场次数', dataIndex: 'bookingCount', width: 100, align: 'right' },
  { title: '订场金额', dataIndex: 'bookingAmount', width: 130, align: 'right' },
  { title: '最近订场', dataIndex: 'lastBookingAt', width: 170 },
]

const {
  loading,
  dataList,
  queryParams,
  pagination,
  loadData: loadFriendList,
  refresh,
  resetQuery,
  handleTableChange,
} = useTable<FriendQuery, Friend>({
  fetchApi: getFriendList,
  initialQuery: { keyword: '', hasCard: undefined, operatorId: undefined },
})

// 初始化加载
loadClubs()
loadFriendList()
loadStats()
</script>

<style scoped lang="scss">
// ===== 统计卡 =====
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  .stat-label {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 6px;
  }
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.2;
    &.text-primary { color: #059669; }
    &.text-accent { color: #0284c7; }
    &.text-success { color: #16a34a; }
  }
  .stat-sub {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 6px;
  }
}

// ===== 表格 =====
.sub-text {
  font-size: 12px;
  color: #999;
}
.text-muted {
  color: #94a3b8;
}
.balance-text {
  color: #059669;
  font-weight: 600;
  font-size: 15px;
}
</style>
