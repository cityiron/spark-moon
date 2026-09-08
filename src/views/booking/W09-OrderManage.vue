<template>
  <div class="page-container">
    <div class="page-card">
      <!-- 筛选工具栏 -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <a-select
            v-model:value="filter.status"
            placeholder="状态"
            style="width: 120px"
            allow-clear
            :options="statusOptions"
            @change="handleSearch"
          />
          <a-select
            v-model:value="filter.venueId"
            placeholder="球馆"
            style="width: 160px"
            allow-clear
            :options="venueOptions"
            @change="handleSearch"
          />
          <a-range-picker
            v-model:value="dateRange"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :placeholder="['开始日期', '结束日期']"
            style="width: 260px"
            @change="handleSearch"
          />
          <a-input
            v-model:value="filter.keyword"
            placeholder="订单号 / 会员姓名 / 手机号"
            style="width: 220px"
            allow-clear
            @press-enter="handleSearch"
          />
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            查询
          </a-button>
          <a-button @click="handleReset">重置</a-button>
        </div>
        <div class="table-toolbar-right">
          <a-button @click="table.refresh()">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </div>
      </div>

      <!-- 订单列表 -->
      <a-table
        :columns="columns"
        :data-source="table.dataList.value"
        :loading="table.loading.value"
        row-key="id"
        :pagination="table.pagination"
        :scroll="{ x: 1520 }"
        @change="table.handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'orderNo'">
            <span class="order-no">{{ record.orderNo }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'orderType'">
            <a-tag :color="orderTypeColor(record.orderType)">{{ orderTypeLabel(record.orderType) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'timeSlots'">
            <span class="sub-text">{{ formatTimeSlots(record.timeSlots) || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'amount'">
            <span class="amount-text">¥ {{ fmtYuan(record.amount) }}</span>
            <div v-if="Number(record.discountAmount) > 0" class="sub-text">优惠 ¥ {{ fmtYuan(record.discountAmount) }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'paymentMethod'">
            {{ payMethodLabel(record.paymentMethod) }}
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'createdAt'">
            <span class="sub-text">{{ formatTime(record.createdAt) }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 订单详情 Modal -->
    <a-modal
      v-model:open="detailOpen"
      title="订单详情"
      :footer="null"
      width="520"
    >
      <a-descriptions v-if="currentOrder" :column="1" bordered size="small">
        <a-descriptions-item label="订单号">{{ currentOrder.orderNo }}</a-descriptions-item>
        <a-descriptions-item label="订单类型">
          <a-tag :color="orderTypeColor(currentOrder.orderType)">{{ orderTypeLabel(currentOrder.orderType) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="球馆">{{ currentOrder.venueName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="场地">{{ currentOrder.courtName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="会员">{{ currentOrder.memberName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="手机号">{{ currentOrder.memberPhone || '-' }}</a-descriptions-item>
        <a-descriptions-item label="预订日期">{{ currentOrder.date }}</a-descriptions-item>
        <a-descriptions-item label="时段">{{ formatTimeSlots(currentOrder.timeSlots) || '-' }}</a-descriptions-item>
        <a-descriptions-item label="原价">¥ {{ fmtYuan(currentOrder.originalAmount) }}</a-descriptions-item>
        <a-descriptions-item label="优惠">¥ {{ fmtYuan(currentOrder.discountAmount) }}</a-descriptions-item>
        <a-descriptions-item label="实付">¥ {{ fmtYuan(currentOrder.amount) }}</a-descriptions-item>
        <a-descriptions-item label="支付方式">{{ payMethodLabel(currentOrder.paymentMethod) }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="statusColor(currentOrder.status)">{{ statusLabel(currentOrder.status) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="下单时间">{{ formatTime(currentOrder.createdAt) }}</a-descriptions-item>
      </a-descriptions>
      <div v-if="currentOrder" style="text-align: right; margin-top: 16px">
        <a-popconfirm
          v-if="[0, 1].includes(currentOrder.status)"
          title="确认核销该订单？核销后订单将标记为已核销。"
          @confirm="handleVerify"
        >
          <a-button type="primary" style="margin-right: 8px" :loading="operating">核销</a-button>
        </a-popconfirm>
        <a-popconfirm
          v-if="[0, 1].includes(currentOrder.status)"
          title="确认取消该订单？取消后对应时段将被释放。"
          @confirm="handleCancel"
        >
          <a-button danger :loading="operating">取消订单</a-button>
        </a-popconfirm>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { useTable } from '@/composables/useTable'
import { getAllVenues } from '@/api/venue'
import { getOrders, adminCancelBooking, verifyBooking, type AdminOrderItem, type OrderQuery } from '@/api/booking'
import type { Venue } from '@/types/models'

// ===== 球馆下拉 =====
const venueOptions = ref<{ label: string; value: string | number }[]>([])

async function loadVenues() {
  try {
    const list = await getAllVenues()
    venueOptions.value = (list || []).map((v: Venue) => ({ label: v.name, value: v.id }))
  } catch {
    venueOptions.value = []
  }
}

// ===== 筛选条件 =====
const statusOptions = [
  { label: '待支付', value: 0 },
  { label: '已支付', value: 1 },
  { label: '已核销', value: 2 },
  { label: '已取消', value: 3 },
  { label: '未到场', value: 4 },
]

const filter = reactive<{
  status?: number
  venueId?: string | number
  keyword?: string
}>({
  status: undefined,
  venueId: undefined,
  keyword: undefined,
})

const dateRange = ref<[string, string] | null>(null)

// ===== 列表 =====
const table = useTable<OrderQuery, AdminOrderItem>({
  fetchApi: getOrders,
  initialQuery: { page: 1, size: 10 },
})

function handleSearch() {
  const [dateFrom, dateTo] = dateRange.value || []
  Object.assign(table.queryParams, {
    status: filter.status,
    venueId: filter.venueId,
    keyword: filter.keyword,
    dateFrom,
    dateTo,
  })
  table.refresh()
}

function handleReset() {
  Object.assign(filter, { status: undefined, venueId: undefined, keyword: undefined })
  dateRange.value = null
  Object.assign(table.queryParams, {
    status: undefined,
    venueId: undefined,
    keyword: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  })
  table.refresh()
}

// ===== 列配置 =====
const columns = [
  { title: '订单号', dataIndex: 'orderNo', width: 180 },
  { title: '类型', dataIndex: 'orderType', width: 90 },
  { title: '球馆', dataIndex: 'venueName', width: 140, ellipsis: true },
  { title: '场地', dataIndex: 'courtName', width: 100, ellipsis: true },
  { title: '会员', dataIndex: 'memberName', width: 100 },
  { title: '手机号', dataIndex: 'memberPhone', width: 130 },
  { title: '日期', dataIndex: 'date', width: 110 },
  { title: '时段', dataIndex: 'timeSlots', width: 160 },
  { title: '金额', dataIndex: 'amount', width: 110 },
  { title: '支付方式', dataIndex: 'paymentMethod', width: 90 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '下单时间', dataIndex: 'createdAt', width: 150 },
  { title: '操作', dataIndex: 'action', width: 70, fixed: 'right' as const },
]

// ===== 格式化 =====
/** 金额(分) → 元展示 */
function fmtYuan(v?: number | string): string {
  const n = Number(v)
  if (!v || Number.isNaN(n)) return '0.00'
  return (n / 100).toFixed(2)
}

function formatTimeSlots(json?: string): string {
  if (!json) return ''
  try {
    const list = JSON.parse(json) as { startTime: string, endTime: string }[]
    return list.map((s) => `${s.startTime}-${s.endTime}`).join('、')
  } catch {
    return ''
  }
}

function formatTime(t?: string): string {
  if (!t) return '-'
  return t.replace('T', ' ').slice(0, 19)
}

function statusLabel(s: number): string {
  const map: Record<number, string> = { 0: '待支付', 1: '已支付', 2: '已核销', 3: '已取消', 4: '未到场' }
  return map[s] ?? String(s)
}

function statusColor(s: number): string {
  const map: Record<number, string> = { 0: 'orange', 1: 'green', 2: 'blue', 3: 'red', 4: 'default' }
  return map[s] ?? 'default'
}

function orderTypeLabel(t?: string): string {
  const map: Record<string, string> = { BOOKING: '场地预订', PRODUCT: '商品', TRAINING: '培训', VIP: '会员卡' }
  return map[t ?? ''] ?? t ?? '-'
}

function orderTypeColor(t?: string): string {
  const map: Record<string, string> = { BOOKING: 'blue', PRODUCT: 'cyan', TRAINING: 'purple', VIP: 'gold' }
  return map[t ?? ''] ?? 'default'
}

function payMethodLabel(m?: string): string {
  const map: Record<string, string> = { CARD: '会员卡', WECHAT: '微信', ALIPAY: '支付宝', OFFLINE: '线下' }
  return map[m ?? ''] ?? m ?? '-'
}

// ===== 订单详情 / 核销 / 取消 =====
const detailOpen = ref(false)
const currentOrder = ref<AdminOrderItem | null>(null)
const operating = ref(false)

function openDetail(record: AdminOrderItem) {
  currentOrder.value = record
  detailOpen.value = true
}

async function handleVerify() {
  if (!currentOrder.value) return
  operating.value = true
  try {
    await verifyBooking(currentOrder.value.id)
    message.success('订单已核销')
    detailOpen.value = false
    table.loadData()
  } finally {
    operating.value = false
  }
}

async function handleCancel() {
  if (!currentOrder.value) return
  operating.value = true
  try {
    await adminCancelBooking(currentOrder.value.id)
    message.success('订单已取消')
    detailOpen.value = false
    table.loadData()
  } finally {
    operating.value = false
  }
}

onMounted(() => {
  loadVenues()
  table.loadData()
})
</script>

<style scoped lang="scss">
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.table-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.order-no {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
}
.amount-text {
  font-weight: 600;
  color: #d4380d;
}
.sub-text {
  color: #999;
  font-size: 12px;
}
</style>
