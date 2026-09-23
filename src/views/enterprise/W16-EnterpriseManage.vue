<template>
  <div class="page-container">
    <!-- 顶部统计卡 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">企业客户总数</div>
        <div class="stat-value text-primary">{{ total }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">启用企业数</div>
        <div class="stat-value text-success">{{ activeCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">带折扣企业数</div>
        <div class="stat-value">{{ discountCount }}</div>
      </div>
    </div>

    <!-- 企业列表 -->
    <div class="page-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <span class="section-title">企业客户档案</span>
          <a-input
            v-model:value="query.keyword"
            placeholder="企业名称 / 对接人 / 手机号"
            style="width: 220px"
            allow-clear
            @press-enter="handleSearch"
            @change="handleKeywordChange"
          />
          <a-select
            v-if="isSuperAdmin"
            v-model:value="query.operatorId"
            placeholder="归属俱乐部"
            style="width: 180px"
            allow-clear
            :options="operatorOptions"
            @change="loadList"
          />
          <a-button @click="handleReset">重置</a-button>
        </div>
        <a-button type="primary" @click="openCreate">
          <plus-outlined />
          新增企业
        </a-button>
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
          <template v-if="column.dataIndex === 'name'">
            <span class="enterprise-name">{{ record.name }}</span>
            <a-tag v-if="record.status === 0" color="default" style="margin-left: 6px">停用</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'discountRate'">
            <span v-if="record.discountRate != null" class="text-success">{{ formatDiscount(record.discountRate) }}</span>
            <span v-else class="text-muted">无折扣</span>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-switch
              :checked="record.status === 1"
              checked-children="启用"
              un-checked-children="停用"
              @change="(c: boolean | string) => handleStatusChange(record, c)"
            />
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
            <a-popconfirm title="确认删除该企业？关联订单将保留企业名称快照" @confirm="removeEnterprise(record)">
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新增/编辑企业 Modal -->
    <a-modal
      v-model:open="formModalOpen"
      :title="isEdit ? '编辑企业' : '新增企业'"
      :confirm-loading="submitting"
      :width="520"
      @ok="submitForm"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item v-if="isSuperAdmin" label="归属俱乐部" name="operatorId">
          <a-select
            v-model:value="form.operatorId"
            placeholder="选择归属俱乐部"
            :options="operatorOptions"
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
        <a-form-item label="企业名称" name="name">
          <a-input v-model:value="form.name" placeholder="企业全称" />
        </a-form-item>
        <a-form-item label="对接人姓名" name="contactName">
          <a-input v-model:value="form.contactName" placeholder="必填" />
        </a-form-item>
        <a-form-item label="对接手机号" name="contactPhone">
          <a-input v-model:value="form.contactPhone" placeholder="必填" maxlength="11" />
        </a-form-item>
        <a-form-item label="定场专属折扣" name="discountInput">
          <a-input-number
            v-model:value="form.discountInput"
            :min="0.1"
            :max="9.9"
            :precision="1"
            :step="0.5"
            style="width: 120px"
          />
          <span class="discount-suffix">折</span>
          <div class="discount-quick">
            <a-tag
              v-for="d in [9.5, 9, 8.5, 8]"
              :key="d"
              :color="form.discountInput === d ? 'green' : ''"
              class="discount-tag"
              @click="form.discountInput = d"
            >{{ d }}折</a-tag>
          </div>
          <div class="form-tip">留空表示无折扣；后台为该企业锁场时自动应用，与会员卡折扣取更优者生效</div>
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="form.remark" placeholder="选填，如 每周三晚 20:00 包场" :rows="2" />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group v-model:value="form.status">
            <a-radio :value="1">启用</a-radio>
            <a-radio :value="0">停用</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import type { PageResult } from '@/types/api'
import type { EnterpriseItem } from '@/types/models'
import {
  createEnterprise,
  deleteEnterprise,
  getEnterpriseList,
  toggleEnterpriseStatus,
  updateEnterprise,
  type EnterpriseSaveParams,
} from '@/api/enterprise'
import { getOperatorList } from '@/api/operator'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.roles.includes('super_admin'))

// ===== 统计 =====
const total = ref(0)
const activeCount = ref(0)
const discountCount = ref(0)

// ===== 列表 =====
const loading = ref(false)
const list = ref<EnterpriseItem[]>([])
const query = reactive<{ keyword?: string, operatorId?: string | number }>({})
const pagination = ref<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
})

const columns = [
  { title: '企业名称', dataIndex: 'name', width: 200 },
  { title: '对接人', dataIndex: 'contactName', width: 110 },
  { title: '对接手机号', dataIndex: 'contactPhone', width: 130 },
  { title: '定场折扣', dataIndex: 'discountRate', width: 100 },
  { title: '归属俱乐部', dataIndex: 'operatorName', width: 160 },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '操作', dataIndex: 'action', width: 140, fixed: 'right' },
]

// 超管的俱乐部选择器
const operatorOptions = ref<{ label: string, value: string | number }[]>([])
async function loadOperators() {
  if (!isSuperAdmin.value) return
  try {
    const res = await getOperatorList({ page: 1, size: 200 })
    operatorOptions.value = (res.list || []).map((o: any) => ({
      label: o.companyName || o.contactName || `俱乐部${o.id}`,
      value: o.id,
    }))
  } catch {
    operatorOptions.value = []
  }
}

async function loadList() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.current,
      size: pagination.value.pageSize,
      keyword: query.keyword || undefined,
      operatorId: query.operatorId,
    }
    const res: PageResult<EnterpriseItem> = await getEnterpriseList(params)
    list.value = res.list || []
    pagination.value.total = res.total || 0
    total.value = res.total || 0
    activeCount.value = list.value.filter((e) => e.status === 1).length
    discountCount.value = list.value.filter((e) => e.discountRate != null).length
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
  // 输入后回车或失焦触发搜索
  if (!query.keyword) handleSearch()
}

function handleReset() {
  query.keyword = undefined
  query.operatorId = undefined
  pagination.value.current = 1
  loadList()
}

async function handleStatusChange(record: EnterpriseItem, checked: boolean | string) {
  const status = checked === true || checked === 'true' ? 1 : 0
  try {
    await toggleEnterpriseStatus(record.id, status as 1 | 0)
    record.status = status as 1 | 0
    message.success(status === 1 ? '已启用' : '已停用')
    loadList()
  } catch {
    // 错误提示由拦截器统一处理
  }
}

async function removeEnterprise(record: EnterpriseItem) {
  try {
    await deleteEnterprise(record.id)
    message.success('已删除')
    loadList()
  } catch {
    // 错误提示由拦截器统一处理
  }
}

// ===== 新增/编辑 =====
const formModalOpen = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const editId = ref<string | number>()

interface FormState {
  operatorId?: string | number
  name: string
  contactName?: string
  contactPhone?: string
  /** 定场专属折扣, 单位"折"(如 9.5 = 9.5折), 提交时换算成折扣率 /10 */
  discountInput?: number
  remark?: string
  status: 1 | 0
}

const form = reactive<FormState>({
  name: '',
  status: 1,
})

const rules = {
  name: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  contactName: [{ required: true, message: '请输入对接人姓名', trigger: 'blur' }],
  contactPhone: [
    { required: true, message: '请输入对接手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  operatorId: [{ required: true, message: '请选择归属俱乐部', trigger: 'change' }],
}

function resetForm() {
  form.operatorId = undefined
  form.name = ''
  form.contactName = undefined
  form.contactPhone = undefined
  form.discountInput = undefined
  form.remark = undefined
  form.status = 1
}

function openCreate() {
  isEdit.value = false
  resetForm()
  formModalOpen.value = true
}

function openEdit(record: EnterpriseItem) {
  isEdit.value = true
  editId.value = record.id
  form.operatorId = record.operatorId
  form.name = record.name
  form.contactName = record.contactName
  form.contactPhone = record.contactPhone
  form.discountInput = record.discountRate != null ? Number((record.discountRate * 10).toFixed(1)) : undefined
  form.remark = record.remark
  form.status = record.status === 0 ? 0 : 1
  formModalOpen.value = true
}

async function submitForm() {
  const payload: EnterpriseSaveParams = {
    operatorId: isSuperAdmin.value ? form.operatorId : undefined,
    name: form.name,
    contactName: form.contactName || undefined,
    contactPhone: form.contactPhone || undefined,
    // 折扣(折) → 折扣率: 9.5折 = 0.95
    discountRate: form.discountInput != null ? Number((form.discountInput / 10).toFixed(2)) : undefined,
    remark: form.remark || undefined,
    status: form.status,
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateEnterprise(editId.value!, payload)
      message.success('企业已更新')
    } else {
      await createEnterprise(payload)
      message.success('企业已新增')
    }
    formModalOpen.value = false
    loadList()
  } catch {
    // 错误提示由拦截器统一处理
  } finally {
    submitting.value = false
  }
}

// ===== 工具 =====
function formatDiscount(rate: number): string {
  if (rate == null || rate >= 1) return '无折扣'
  return `${Math.round(rate * 100) / 10}折`
}

onMounted(() => {
  loadOperators()
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
    &.text-primary { color: #059669; }
    &.text-success { color: #16a34a; }
  }
}

.enterprise-name {
  font-weight: 600;
  color: #0f172a;
}

.discount-suffix {
  margin-left: 4px;
  font-size: 13px;
  color: #334155;
}

.discount-quick {
  margin-top: 6px;
  .discount-tag {
    cursor: pointer;
    user-select: none;
    margin-right: 6px;
  }
}

.text-success {
  color: #16a34a;
  font-weight: 600;
}

.text-muted {
  color: #94a3b8;
}

.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>
