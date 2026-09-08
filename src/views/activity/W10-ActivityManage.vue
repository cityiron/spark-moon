<template>
  <div class="page-container">
    <div class="page-card">
      <!-- 筛选工具栏 -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <a-input
            v-model:value="filter.title"
            placeholder="活动标题"
            style="width: 180px"
            allow-clear
            @press-enter="handleSearch"
          />
          <a-select
            v-model:value="filter.activityType"
            placeholder="类型"
            style="width: 120px"
            allow-clear
            :options="activityTypeOptions"
            @change="handleSearch"
          />
          <a-select
            v-model:value="filter.status"
            placeholder="状态"
            style="width: 120px"
            allow-clear
            :options="statusOptions"
            @change="handleSearch"
          />
          <a-select
            v-model:value="filter.isVisible"
            placeholder="上下架"
            style="width: 120px"
            allow-clear
            :options="visibleOptions"
            @change="handleSearch"
          />
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            查询
          </a-button>
          <a-button @click="handleReset">重置</a-button>
        </div>
        <div class="table-toolbar-right">
          <a-button type="primary" @click="openCreate">
            <template #icon><PlusOutlined /></template>
            新增活动
          </a-button>
          <a-button style="margin-left: 8px" @click="table.refresh()">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </div>
      </div>

      <!-- 活动列表 -->
      <a-table
        :columns="columns"
        :data-source="table.dataList.value"
        :loading="table.loading.value"
        row-key="id"
        :pagination="table.pagination"
        :scroll="{ x: 1600 }"
        @change="table.handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'title'">
            <div class="title-cell">{{ record.title }}</div>
            <div class="sub-text" v-if="record.id">{{ record.id }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'activityType'">
            <a-tag :color="record.activityType === 'club' ? 'blue' : 'orange'">
              {{ record.activityType === 'club' ? '俱乐部活动' : '临时活动' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'time'">
            <div>{{ record.startDate || '-' }} {{ record.startTime || '' }}</div>
            <div class="sub-text" v-if="record.endTime">至 {{ record.endTime }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'players'">
            <span>{{ record.currentPlayers }} / {{ record.maxPlayers }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'amount'">
            <span v-if="record.feeType === 'free'" class="free-text">免费</span>
            <span v-else>¥ {{ fmtYuan(record.price) }}</span>
            <div class="sub-text">{{ feeTypeLabel(record.feeType) }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'operator'">
            <div>{{ record.operatorName || '-' }}</div>
            <div class="sub-text">{{ record.operatorPhone || '' }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === '报名中' ? 'green' : 'red'">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'isVisible'">
            <a-tag :color="record.isVisible ? 'green' : 'default'">
              {{ record.isVisible ? '上架' : '下架' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'createdAt'">
            <span class="sub-text">{{ record.createdAt || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="0">
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-popconfirm
                :title="record.isVisible ? '确认下架该活动？下架后小程序列表不再展示。' : '确认上架该活动？'"
                @confirm="handleToggleVisible(record)"
              >
                <a-button type="link" size="small">{{ record.isVisible ? '下架' : '上架' }}</a-button>
              </a-popconfirm>
              <a-popconfirm title="确认删除该活动？删除后不可恢复。" @confirm="handleDelete(record)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新增/编辑活动 Modal -->
    <a-modal
      v-model:open="formOpen"
      :title="editing ? '编辑活动' : '新增活动'"
      width="680"
      :confirm-loading="saving"
      :destroy-on-close="true"
      ok-text="保存"
      @ok="handleSave"
    >
      <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item v-if="isSuperAdmin" label="经营者" name="operatorId">
          <a-select
            v-model:value="form.operatorId"
            placeholder="请选择经营者"
            :options="operatorOptions"
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
        <a-form-item label="活动标题" name="title">
          <a-input v-model:value="form.title" placeholder="请输入活动标题" maxlength="64" />
        </a-form-item>
        <a-form-item label="活动类型" name="activityType">
          <a-radio-group v-model:value="form.activityType">
            <a-radio value="club">俱乐部活动</a-radio>
            <a-radio value="temp">临时活动</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="地点名称">
          <a-input v-model:value="form.venueName" placeholder="如：阳光羽毛球馆" maxlength="64" />
        </a-form-item>
        <a-form-item label="场地号">
          <a-input v-model:value="form.court" placeholder="如：1,2 号场（可留空）" maxlength="32" />
        </a-form-item>
        <a-form-item label="活动时间">
          <a-space :size="4" wrap>
            <a-date-picker v-model:value="form.startDate" value-format="YYYY-MM-DD" placeholder="开始日期" />
            <a-time-picker v-model:value="form.startTime" format="HH:mm" value-format="HH:mm" placeholder="开始时间" />
            <span class="sub-text">至</span>
            <a-date-picker v-model:value="form.endDate" value-format="YYYY-MM-DD" placeholder="结束日期" />
            <a-time-picker v-model:value="form.endTime" format="HH:mm" value-format="HH:mm" placeholder="结束时间" />
          </a-space>
        </a-form-item>
        <a-form-item label="报名截止">
          <a-space :size="4" wrap>
            <a-date-picker v-model:value="form.deadlineDate" value-format="YYYY-MM-DD" placeholder="截止日期" />
            <a-time-picker v-model:value="form.deadlineTime" format="HH:mm" value-format="HH:mm" placeholder="截止时间" />
          </a-space>
        </a-form-item>
        <a-form-item label="人数上限">
          <a-input-number v-model:value="form.maxParticipants" :min="0" :max="999" style="width: 160px" />
        </a-form-item>
        <a-form-item label="费用">
          <a-space :size="4" wrap>
            <a-select v-model:value="form.feeType" style="width: 110px" :options="feeTypeOptions" />
            <a-input-number
              v-if="form.feeType !== 'free'"
              v-model:value="form.feeAmount"
              :min="0"
              :precision="2"
              :step="1"
              style="width: 140px"
              placeholder="金额(元)"
            />
          </a-space>
        </a-form-item>
        <a-form-item label="优惠开关">
          <a-space :size="16">
            <a-switch v-model:checked="form.ladyDiscount" checked-children="女士" un-checked-children="关" />
            <a-switch v-model:checked="form.earlyBird" checked-children="早鸟" un-checked-children="关" />
          </a-space>
        </a-form-item>
        <a-form-item label="标签">
          <a-select
            v-model:value="form.tags"
            mode="tags"
            placeholder="输入后回车添加，如：双打"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="活动描述">
          <a-textarea v-model:value="form.description" :rows="3" placeholder="活动介绍" maxlength="2000" />
        </a-form-item>
        <a-form-item label="联系人">
          <a-space :size="4" wrap>
            <a-input v-model:value="form.contactName" placeholder="姓名" style="width: 120px" />
            <a-input v-model:value="form.contactPhone" placeholder="手机号" style="width: 140px" />
            <a-input v-model:value="form.contactWechat" placeholder="微信号" style="width: 140px" />
          </a-space>
        </a-form-item>
        <a-form-item label="上架状态">
          <a-switch v-model:checked="form.isVisible" checked-children="上架" un-checked-children="下架" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 活动详情 Modal（只读） -->
    <a-modal v-model:open="detailOpen" title="活动详情" width="720" :footer="null" :destroy-on-close="true">
      <a-descriptions v-if="detail" :column="2" bordered size="small" :label-style="{ width: '110px' }">
        <a-descriptions-item label="活动标题" :span="2">{{ detail.title }}</a-descriptions-item>
        <a-descriptions-item label="活动ID">{{ detail.id }}</a-descriptions-item>
        <a-descriptions-item label="活动类型">
          {{ detail.activityType === 'club' ? '俱乐部活动' : '临时活动' }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">{{ detail.status || '-' }}</a-descriptions-item>
        <a-descriptions-item label="上下架">
          <a-tag :color="detail.isVisible ? 'green' : 'default'">{{ detail.isVisible ? '上架' : '下架' }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="所属球馆">{{ detail.venueName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="场地号">{{ detail.court || '-' }}</a-descriptions-item>
        <a-descriptions-item label="详细地址" :span="2">{{ detail.venueAddress || '-' }}</a-descriptions-item>
        <a-descriptions-item label="活动时间">
          {{ fmtDateTime(detail.startDate, detail.startTime) }} ~ {{ fmtDateTime(detail.endDate, detail.endTime) }}
        </a-descriptions-item>
        <a-descriptions-item label="报名截止">{{ fmtDateTime(detail.deadlineDate, detail.deadlineTime) }}</a-descriptions-item>
        <a-descriptions-item label="已报/上限">{{ detail.currentPlayers }} / {{ detail.maxPlayers }}</a-descriptions-item>
        <a-descriptions-item label="费用">{{ feeLabel(detail) }}</a-descriptions-item>
        <a-descriptions-item label="优惠">{{ discountLabel(detail) }}</a-descriptions-item>
        <a-descriptions-item label="标签">{{ (detail.tags || []).join('、') || '-' }}</a-descriptions-item>
        <a-descriptions-item label="创建人">{{ detail.operatorName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="创建人电话">{{ detail.operatorPhone || '-' }}</a-descriptions-item>
        <a-descriptions-item label="联系人">{{ detail.contactName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="联系人电话">{{ detail.contactPhone || '-' }}</a-descriptions-item>
        <a-descriptions-item label="联系人微信">{{ detail.contactWechat || '-' }}</a-descriptions-item>
        <a-descriptions-item label="创建时间">{{ detail.createdAt || '-' }}</a-descriptions-item>
        <a-descriptions-item label="活动描述" :span="2">
          <span style="white-space: pre-wrap">{{ detail.description || '-' }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useTable } from '@/composables/useTable'
import { useAuthStore } from '@/stores/auth'
import { getOperatorList } from '@/api/operator'
import { getAllVenues } from '@/api/venue'
import {
  getActivityAdminList,
  createActivityAdmin,
  updateActivityAdmin,
  setActivityVisibility,
  deleteActivityAdmin,
  type ActivityAdminItem,
  type ActivityAdminQuery,
  type ActivityAdminSave,
} from '@/api/activity'

// ===== 下拉配置 =====
const activityTypeOptions = [
  { label: '俱乐部活动', value: 'club' },
  { label: '临时活动', value: 'temp' },
]
const statusOptions = [
  { label: '报名中', value: '报名中' },
  { label: '已满', value: '已满' },
]
const visibleOptions = [
  { label: '上架', value: true },
  { label: '下架', value: false },
]
const feeTypeOptions = [
  { label: '免费', value: 'free' },
  { label: '固定费用', value: 'fixed' },
  { label: 'AA制', value: 'aa' },
]

function feeTypeLabel(type: string) {
  if (type === 'free') return '免费'
  if (type === 'aa') return 'AA制'
  return '固定费用'
}

/** 后端金额为分，转为元 */
function fmtYuan(price: number) {
  return ((Number(price) || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

// ===== 活动详情弹窗 =====
const detailOpen = ref(false)
const detail = ref<ActivityAdminItem | null>(null)

function openDetail(record: ActivityAdminItem) {
  detail.value = record
  detailOpen.value = true
}

/** 日期 + 时间 → 可读字符串 */
function fmtDateTime(date?: string, time?: string) {
  if (!date) return '-'
  return time ? `${date} ${time}` : date
}

/** 费用展示 */
function feeLabel(d: ActivityAdminItem) {
  if (d.feeType === 'free') return '免费'
  if (d.feeType === 'aa') return 'AA制'
  return `¥ ${fmtYuan(d.price ?? d.feeAmount)}`
}

/** 优惠展示 */
function discountLabel(d: ActivityAdminItem) {
  const parts: string[] = []
  if (d.ladyDiscount) parts.push('女士优惠')
  if (d.earlyBird) parts.push('早鸟优惠')
  return parts.join('、') || '无'
}

// ===== 经营者下拉(super_admin 新增时指定) =====
const authStore = useAuthStore()
const isSuperAdmin = authStore.roles.includes('super_admin')
const operatorOptions = ref<{ label: string; value: string }[]>([])

async function loadOperators() {
  try {
    const res = await getOperatorList({ page: 1, size: 100 })
    operatorOptions.value = (res.list || []).map((o: { id: unknown; name?: string; companyName?: string }) => ({
      label: o.name || o.companyName || String(o.id),
      value: String(o.id),
    }))
  } catch {
    operatorOptions.value = []
  }
}

// ===== 球馆下拉 =====
const venueOptions = ref<{ label: string; value: string }[]>([])

async function loadVenues() {
  try {
    const list = await getAllVenues()
    venueOptions.value = (list || []).map((v: { id: unknown; name?: string }) => ({
      label: v.name || String(v.id),
      value: String(v.id),
    }))
  } catch {
    venueOptions.value = []
  }
}

// ===== 筛选条件 =====
const filter = reactive<{
  title?: string
  activityType?: string
  status?: string
  isVisible?: boolean
}>({
  title: undefined,
  activityType: undefined,
  status: undefined,
  isVisible: undefined,
})

// ===== 列表 =====
const table = useTable<ActivityAdminQuery, ActivityAdminItem>({
  fetchApi: getActivityAdminList,
  initialQuery: { page: 1, size: 10 },
})

function handleSearch() {
  Object.assign(table.queryParams, {
    title: filter.title,
    activityType: filter.activityType,
    status: filter.status,
    isVisible: filter.isVisible,
  })
  table.refresh()
}

function handleReset() {
  Object.assign(filter, { title: undefined, activityType: undefined, status: undefined, isVisible: undefined })
  table.resetQuery()
}

// ===== 表格列 =====
const columns = [
  { title: '活动', dataIndex: 'title', width: 240 },
  { title: '类型', dataIndex: 'activityType', width: 100 },
  { title: '场馆', dataIndex: 'venueName', ellipsis: true },
  { title: '活动时间', dataIndex: 'time', width: 180 },
  { title: '报名', dataIndex: 'players', width: 90 },
  { title: '费用', dataIndex: 'amount', width: 110 },
  { title: '创建人', dataIndex: 'operator', width: 150 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '上下架', dataIndex: 'isVisible', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', dataIndex: 'action', width: 230, fixed: 'right' },
]

// ===== 新增/编辑表单 =====
const formOpen = ref(false)
const editing = ref<ActivityAdminItem | null>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<ActivityAdminSave & { operatorId?: string }>({
  operatorId: undefined,
  venueId: undefined,
  title: '',
  activityType: 'club',
  court: '',
  venueName: '',
  startDate: undefined,
  startTime: undefined,
  endDate: undefined,
  endTime: undefined,
  deadlineDate: undefined,
  deadlineTime: undefined,
  maxParticipants: undefined,
  feeType: 'free',
  feeAmount: undefined,
  ladyDiscount: false,
  earlyBird: false,
  tags: [],
  description: '',
  contactName: '',
  contactPhone: '',
  contactWechat: '',
  isVisible: true,
  status: '报名中',
})

const rules = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  operatorId: [{ required: true, message: '请选择经营者', trigger: 'change' }],
  venueId: [{ required: true, message: '请选择所属球馆', trigger: 'change' }],
}

function openCreate() {
  editing.value = null
  Object.assign(form, {
    operatorId: undefined,
    venueId: undefined,
    title: '',
    activityType: 'club',
    court: '',
    venueName: '',
    startDate: undefined,
    startTime: undefined,
    endDate: undefined,
    endTime: undefined,
    deadlineDate: undefined,
    deadlineTime: undefined,
    maxParticipants: undefined,
    feeType: 'free',
    feeAmount: undefined,
    ladyDiscount: false,
    earlyBird: false,
    tags: [],
    description: '',
    contactName: '',
    contactPhone: '',
    contactWechat: '',
    isVisible: true,
    status: '报名中',
  })
  formOpen.value = true
}

function openEdit(record: ActivityAdminItem) {
  editing.value = record
  Object.assign(form, {
    operatorId: isSuperAdmin ? String(record.operatorId) : undefined,
    venueId: record.venueId ? String(record.venueId) : undefined,
    title: record.title,
    activityType: record.activityType || 'club',
    court: record.court || '',
    venueName: record.venueName || '',
    startDate: record.startDate || undefined,
    startTime: record.startTime || undefined,
    endDate: undefined,
    endTime: record.endTime || undefined,
    deadlineDate: undefined,
    deadlineTime: undefined,
    maxParticipants: record.maxPlayers,
    feeType: record.feeType || 'free',
    feeAmount: record.feeType === 'free' ? undefined : (Number(record.feeAmount) || 0) / 100,
    ladyDiscount: false,
    earlyBird: false,
    tags: [],
    description: '',
    contactName: '',
    contactPhone: '',
    contactWechat: '',
    isVisible: !!record.isVisible,
    status: record.status || '报名中',
  })
  formOpen.value = true
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  if (saving.value) return
  saving.value = true
  try {
    const payload: ActivityAdminSave = {
      operatorId: isSuperAdmin ? form.operatorId : undefined,
      title: (form.title || '').trim(),
      activityType: form.activityType || 'club',
      court: form.court,
      venueName: form.venueName,
      startDate: form.startDate,
      startTime: form.startTime,
      endDate: form.endDate,
      endTime: form.endTime,
      deadlineDate: form.deadlineDate,
      deadlineTime: form.deadlineTime,
      maxParticipants: form.maxParticipants,
      feeType: form.feeType || 'free',
      feeAmount: form.feeType === 'free' ? 0 : Number(form.feeAmount) || 0,
      ladyDiscount: !!form.ladyDiscount,
      earlyBird: !!form.earlyBird,
      tags: form.tags || [],
      description: form.description,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      contactWechat: form.contactWechat,
      isVisible: !!form.isVisible,
      status: form.status || '报名中',
    }
    if (editing.value) {
      await updateActivityAdmin(editing.value.id, payload)
      message.success('保存成功')
    } else {
      await createActivityAdmin(payload)
      message.success('新增成功')
    }
    formOpen.value = false
    table.refresh()
  }
  catch (e) {
    console.error('保存活动失败', e)
    message.error('保存失败，请重试')
  }
  finally {
    saving.value = false
  }
}

async function handleToggleVisible(record: ActivityAdminItem) {
  try {
    await setActivityVisibility(record.id, !record.isVisible)
    message.success(record.isVisible ? '已下架' : '已上架')
    table.loadData()
  }
  catch (e) {
    console.error('更新上下架失败', e)
    message.error('操作失败')
  }
}

async function handleDelete(record: ActivityAdminItem) {
  try {
    await deleteActivityAdmin(record.id)
    message.success('删除成功')
    table.loadData()
  }
  catch (e) {
    console.error('删除活动失败', e)
    message.error('删除失败')
  }
}

onMounted(() => {
  if (isSuperAdmin) loadOperators()
  loadVenues()
})
</script>

<style scoped>
.table-toolbar {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.table-toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.table-toolbar-right {
  display: flex;
  align-items: center;
}
.title-cell {
  font-weight: 600;
}
.sub-text {
  font-size: 12px;
  color: #999;
}
.free-text {
  color: #52c41a;
}
</style>
