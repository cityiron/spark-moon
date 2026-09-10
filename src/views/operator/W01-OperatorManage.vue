<template>
  <div class="page-container">
    <!-- 顶部统计卡 -->
    <div class="stats-row" :class="{ 'stats-single': !isSuperAdmin }">
      <div v-if="isSuperAdmin" class="stat-card">
        <div class="stat-label">待审核申请</div>
        <div class="stat-value text-warning">{{ stats.pendingCount }}</div>
      </div>
      <div v-if="isSuperAdmin" class="stat-card">
        <div class="stat-label">已通过经营者</div>
        <div class="stat-value text-primary">{{ stats.approvedCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已创建账号</div>
        <div class="stat-value">{{ stats.accountCount }}</div>
      </div>
      <div v-if="isSuperAdmin" class="stat-card">
        <div class="stat-label">已配置商户号</div>
        <div class="stat-value text-success">{{ stats.mchConfiguredCount }}</div>
      </div>
    </div>

    <div class="page-card">
      <a-tabs v-model:activeKey="tab" type="card">
        <!-- ========== Tab 1: 入驻申请审核 (仅平台超管) ========== -->
        <a-tab-pane v-if="isSuperAdmin" key="application" tab="入驻申请">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <a-input-search
                v-model:value="appQuery.keyword"
                placeholder="公司名 / 联系人 / 手机号"
                style="width: 260px"
                allow-clear
                @search="reloadApplications"
              />
              <a-select
                v-model:value="appQuery.status"
                placeholder="审核状态"
                style="width: 140px"
                allow-clear
                :options="statusOptions"
                @change="reloadApplications"
              />
              <a-button @click="resetAppQuery">重置</a-button>
            </div>
          </div>

          <a-table
            :columns="appColumns"
            :data-source="applications"
            :loading="appLoading"
            row-key="id"
            :pagination="appPagination"
            :scroll="{ x: 1130 }"
            @change="onAppTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'companyName'">
                <div class="company-cell">
                  <div class="company-name">{{ record.companyName }}</div>
                  <div class="sub-text">{{ record.licenseNo }}</div>
                </div>
              </template>
              <template v-else-if="column.dataIndex === 'contact'">
                <div>{{ record.contactName }}</div>
                <div class="sub-text">{{ record.contactPhone }}</div>
              </template>
              <template v-else-if="column.dataIndex === 'venue'">
                <div>{{ record.venueName }}</div>
                <div class="sub-text">{{ record.venueAddress }}</div>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'mchStatus'">
                <a-tag v-if="record.mchStatus === 'verified'" color="success">已验证</a-tag>
                <a-tag v-else-if="record.mchStatus === 'configured'" color="processing">已配置</a-tag>
                <a-tag v-else color="default">未配置</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-space>
                  <a @click="viewApplication(record)">详情</a>
                  <a v-if="record.status === 'pending'" @click="openApproveModal(record)">通过</a>
                  <a v-if="record.status === 'pending'" class="text-danger" @click="openRejectModal(record)">驳回</a>
                  <a v-if="record.status === 'approved' && record.mchStatus !== 'verified'" @click="openMchModal(record)">配置商户号</a>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- ========== Tab 2: 账号管理 ========== -->
        <a-tab-pane key="account" tab="账号管理">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <a-input-search
                v-model:value="accQuery.keyword"
                placeholder="用户名 / 昵称 / 手机号"
                style="width: 260px"
                allow-clear
                @search="reloadAccounts"
              />
              <a-select
                v-model:value="accQuery.role"
                placeholder="角色"
                style="width: 140px"
                allow-clear
                :options="roleOptions"
                @change="reloadAccounts"
              />
              <a-select
                v-model:value="accQuery.status"
                placeholder="状态"
                style="width: 120px"
                allow-clear
                :options="accountStatusOptions"
                @change="reloadAccounts"
              />
              <a-button @click="resetAccQuery">重置</a-button>
            </div>
            <a-button v-if="canCreateAccount" type="primary" @click="openCreateAccount">
              <plus-outlined />
              新建账号
            </a-button>
          </div>

          <a-table
            :columns="accColumns"
            :data-source="accounts"
            :loading="accLoading"
            row-key="id"
            :pagination="accPagination"
            :scroll="{ x: 1180 }"
            @change="onAccTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'username'">
                <div>{{ record.nickname }}</div>
                <div class="sub-text">{{ record.username }}</div>
              </template>
              <template v-else-if="column.dataIndex === 'role'">
                <a-tag :color="roleColor(record.role)">{{ roleLabel(record.role) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'venues'">
                <a-tooltip :title="record.venueNames?.join('、')">
                  <span>{{ record.venueNames?.length || 0 }} 个球馆</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="record.status === 'active' ? 'success' : 'default'">
                  {{ record.status === 'active' ? '启用' : '禁用' }}
                </a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <!-- 超级管理员为平台内置账号, 不可编辑/禁用/删除 -->
                <span v-if="record.role === 'super_admin'" class="sub-text">内置账号</span>
                <a-space v-else>
                  <a @click="openEditAccount(record)">编辑</a>
                  <a @click="handleResetPassword(record)">重置密码</a>
                  <a @click="handleToggleStatus(record)">{{ record.status === 'active' ? '禁用' : '启用' }}</a>
                  <a-popconfirm title="确认删除该账号?" @confirm="handleDeleteAccount(record)">
                    <a class="text-danger">删除</a>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- ========== 申请详情 Modal ========== -->
    <a-modal
      v-model:open="detailVisible"
      title="入驻申请详情"
      width="720px"
      :footer="null"
    >
      <a-descriptions v-if="currentApp" :column="2" bordered>
        <a-descriptions-item label="公司名称" :span="2">{{ currentApp.companyName }}</a-descriptions-item>
        <a-descriptions-item label="营业执照编号">{{ currentApp.licenseNo }}</a-descriptions-item>
        <a-descriptions-item label="申请时间">{{ currentApp.createdAt }}</a-descriptions-item>
        <a-descriptions-item label="联系人">{{ currentApp.contactName }}</a-descriptions-item>
        <a-descriptions-item label="联系电话">{{ currentApp.contactPhone }}</a-descriptions-item>
        <a-descriptions-item label="营业执照" :span="2">
          <a-image
            v-if="currentApp.licenseImage"
            :src="currentApp.licenseImage"
            :width="200"
          />
          <span v-else class="sub-text">未上传</span>
        </a-descriptions-item>
        <a-descriptions-item label="球馆名称">{{ currentApp.venueName }}</a-descriptions-item>
        <a-descriptions-item label="球馆地址">{{ currentApp.venueAddress }}</a-descriptions-item>
        <a-descriptions-item label="场地数量">{{ currentApp.venueCourtCount }} 块</a-descriptions-item>
        <a-descriptions-item label="营业时间">{{ currentApp.venueOpenTime }} - {{ currentApp.venueCloseTime }}</a-descriptions-item>
        <a-descriptions-item label="审核状态" :span="2">
          <a-tag :color="statusColor(currentApp.status)">{{ statusLabel(currentApp.status) }}</a-tag>
          <span v-if="currentApp.rejectReason" class="reject-reason">驳回原因：{{ currentApp.rejectReason }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <!-- ========== 驳回原因 Modal ========== -->
    <a-modal
      v-model:open="rejectVisible"
      title="驳回申请"
      ok-text="确认驳回"
      :ok-button-props="{ danger: true }"
      :confirm-loading="rejectLoading"
      @ok="confirmReject"
    >
      <a-form layout="vertical">
        <a-form-item label="驳回原因" required>
          <a-textarea
            v-model:value="rejectReason"
            :rows="4"
            placeholder="请填写驳回原因, 将通知经营者修改"
            :maxlength="200"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- ========== 商户号配置 Modal ========== -->
    <a-modal
      v-model:open="mchVisible"
      title="配置微信支付商户号"
      :confirm-loading="mchLoading"
      @ok="confirmMchConfig"
    >
      <a-alert
        message="配置后, 球友的支付将直接进入该经营者的微信商户号, 平台不过账"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />
      <a-form layout="vertical">
        <a-form-item label="商户号 (mch_id)" required>
          <a-input v-model:value="mchForm.mchId" placeholder="请输入微信支付商户号" />
        </a-form-item>
        <a-form-item label="商户 API 密钥" required>
          <a-input-password v-model:value="mchForm.apiKey" placeholder="请输入商户 API 密钥" />
        </a-form-item>
        <a-form-item label="商户证书文件">
          <a-upload :before-upload="handleCertUpload" :max-count="1">
            <a-button>
              <upload-outlined />
              选择证书文件
            </a-button>
          </a-upload>
          <div v-if="mchForm.certKey" class="sub-text" style="margin-top: 4px">
            已上传: {{ mchForm.certKey }}
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- ========== 新建/编辑账号 Modal ========== -->
    <a-modal
      v-model:open="accountVisible"
      :title="editingAccount ? '编辑账号' : '新建账号'"
      :confirm-loading="accountSaving"
      @ok="confirmSaveAccount"
    >
      <a-form ref="accountFormRef" :model="accountForm" :rules="accountRules" layout="vertical">
        <a-form-item v-if="isSuperAdmin" label="所属经营者" name="operatorId">
          <a-select
            v-model:value="accountForm.operatorId"
            placeholder="请选择经营者"
            :options="operatorOptions"
            :disabled="!!editingAccount"
            @change="onOperatorChange"
          />
        </a-form-item>
        <a-form-item label="用户名" name="username">
          <a-input
            v-model:value="accountForm.username"
            placeholder="登录用户名"
            :disabled="!!editingAccount"
          />
        </a-form-item>
        <a-form-item label="昵称" name="nickname">
          <a-input v-model:value="accountForm.nickname" placeholder="显示昵称" />
        </a-form-item>
        <a-form-item label="手机号" name="phone">
          <a-input v-model:value="accountForm.phone" placeholder="手机号" :maxlength="11" />
        </a-form-item>
        <a-form-item v-if="!editingAccount" label="初始密码" name="password">
          <a-input-password v-model:value="accountForm.password" placeholder="初始登录密码" />
        </a-form-item>
        <a-form-item v-else label="重置密码">
          <a-input-password
            v-model:value="accountForm.password"
            placeholder="留空则不修改密码"
          />
        </a-form-item>
        <a-form-item label="角色" name="role">
          <a-select v-model:value="accountForm.role" :options="accountRoleOptions" />
        </a-form-item>
        <a-form-item label="关联球馆" name="venueIds">
          <a-select
            v-model:value="accountForm.venueIds"
            mode="multiple"
            placeholder="选择该账号可管理的球馆"
            :options="venueOptions"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { TableColumnsType, FormInstance } from 'ant-design-vue'
import { PlusOutlined, UploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useTable } from '@/composables/useTable'
import { useAuthStore } from '@/stores/auth'
import {
  getOperatorList,
  getOperatorStats,
  approveOperator,
  rejectOperator,
  configMch,
  verifyMch,
  getAccountList,
  createAccount,
  updateAccount,
  toggleAccountStatus,
  deleteAccount,
  resetPassword,
  type OperatorQuery,
  type AccountQuery,
} from '@/api/operator'
import { getAllVenues } from '@/api/venue'
import type {
  OperatorApplication,
  AdminAccount,
  AdminRole,
  OperatorStats as Stats,
} from '@/types/models'

defineOptions({ name: 'OperatorManage' })

const authStore = useAuthStore()

/** 是否平台超级管理员 */
const isSuperAdmin = computed(() => authStore.roles.includes('super_admin'))
/** 是否有创建账号权限: 平台超管或经营者(在其主体下) */
const canCreateAccount = computed(() => isSuperAdmin.value || authStore.roles.includes('operator'))

// ==================== Tab 切换 ====================
// 非超管(经营者)只展示账号管理
const tab = ref<'application' | 'account'>(isSuperAdmin.value ? 'application' : 'account')

// ==================== 统计 ====================
const stats = reactive<Stats>({
  pendingCount: 0,
  approvedCount: 0,
  accountCount: 0,
  mchConfiguredCount: 0,
})

async function loadStats() {
  try {
    const res = await getOperatorStats()
    Object.assign(stats, res)
  } catch {
    // 静默
  }
}

// ==================== 入驻申请列表 ====================
const appQuery = reactive<OperatorQuery>({ page: 1, size: 10 })
const {
  dataList: applications,
  loading: appLoading,
  pagination: appPagination,
  queryParams: appParams,
  loadData: loadApplications,
  refresh: refreshApplications,
  resetQuery: resetApplications,
  handleTableChange: onAppTableChange,
} = useTable<OperatorQuery, OperatorApplication>({ fetchApi: getOperatorList, initialQuery: appQuery })

function reloadApplications() {
  appParams.page = 1
  refreshApplications()
}

function resetAppQuery() {
  resetApplications()
}

// ==================== 账号列表 ====================
const accQuery = reactive<AccountQuery>({ page: 1, size: 10 })
const {
  dataList: accounts,
  loading: accLoading,
  pagination: accPagination,
  queryParams: accParams,
  loadData: loadAccounts,
  refresh: refreshAccounts,
  resetQuery: resetAccounts,
  handleTableChange: onAccTableChange,
} = useTable<AccountQuery, AdminAccount>({ fetchApi: getAccountList, initialQuery: accQuery })

function reloadAccounts() {
  accParams.page = 1
  refreshAccounts()
}

function resetAccQuery() {
  resetAccounts()
}

// ==================== 状态映射 ====================
const statusOptions = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
]

function statusColor(s: string) {
  return s === 'pending' ? 'orange' : s === 'approved' ? 'success' : 'red'
}

function statusLabel(s: string) {
  return statusOptions.find((o) => o.value === s)?.label || s
}

// 角色可选项: 经营者仅可分配 admin/coach/front_desk/partner/staff, 超管额外可分配 operator
const ROLE_OPTIONS: { value: AdminRole, label: string }[] = [
  { value: 'operator', label: '经营者' },
  { value: 'admin', label: '管理员' },
  { value: 'coach', label: '教练' },
  { value: 'front_desk', label: '前台' },
  { value: 'partner', label: '合伙人' },
  { value: 'staff', label: '工作人员' },
]

const ASSIGNABLE_BY_OPERATOR: AdminRole[] = ['admin', 'coach', 'front_desk', 'partner', 'staff']

/** 账号表单角色下拉: 经营者只显示可分配角色 */
const accountRoleOptions = computed(() =>
  isSuperAdmin.value
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((o) => ASSIGNABLE_BY_OPERATOR.includes(o.value)),
)

/** 账号列表角色筛选项(与可分配角色一致) */
const roleOptions = computed(() => accountRoleOptions.value)

function roleColor(r: AdminRole) {
  return {
    super_admin: 'red',
    operator: 'purple',
    admin: 'blue',
    coach: 'green',
    front_desk: 'cyan',
    partner: 'gold',
    staff: 'default',
  }[r]
}

function roleLabel(r: AdminRole) {
  return (
    {
      super_admin: '超级管理员',
      operator: '经营者',
      admin: '管理员',
      coach: '教练',
      front_desk: '前台',
      partner: '合伙人',
      staff: '工作人员',
    }[r] || r
  )
}

const accountStatusOptions = [
  { value: 'active', label: '启用' },
  { value: 'disabled', label: '禁用' },
]

// ==================== 申请详情 ====================
const detailVisible = ref(false)
const currentApp = ref<OperatorApplication | null>(null)

function viewApplication(record: OperatorApplication) {
  currentApp.value = record
  detailVisible.value = true
}

// ==================== 审核通过 ====================
function openApproveModal(record: OperatorApplication) {
  Modal.confirm({
    title: '确认通过该入驻申请?',
    icon: h(ExclamationCircleOutlined),
    content: `将通过 ${record.companyName} 的入驻申请, 通过后系统将自动创建经营者账号和初始管理员账号.`,
    okText: '确认通过',
    cancelText: '取消',
    onOk: async () => {
      try {
        await approveOperator(record.id)
        message.success('已通过申请, 经营者账号已开通')
        loadStats()
        loadApplications()
      } catch {
        // 错误已由拦截器提示
      }
    },
  })
}

// ==================== 审核驳回 ====================
const rejectVisible = ref(false)
const rejectLoading = ref(false)
const rejectReason = ref('')
let rejectingId: string | number = 0

function openRejectModal(record: OperatorApplication) {
  rejectingId = record.id
  rejectReason.value = ''
  rejectVisible.value = true
}

async function confirmReject() {
  if (!rejectReason.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }
  rejectLoading.value = true
  try {
    await rejectOperator(rejectingId, rejectReason.value.trim())
    message.success('已驳回申请')
    rejectVisible.value = false
    loadStats()
    loadApplications()
  } catch {
    // 静默
  } finally {
    rejectLoading.value = false
  }
}

// ==================== 商户号配置 ====================
const mchVisible = ref(false)
const mchLoading = ref(false)
const mchForm = reactive({ mchId: '', apiKey: '', certKey: '' })
let mchOperatorId: string | number = 0

function openMchModal(record: OperatorApplication) {
  mchOperatorId = record.id
  mchForm.mchId = record.mchId || ''
  mchForm.apiKey = ''
  mchForm.certKey = ''
  mchVisible.value = true
}

// 证书上传: 不真实上传, 仅返回文件名标识
function handleCertUpload(file: File) {
  mchForm.certKey = file.name
  return false
}

async function confirmMchConfig() {
  if (!mchForm.mchId.trim() || !mchForm.apiKey.trim()) {
    message.warning('请填写商户号和 API 密钥')
    return
  }
  mchLoading.value = true
  try {
    await configMch(mchOperatorId, {
      mchId: mchForm.mchId.trim(),
      apiKey: mchForm.apiKey.trim(),
      certKey: mchForm.certKey || undefined,
    })
    // 配置成功后发起小额验证
    try {
      await verifyMch(mchOperatorId)
      message.success('商户号配置成功, 验证通过')
    } catch {
      message.warning('商户号已配置, 验证失败请稍后重试')
    }
    mchVisible.value = false
    loadStats()
    loadApplications()
  } catch {
    // 静默
  } finally {
    mchLoading.value = false
  }
}

// ==================== 账号管理: 新建/编辑 ====================
const accountVisible = ref(false)
const accountSaving = ref(false)
const accountFormRef = ref<FormInstance>()
const editingAccount = ref<AdminAccount | null>(null)
const accountForm = reactive({
  operatorId: undefined as string | number | undefined,
  username: '',
  nickname: '',
  phone: '',
  password: '',
  role: 'admin' as AdminRole,
  venueIds: [] as (string | number)[],
})

const accountRules = {
  operatorId: [{ required: true, message: '请选择经营者' }],
  username: [{ required: true, message: '请输入用户名' }],
  nickname: [{ required: true, message: '请输入昵称' }],
  phone: [
    { required: true, message: '请输入手机号' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
  ],
  password: [{ required: true, message: '请输入初始密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色' }],
}

// 经营者下拉选项 (从已通过的申请里取)
const operatorOptions = ref<Array<{ value: string | number, label: string }>>([])
// 球馆下拉 (按所选经营者过滤)
const venueOptions = ref<Array<{ value: string | number, label: string }>>([])

async function loadOperatorOptions() {
  try {
    const res = await getOperatorList({ status: 'approved', page: 1, size: 100 })
    operatorOptions.value = (res.list || []).map((o) => ({
      value: o.id,
      label: `${o.companyName} (${o.contactName})`,
    }))
  } catch {
    // 静默
  }
}

async function onOperatorChange(_operatorId?: string | number) {
  // 加载该经营者名下球馆 (后端按当前数据权限返回)
  try {
    const venues = await getAllVenues()
    venueOptions.value = venues.map((v) => ({ value: v.id, label: v.name }))
  } catch {
    venueOptions.value = []
  }
}

function openCreateAccount() {
  editingAccount.value = null
  accountForm.operatorId = isSuperAdmin.value ? undefined : (authStore.activeOperatorId ?? undefined)
  accountForm.username = ''
  accountForm.nickname = ''
  accountForm.phone = ''
  accountForm.password = ''
  accountForm.role = 'admin'
  accountForm.venueIds = []
  if (isSuperAdmin.value) {
    loadOperatorOptions()
  } else {
    onOperatorChange()
  }
  accountVisible.value = true
}

function openEditAccount(record: AdminAccount) {
  editingAccount.value = record
  accountForm.operatorId = record.operatorId
  accountForm.username = record.username
  accountForm.nickname = record.nickname
  accountForm.phone = record.phone
  accountForm.password = ''
  accountForm.role = record.role
  accountForm.venueIds = [...record.venueIds]
  if (isSuperAdmin.value) {
    loadOperatorOptions()
  }
  onOperatorChange()
  accountVisible.value = true
}

async function confirmSaveAccount() {
  await accountFormRef.value?.validate()
  accountSaving.value = true
  try {
    const payload: any = {
      nickname: accountForm.nickname,
      phone: accountForm.phone,
      role: accountForm.role,
      venueIds: accountForm.venueIds,
    }
    if (accountForm.password) payload.password = accountForm.password

    if (editingAccount.value) {
      await updateAccount(editingAccount.value.id, payload)
      message.success('账号已更新')
    } else {
      await createAccount({
        operatorId: accountForm.operatorId!,
        username: accountForm.username,
        nickname: accountForm.nickname,
        phone: accountForm.phone,
        password: accountForm.password,
        role: accountForm.role,
        venueIds: accountForm.venueIds,
      })
      message.success('账号已创建')
    }
    accountVisible.value = false
    loadStats()
    loadAccounts()
  } catch {
    // 静默
  } finally {
    accountSaving.value = false
  }
}

async function handleResetPassword(record: AdminAccount) {
  Modal.confirm({
    title: '确认重置密码?',
    icon: h(ExclamationCircleOutlined),
    content: `将重置 ${record.nickname} 的密码, 重置后默认密码为 123456.`,
    onOk: async () => {
      try {
        await resetPassword(record.id)
        message.success('密码已重置为 123456')
      } catch {
        // 静默
      }
    },
  })
}

async function handleToggleStatus(record: AdminAccount) {
  try {
    await toggleAccountStatus(record.id)
    message.success(record.status === 'active' ? '账号已禁用' : '账号已启用')
    loadAccounts()
  } catch {
    // 静默
  }
}

async function handleDeleteAccount(record: AdminAccount) {
  try {
    await deleteAccount(record.id)
    message.success('账号已删除')
    loadStats()
    loadAccounts()
  } catch {
    // 静默
  }
}

// ==================== 表格列定义 ====================
const appColumns: TableColumnsType = [
  { title: '公司名称', dataIndex: 'companyName', width: 200 },
  { title: '联系人', dataIndex: 'contact', width: 140 },
  { title: '球馆信息', dataIndex: 'venue', width: 200 },
  { title: '申请时间', dataIndex: 'createdAt', width: 170 },
  { title: '审核状态', dataIndex: 'status', width: 100 },
  { title: '商户号', dataIndex: 'mchStatus', width: 100 },
  { title: '操作', dataIndex: 'action', width: 220, fixed: 'right' },
]

const accColumns: TableColumnsType = [
  { title: '账号', dataIndex: 'username', width: 180 },
  { title: '手机号', dataIndex: 'phone', width: 130 },
  { title: '角色', dataIndex: 'role', width: 100 },
  { title: '关联球馆', dataIndex: 'venues', width: 120 },
  { title: '所属经营者', dataIndex: 'operatorName', width: 180 },
  { title: '状态', dataIndex: 'status', width: 80 },
  { title: '最后登录', dataIndex: 'lastLoginAt', width: 170 },
  { title: '操作', dataIndex: 'action', width: 220, fixed: 'right' },
]

// ==================== 初始化 ====================
onMounted(() => {
  loadStats()
  // 入驻申请列表仅超管可见, 避免经营者账号误请求超管接口
  if (isSuperAdmin.value) {
    loadApplications()
  }
  loadAccounts()
})
</script>

<style scoped lang="scss">
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;

  &.stats-single {
    grid-template-columns: 1fr;
    max-width: 320px;
  }
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}

.text-primary { color: #059669; }
.text-success { color: #16a34a; }
.text-warning { color: #f59e0b; }
.text-danger { color: #ef4444; }

.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

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

.sub-text {
  color: #94a3b8;
  font-size: 12px;
}

.company-cell {
  .company-name {
    font-weight: 500;
  }
}

.reject-reason {
  margin-left: 12px;
  color: #ef4444;
  font-size: 13px;
}

a.text-danger {
  color: #ef4444;
}
</style>
