<template>
  <div class="page-container">
    <!-- 顶部统计卡 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">待处理</div>
        <div class="stat-value text-warn">{{ pendingCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已开票</div>
        <div class="stat-value text-success">{{ confirmedCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已驳回</div>
        <div class="stat-value text-danger">{{ rejectedCount }}</div>
      </div>
    </div>

    <!-- 开票申请列表 -->
    <div class="page-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <span class="section-title">充值开票申请</span>
          <a-select
            v-model:value="query.status"
            placeholder="状态"
            style="width: 130px"
            allow-clear
            :options="statusOptions"
            @change="handleSearch"
          />
          <a-input
            v-model:value="query.keyword"
            placeholder="抬头 / 申请人 / 手机号"
            style="width: 220px"
            allow-clear
            @press-enter="handleSearch"
            @change="handleKeywordChange"
          />
          <a-button @click="handleReset">重置</a-button>
        </div>
        <a-button @click="loadList">刷新</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="list"
        :loading="loading"
        row-key="id"
        :pagination="pagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'title'">
            <span class="apply-title">{{ record.title }}</span>
            <a-tag :color="record.invoiceType === 'COMPANY' ? 'blue' : 'default'" style="margin-left: 6px">
              {{ record.invoiceType === 'COMPANY' ? '企业' : '个人' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'amount'">
            <span class="amount-text">¥{{ Number(record.amount).toFixed(2) }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="statusTag(record.status).color">{{ statusTag(record.status).text }}</a-tag>
            <div v-if="record.status === 'REJECTED' && record.rejectReason" class="reject-reason">
              原因：{{ record.rejectReason }}
            </div>
            <div v-else-if="record.status === 'CONFIRMED' && record.invoiceNo" class="invoice-no">
              发票号：{{ record.invoiceNo }}
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <template v-if="record.status === 'PENDING'">
              <a-button type="link" size="small" @click="openConfirm(record)">确认开票</a-button>
              <a-button type="link" size="small" danger @click="openReject(record)">驳回</a-button>
            </template>
            <span v-else class="text-muted">已处理</span>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 确认开票 Modal -->
    <a-modal
      v-model:open="confirmOpen"
      title="确认开票"
      :confirm-loading="processing"
      width="460"
      @ok="submitConfirm"
    >
      <div class="confirm-content">
        <p class="confirm-tip">为 <b>{{ current?.userName || current?.userPhone || '该用户' }}</b> 的「{{ current?.title }}」开具发票</p>
        <p class="confirm-tip">开票金额：<span class="amount-text">¥{{ current ? Number(current.amount).toFixed(2) : '0.00' }}</span></p>
      </div>
      <a-form layout="vertical">
        <a-form-item label="发票号码" required>
          <a-input v-model:value="confirmForm.invoiceNo" placeholder="请输入发票号码" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 驳回 Modal -->
    <a-modal
      v-model:open="rejectOpen"
      title="驳回开票申请"
      :confirm-loading="processing"
      width="460"
      @ok="submitReject"
    >
      <a-form layout="vertical">
        <a-form-item label="驳回原因" required>
          <a-textarea v-model:value="rejectForm.rejectReason" placeholder="请输入驳回原因，将展示给用户" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import type { InvoiceApplyItem } from '@/types/models'
import { confirmInvoice, getInvoiceList } from '@/api/invoice'

// ===== 统计 =====
const pendingCount = ref(0)
const confirmedCount = ref(0)
const rejectedCount = ref(0)

// ===== 列表 =====
const loading = ref(false)
const list = ref<InvoiceApplyItem[]>([])
const query = reactive<{ status?: string, keyword?: string }>({})
const pagination = ref<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
})

const statusOptions = [
  { label: '待处理', value: 'PENDING' },
  { label: '已开票', value: 'CONFIRMED' },
  { label: '已驳回', value: 'REJECTED' },
]

const columns = [
  { title: '申请人', dataIndex: 'userName', width: 110 },
  { title: '手机号', dataIndex: 'userPhone', width: 130 },
  { title: '发票抬头', dataIndex: 'title', width: 220 },
  { title: '税号', dataIndex: 'taxNo', width: 160 },
  { title: '开票金额', dataIndex: 'amount', width: 110 },
  { title: '状态', dataIndex: 'status', width: 140 },
  { title: '申请时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', dataIndex: 'action', width: 160, fixed: 'right' },
]

function countStats(data: InvoiceApplyItem[]) {
  pendingCount.value = data.filter((d) => d.status === 'PENDING').length
  confirmedCount.value = data.filter((d) => d.status === 'CONFIRMED').length
  rejectedCount.value = data.filter((d) => d.status === 'REJECTED').length
}

async function loadList() {
  loading.value = true
  try {
    const res = await getInvoiceList({
      page: pagination.value.current,
      size: pagination.value.pageSize,
      status: query.status || undefined,
      keyword: query.keyword || undefined,
    })
    list.value = res.list || []
    pagination.value.total = res.total || 0
    countStats(list.value)
  } finally {
    loading.value = false
  }
}

function handleTableChange(p: TablePaginationConfig) {
  pagination.value.current = p.current
  pagination.value.pageSize = p.pageSize
  loadList()
}

function handleSearch() {
  pagination.value.current = 1
  loadList()
}

function handleKeywordChange() {
  if (!query.keyword) handleSearch()
}

function handleReset() {
  query.status = undefined
  query.keyword = undefined
  pagination.value.current = 1
  loadList()
}

// ===== 处理 =====
const confirmOpen = ref(false)
const rejectOpen = ref(false)
const processing = ref(false)
const current = ref<InvoiceApplyItem | null>(null)
const confirmForm = reactive<{ invoiceNo: string }>({ invoiceNo: '' })
const rejectForm = reactive<{ rejectReason: string }>({ rejectReason: '' })

function openConfirm(record: InvoiceApplyItem) {
  current.value = record
  confirmForm.invoiceNo = ''
  confirmOpen.value = true
}

function openReject(record: InvoiceApplyItem) {
  current.value = record
  rejectForm.rejectReason = ''
  rejectOpen.value = true
}

async function submitConfirm() {
  if (!confirmForm.invoiceNo.trim()) {
    message.warning('请填写发票号码')
    return
  }
  if (!current.value) return
  processing.value = true
  try {
    await confirmInvoice(current.value.id, {
      status: 'CONFIRMED',
      invoiceNo: confirmForm.invoiceNo.trim(),
    })
    message.success('已确认开票')
    confirmOpen.value = false
    loadList()
  } catch {
    // 错误提示由拦截器统一处理
  } finally {
    processing.value = false
  }
}

async function submitReject() {
  if (!rejectForm.rejectReason.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  if (!current.value) return
  processing.value = true
  try {
    await confirmInvoice(current.value.id, {
      status: 'REJECTED',
      rejectReason: rejectForm.rejectReason.trim(),
    })
    message.success('已驳回')
    rejectOpen.value = false
    loadList()
  } catch {
    // 错误提示由拦截器统一处理
  } finally {
    processing.value = false
  }
}

// ===== 工具 =====
function statusTag(status: string): { text: string, color: string } {
  if (status === 'CONFIRMED') return { text: '已开票', color: 'green' }
  if (status === 'REJECTED') return { text: '已驳回', color: 'red' }
  return { text: '待处理', color: 'orange' }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped lang="scss">
// ===== 统计卡 =====
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
    &.text-warn { color: #d97706; }
    &.text-success { color: #16a34a; }
    &.text-danger { color: #dc2626; }
  }
}

.apply-title {
  font-weight: 600;
  color: #0f172a;
}

.amount-text {
  font-weight: 700;
  color: #0f172a;
}

.reject-reason {
  font-size: 12px;
  color: #dc2626;
  margin-top: 2px;
}

.invoice-no {
  font-size: 12px;
  color: #16a34a;
  margin-top: 2px;
}

.text-muted {
  color: #94a3b8;
}

.confirm-content {
  margin-bottom: 8px;
  .confirm-tip {
    font-size: 14px;
    color: #475569;
    margin-bottom: 6px;
  }
}
</style>
