<template>
  <div class="page-container">
    <!-- 顶部工具栏 -->
    <div class="finance-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-label">统计月份</span>
        <a-date-picker
          v-model:value="selectedMonth"
          picker="month"
          format="YYYY-MM"
          value-format="YYYY-MM"
          :allow-clear="false"
          @change="onMonthChange"
        />
      </div>
      <a-button @click="handleExport">
        <template #icon><ExportOutlined /></template>
        导出报表
      </a-button>
    </div>

    <a-tabs v-model:activeKey="activeTab" @change="onTabChange">
      <!-- ============ Tab 1 收支概览 ============ -->
      <a-tab-pane key="overview" tab="收支概览">
        <!-- 统计卡 -->
        <div class="stats-row">
          <!-- 收入卡 -->
          <div class="stat-card stat-income">
            <div class="stat-label">收入</div>
            <div class="stat-value">¥ {{ formatFen(stats.totalIncome) }}</div>
            <div class="stat-change" :class="stats.incomeChange >= 0 ? 'up' : 'down'">
              <ArrowUpOutlined v-if="stats.incomeChange >= 0" />
              <ArrowDownOutlined v-else />
              环比 {{ Math.abs(stats.incomeChange).toFixed(1) }}%
            </div>
          </div>
          <!-- 支出卡 -->
          <div class="stat-card stat-expense">
            <div class="stat-label">支出</div>
            <div class="stat-value">¥ {{ formatFen(stats.totalExpense) }}</div>
            <div class="stat-change" :class="stats.expenseChange >= 0 ? 'down' : 'up'">
              <ArrowUpOutlined v-if="stats.expenseChange >= 0" />
              <ArrowDownOutlined v-else />
              环比 {{ Math.abs(stats.expenseChange).toFixed(1) }}%
            </div>
          </div>
          <!-- 净利润卡 -->
          <div class="stat-card stat-profit">
            <div class="stat-label">净利润</div>
            <div class="stat-value">¥ {{ formatFen(stats.netProfit) }}</div>
            <div class="stat-change up">利润率 {{ stats.profitRatio.toFixed(1) }}%</div>
          </div>
          <!-- 支出占比卡 -->
          <div class="stat-card stat-ratio">
            <div class="stat-label">支出占比</div>
            <div class="stat-value">{{ stats.expenseRatio.toFixed(1) }}%</div>
            <div class="stat-change" :style="{ color: expenseHealth.color }">
              {{ expenseHealth.text }}
            </div>
          </div>
        </div>

        <!-- 月度收支柱状图 -->
        <div class="page-card">
          <div class="card-header">
            <span class="card-title">月度收支趋势</span>
            <div class="chart-legend">
              <span class="legend-item"><i class="dot dot-income"></i>收入</span>
              <span class="legend-item"><i class="dot dot-expense"></i>支出</span>
            </div>
          </div>
          <a-spin :spinning="monthlyLoading">
            <div v-if="monthlyData.length" class="chart-body">
              <div class="chart-bars">
                <div v-for="m in monthlyData" :key="m.month" class="bar-group">
                  <div class="bar-area">
                    <div class="bar bar-income" :style="{ height: barHeight(m.income) }">
                      <span class="bar-tooltip">{{ m.month }}<br />收入: ¥{{ formatFen(m.income) }}</span>
                    </div>
                    <div class="bar bar-expense" :style="{ height: barHeight(m.expense) }">
                      <span class="bar-tooltip">{{ m.month }}<br />支出: ¥{{ formatFen(m.expense) }}</span>
                    </div>
                  </div>
                  <div class="bar-label">{{ m.month.slice(5) }}月</div>
                </div>
              </div>
            </div>
            <a-empty v-else description="暂无数据" style="padding: 40px 0" />
          </a-spin>
        </div>

        <!-- 球馆收支汇总 -->
        <div class="page-card">
          <div class="card-header"><span class="card-title">球馆收支汇总</span></div>
          <a-table
            :columns="venueColumns"
            :data-source="venueSummary"
            :loading="venueLoading"
            row-key="venueId"
            :pagination="false"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="['booking', 'course', 'membership', 'other', 'total'].includes(column.dataIndex)">
                ¥ {{ formatFen(record[column.dataIndex]) }}
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ Tab 2 收支明细 ============ -->
      <a-tab-pane key="detail" tab="收支明细">
        <div class="page-card">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <a-select
                v-model:value="detailFilter.type"
                placeholder="类型"
                style="width: 120px"
                allow-clear
                :options="typeOptions"
                @change="onDetailTypeChange"
              />
              <a-select
                v-model:value="detailFilter.category"
                placeholder="类别"
                style="width: 140px"
                allow-clear
                :options="detailCategoryOptions"
                @change="onDetailSearch"
              />
              <a-select
                v-model:value="detailFilter.venueId"
                placeholder="球馆"
                style="width: 160px"
                allow-clear
                :options="venueOptions"
                @change="onDetailSearch"
              />
              <a-button @click="resetDetailFilter">重置</a-button>
            </div>
          </div>
          <a-table
            :columns="detailColumns"
            :data-source="detailTable.dataList.value"
            :loading="detailTable.loading.value"
            row-key="id"
            :pagination="detailTable.pagination"
            @change="detailTable.handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'category'">
                <a-tag :color="record.type === 'income' ? 'green' : 'red'">
                  {{ categoryLabel(record.type, record.category) }}
                </a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'amount'">
                <span :class="record.type === 'income' ? 'amount-income' : 'amount-expense'">
                  ¥ {{ formatFen(record.amount) }}
                </span>
              </template>
              <template v-else-if="column.dataIndex === 'remark'">
                <span class="sub-text">{{ record.remark || '-' }}</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ Tab 3 支出记录 ============ -->
      <a-tab-pane key="expense" tab="支出记录">
        <div class="page-card">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <a-select
                v-model:value="expenseFilter.category"
                placeholder="支出类别"
                style="width: 140px"
                allow-clear
                :options="expenseCategoryOptions"
                @change="onExpenseSearch"
              />
              <a-select
                v-model:value="expenseFilter.venueId"
                placeholder="球馆"
                style="width: 160px"
                allow-clear
                :options="venueOptions"
                @change="onExpenseSearch"
              />
              <a-button @click="resetExpenseFilter">重置</a-button>
            </div>
            <a-button type="primary" @click="openCreateExpense">
              <PlusOutlined />
              新增支出
            </a-button>
          </div>
          <a-table
            :columns="expenseColumns"
            :data-source="expenseTable.dataList.value"
            :loading="expenseTable.loading.value"
            row-key="id"
            :pagination="expenseTable.pagination"
            :scroll="{ x: 900 }"
            @change="expenseTable.handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'category'">
                <a-tag color="red">{{ categoryLabel('expense', record.category) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'amount'">
                <span class="amount-expense">¥ {{ formatFen(record.amount) }}</span>
              </template>
              <template v-else-if="column.dataIndex === 'remark'">
                <span class="sub-text">{{ record.remark || '-' }}</span>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-space>
                  <a @click="openEditExpense(record)"><EditOutlined /> 编辑</a>
                  <a-divider type="vertical" />
                  <a-popconfirm title="确认删除该支出记录?" @confirm="confirmDeleteExpense(record)">
                    <a class="danger-link"><DeleteOutlined /> 删除</a>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 新增/编辑支出 Modal -->
    <a-modal
      v-model:open="expenseModalOpen"
      :title="expenseEditing ? '编辑支出' : '新增支出'"
      :confirm-loading="submitting"
      :width="520"
      @ok="submitExpense"
    >
      <a-form ref="expenseFormRef" :model="expenseForm" :rules="expenseRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="支出日期" name="recordDate">
              <a-date-picker
                v-model:value="expenseForm.recordDate"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="支出类别" name="category">
              <a-select v-model:value="expenseForm.category" :options="expenseCategoryOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="金额(元)" name="amount">
              <a-input-number
                v-model:value="expenseForm.amount"
                :min="0"
                :step="100"
                style="width: 100%"
                placeholder="请输入金额"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="球馆" name="venueId">
              <a-select
                v-model:value="expenseForm.venueId"
                :options="venueOptions"
                placeholder="选择球馆"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="经办人" name="operator">
          <a-input v-model:value="expenseForm.operator" placeholder="请输入经办人" />
        </a-form-item>
        <a-form-item label="说明" name="remark">
          <a-textarea v-model:value="expenseForm.remark" :rows="2" placeholder="支出说明" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message, type FormInstance, type TableColumnsType } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { useTable } from '@/composables/useTable'
import { getAllVenues } from '@/api/venue'
import {
  getFinanceStats,
  getMonthlyFinance,
  getVenueFinanceSummary,
  getFinanceRecords,
  createFinanceRecord,
  updateFinanceRecord,
  deleteFinanceRecord,
  type FinanceQuery,
  type FinanceRecordPayload,
} from '@/api/finance'
import type {
  FinanceRecord,
  FinanceStats,
  MonthlyFinance,
  VenueFinanceSummary,
  FinanceEntryType,
  IncomeCategory,
  ExpenseCategory,
} from '@/types/models'

// ===== 工具 =====
/** 分转元, 保留两位小数 */
function formatFen(fen: number | undefined): string {
  if (fen === undefined || fen === null) return '0.00'
  return (fen / 100).toFixed(2)
}

// ===== 映射 =====
const typeOptions = [
  { label: '收入', value: 'income' },
  { label: '支出', value: 'expense' },
]

const incomeCategoryOptions = [
  { label: '场地预订', value: 'booking' },
  { label: '培训课程', value: 'course' },
  { label: '会员卡', value: 'membership' },
  { label: 'VIP权益', value: 'vip' },
  { label: '其他', value: 'other' },
]

const expenseCategoryOptions = [
  { label: '租金', value: 'rent' },
  { label: '工资', value: 'salary' },
  { label: '水电', value: 'utility' },
  { label: '维护', value: 'maintenance' },
  { label: '营销', value: 'marketing' },
  { label: '其他', value: 'other' },
]

function categoryLabel(
  type: FinanceEntryType | undefined,
  category: IncomeCategory | ExpenseCategory,
): string {
  const opts = type === 'income'
    ? incomeCategoryOptions
    : type === 'expense'
      ? expenseCategoryOptions
      : [...incomeCategoryOptions, ...expenseCategoryOptions]
  return opts.find((o) => o.value === category)?.label || String(category)
}

// ===== 球馆下拉 =====
const venueOptions = ref<{ label: string, value: string | number }[]>([])
async function loadVenues() {
  try {
    const list = await getAllVenues()
    venueOptions.value = (list || []).map((v) => ({ label: v.name, value: v.id }))
  } catch {
    venueOptions.value = []
  }
}

// ===== 月份与导出 =====
const selectedMonth = ref<string>(dayjs().format('YYYY-MM'))

function handleExport() {
  message.info('功能开发中')
}

// ===== 概览统计 =====
const stats = reactive<FinanceStats>({
  totalIncome: 0,
  totalExpense: 0,
  netProfit: 0,
  expenseRatio: 0,
  incomeChange: 0,
  expenseChange: 0,
  profitRatio: 0,
})
const statsLoading = ref(false)

const expenseHealth = computed<{ text: string, color: string }>(() => {
  const r = stats.expenseRatio
  if (r < 60) return { text: '健康', color: '#16a34a' }
  if (r < 80) return { text: '注意', color: '#f59e0b' }
  return { text: '警戒', color: '#ef4444' }
})

async function loadStats() {
  statsLoading.value = true
  try {
    const data = await getFinanceStats(selectedMonth.value || undefined)
    Object.assign(stats, data)
  } catch {
    // 静默失败, 保持 0
  } finally {
    statsLoading.value = false
  }
}

// ===== 月度柱状图 =====
const monthlyData = ref<MonthlyFinance[]>([])
const monthlyLoading = ref(false)

const CHART_MAX_HEIGHT = 200
const maxChartValue = computed(() => {
  let max = 0
  monthlyData.value.forEach((m) => {
    if (m.income > max) max = m.income
    if (m.expense > max) max = m.expense
  })
  return max || 1
})

function barHeight(v: number): string {
  if (!v) return '0px'
  const h = (v / maxChartValue.value) * CHART_MAX_HEIGHT
  return `${Math.max(h, 4)}px`
}

async function loadMonthly() {
  monthlyLoading.value = true
  try {
    monthlyData.value = (await getMonthlyFinance()) || []
  } catch {
    monthlyData.value = []
  } finally {
    monthlyLoading.value = false
  }
}

// ===== 球馆收支汇总 =====
const venueSummary = ref<VenueFinanceSummary[]>([])
const venueLoading = ref(false)
const venueColumns: TableColumnsType = [
  { title: '球馆', dataIndex: 'venueName' },
  { title: '场地预订', dataIndex: 'booking', align: 'right' },
  { title: '培训课程', dataIndex: 'course', align: 'right' },
  { title: '会员卡', dataIndex: 'membership', align: 'right' },
  { title: '其他', dataIndex: 'other', align: 'right' },
  { title: '合计', dataIndex: 'total', align: 'right' },
]

async function loadVenueSummary() {
  venueLoading.value = true
  try {
    venueSummary.value = (await getVenueFinanceSummary(selectedMonth.value || undefined)) || []
  } catch {
    venueSummary.value = []
  } finally {
    venueLoading.value = false
  }
}

function loadOverview() {
  loadStats()
  loadVenueSummary()
}

function onMonthChange() {
  loadOverview()
  if (activeTab.value === 'detail') onDetailSearch()
  else if (activeTab.value === 'expense') onExpenseSearch()
}

// ===== Tab 切换 =====
const activeTab = ref('overview')

function onTabChange(key: string) {
  if (key === 'detail') onDetailSearch()
  else if (key === 'expense') onExpenseSearch()
}

// ===== Tab 2 收支明细 =====
const detailColumns: TableColumnsType = [
  { title: '日期', dataIndex: 'recordDate', width: 120 },
  { title: '类别', dataIndex: 'category', width: 120 },
  { title: '金额', dataIndex: 'amount', width: 120, align: 'right' },
  { title: '球馆', dataIndex: 'venueName', width: 140 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
  { title: '经办人', dataIndex: 'operator', width: 100 },
]

const detailFilter = reactive<{
  type?: FinanceEntryType
  category?: IncomeCategory | ExpenseCategory
  venueId?: string | number
}>({
  type: undefined,
  category: undefined,
  venueId: undefined,
})

const detailCategoryOptions = computed(() => {
  if (detailFilter.type === 'income') return incomeCategoryOptions
  if (detailFilter.type === 'expense') return expenseCategoryOptions
  return [...incomeCategoryOptions, ...expenseCategoryOptions]
})

const detailTable = useTable<FinanceQuery, FinanceRecord>({
  fetchApi: getFinanceRecords,
  initialQuery: { type: undefined, category: undefined, venueId: undefined, month: undefined },
})

function onDetailTypeChange() {
  // 类型切换后清空类别, 避免与类型不匹配
  detailFilter.category = undefined
  onDetailSearch()
}

function onDetailSearch() {
  detailTable.queryParams.type = detailFilter.type
  detailTable.queryParams.category = detailFilter.category
  detailTable.queryParams.venueId = detailFilter.venueId
  detailTable.queryParams.month = selectedMonth.value || undefined
  detailTable.refresh()
}

function resetDetailFilter() {
  detailFilter.type = undefined
  detailFilter.category = undefined
  detailFilter.venueId = undefined
  onDetailSearch()
}

// ===== Tab 3 支出记录 =====
const expenseColumns: TableColumnsType = [
  { title: '日期', dataIndex: 'recordDate', width: 120 },
  { title: '支出类别', dataIndex: 'category', width: 120 },
  { title: '金额', dataIndex: 'amount', width: 120, align: 'right' },
  { title: '球馆', dataIndex: 'venueName', width: 140 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
  { title: '经办人', dataIndex: 'operator', width: 100 },
  { title: '操作', dataIndex: 'action', width: 150, fixed: 'right' },
]

const expenseFilter = reactive<{
  category?: ExpenseCategory
  venueId?: string | number
}>({
  category: undefined,
  venueId: undefined,
})

const expenseTable = useTable<FinanceQuery, FinanceRecord>({
  fetchApi: getFinanceRecords,
  initialQuery: { type: 'expense', category: undefined, venueId: undefined, month: undefined },
})

function onExpenseSearch() {
  expenseTable.queryParams.category = expenseFilter.category
  expenseTable.queryParams.venueId = expenseFilter.venueId
  expenseTable.queryParams.month = selectedMonth.value || undefined
  expenseTable.refresh()
}

function resetExpenseFilter() {
  expenseFilter.category = undefined
  expenseFilter.venueId = undefined
  onExpenseSearch()
}

// ===== 新增/编辑支出 =====
const expenseModalOpen = ref(false)
const expenseEditing = ref(false)
const expenseEditingId = ref<string | number>(0)
const expenseFormRef = ref<FormInstance>()
const submitting = ref(false)
const expenseForm = reactive<{
  recordDate: string
  category: ExpenseCategory
  amount: number
  venueId?: string | number
  operator: string
  remark: string
}>({
  recordDate: dayjs().format('YYYY-MM-DD'),
  category: 'rent',
  amount: 0,
  venueId: undefined,
  operator: '',
  remark: '',
})
const expenseRules = {
  recordDate: [{ required: true, message: '请选择支出日期', trigger: 'change' }],
  category: [{ required: true, message: '请选择支出类别', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', type: 'number' as const, min: 0.01, trigger: 'blur' }],
}

function openCreateExpense() {
  expenseEditing.value = false
  expenseEditingId.value = 0
  Object.assign(expenseForm, {
    recordDate: dayjs().format('YYYY-MM-DD'),
    category: 'rent',
    amount: 0,
    venueId: undefined,
    operator: '',
    remark: '',
  })
  expenseModalOpen.value = true
}

function openEditExpense(record: FinanceRecord) {
  expenseEditing.value = true
  expenseEditingId.value = record.id
  Object.assign(expenseForm, {
    recordDate: record.recordDate,
    category: record.category as ExpenseCategory,
    amount: record.amount / 100,
    venueId: record.venueId,
    operator: record.operator || '',
    remark: record.remark || '',
  })
  expenseModalOpen.value = true
}

async function submitExpense() {
  await expenseFormRef.value?.validate()
  const payload: FinanceRecordPayload = {
    type: 'expense',
    category: expenseForm.category,
    amount: Math.round(expenseForm.amount * 100),
    venueId: expenseForm.venueId,
    recordDate: expenseForm.recordDate,
    operator: expenseForm.operator || undefined,
    remark: expenseForm.remark || undefined,
  }
  submitting.value = true
  try {
    if (expenseEditing.value) {
      await updateFinanceRecord(expenseEditingId.value, payload)
      message.success('支出更新成功')
    } else {
      await createFinanceRecord(payload)
      message.success('支出新增成功')
    }
    expenseModalOpen.value = false
    expenseTable.refresh()
    loadOverview()
  } finally {
    submitting.value = false
  }
}

async function confirmDeleteExpense(record: FinanceRecord) {
  await deleteFinanceRecord(record.id)
  message.success('删除成功')
  expenseTable.refresh()
  loadOverview()
}

// ===== 初始化 =====
loadVenues()
loadOverview()
loadMonthly()
</script>

<style scoped lang="scss">
// ===== 工具栏 =====
.finance-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .toolbar-label {
    font-size: 14px;
    color: #475569;
  }
}

// ===== 统计卡 (原型 border-left 样式) =====
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
  }
  .stat-change {
    margin-top: 6px;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    &.up {
      color: #16a34a;
    }
    &.down {
      color: #ef4444;
    }
  }
}
.stat-income {
  border-left: 4px solid #16a34a;
}
.stat-expense {
  border-left: 4px solid #ef4444;
}
.stat-profit {
  border-left: 4px solid #0284c7;
}
.stat-ratio {
  border-left: 4px solid #f59e0b;
}

// ===== 通用卡片 =====
.page-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  .card-title {
    font-size: 15px;
    font-weight: 600;
    color: #0f172a;
  }
  .chart-legend {
    display: flex;
    gap: 16px;
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #64748b;
    }
    .dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }
    .dot-income {
      background: #16a34a;
    }
    .dot-expense {
      background: #ef4444;
    }
  }
}

// ===== 柱状图 =====
.chart-body {
  width: 100%;
}
.chart-bars {
  display: flex;
  align-items: stretch;
  height: 240px;
  padding-top: 20px;
}
.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}
.bar-area {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  width: 100%;
}
.bar {
  width: 26px;
  min-height: 0;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
  position: relative;
  cursor: pointer;
  &:hover {
    opacity: 0.85;
  }
}
.bar-income {
  background: #16a34a;
}
.bar-expense {
  background: #ef4444;
}
.bar-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  font-size: 12px;
  line-height: 1.5;
  padding: 6px 10px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s;
  pointer-events: none;
  z-index: 10;
}
.bar:hover .bar-tooltip {
  opacity: 1;
  visibility: visible;
}
.bar-label {
  height: 24px;
  line-height: 24px;
  font-size: 12px;
  color: #64748b;
  text-align: center;
}

// ===== 表格工具栏 =====
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  .table-toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}

// ===== 表格内文字 =====
.sub-text {
  font-size: 12px;
  color: #94a3b8;
}
.amount-income {
  color: #16a34a;
  font-weight: 600;
}
.amount-expense {
  color: #ef4444;
  font-weight: 600;
}
.danger-link {
  color: #ef4444;
}
</style>
