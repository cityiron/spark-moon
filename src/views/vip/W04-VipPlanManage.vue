<template>
  <div class="page-container">
    <!-- 顶部统计卡 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">在架卡种数</div>
        <div class="stat-value text-primary">{{ activePlanCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已购权益会员数</div>
        <div class="stat-value">{{ membershipTotal }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">储值等级档位</div>
        <div class="stat-value text-success">{{ tierList.length }}</div>
      </div>
    </div>

    <!-- 俱乐部会员卡列表卡片网格 -->
    <div class="page-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <span class="section-title">俱乐部会员卡</span>
        </div>
        <a-button type="primary" @click="openCreatePlan">
          <plus-outlined />
          新建会员卡
        </a-button>
      </div>

      <a-spin :spinning="planLoading">
        <a-row v-if="planList.length" :gutter="[16, 16]">
          <a-col v-for="plan in planList" :key="plan.id" :span="8">
            <a-card class="plan-card" :bordered="true">
              <div class="plan-card-header">
                <div class="plan-name">
                  {{ plan.name }}
                  <a-tag color="blue" style="margin-left: 6px">俱乐部卡</a-tag>
                </div>
                <a-tag v-if="plan.status === 'active'" color="green">在架</a-tag>
                <a-tag v-else color="default">下架</a-tag>
              </div>
              <div class="plan-price">
                ¥ {{ formatFen(plan.price) }}<span class="plan-price-unit">/月</span>
              </div>
              <div class="plan-meta">有效期：{{ plan.durationMonths }} 个月</div>
              <div class="plan-switch">
                <span class="switch-label">上架状态</span>
                <a-switch
                  :checked="plan.status === 'active'"
                  checked-children="上架"
                  un-checked-children="下架"
                  @change="(c: boolean | string) => handlePlanStatusChange(plan, c)"
                />
              </div>
              <div class="plan-actions">
                <a-button size="small" @click="openEditPlan(plan)">
                  <edit-outlined />
                  编辑
                </a-button>
                <a-button size="small" type="primary" ghost @click="openBenefitDrawer(plan)">
                  <thunderbolt-outlined />
                  配置权益
                </a-button>
                <a-popconfirm title="确认删除该会员卡？" @confirm="deletePlan(plan)">
                  <a-button size="small" danger>
                    <delete-outlined />
                    删除
                  </a-button>
                </a-popconfirm>
              </div>
            </a-card>
          </a-col>
        </a-row>
        <a-empty v-else description="暂无会员卡，点击右上角新建" />
      </a-spin>
    </div>

    <!-- 储值等级折扣配置 -->
    <div class="page-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <span class="section-title">储值等级折扣</span>
          <a-alert
            type="info"
            show-icon
            class="tier-tip"
            message="按会员在本俱乐部的累计充值总额自动匹配档位（消费不影响等级）；与会员卡折扣取更优者生效"
          />
        </div>
        <div>
          <a-button style="margin-right: 8px" @click="loadTiers">刷新</a-button>
          <a-button type="primary" @click="addTier">新增档位</a-button>
        </div>
      </div>

      <a-spin :spinning="tierLoading">
        <a-table
          :columns="tierColumns"
          :data-source="tierList"
          row-key="rowKey"
          :pagination="false"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'name'">
              <a-input v-model:value="record.name" placeholder="档位名，如 黄金会员" />
            </template>
            <template v-else-if="column.dataIndex === 'minRecharge'">
              <a-input-number
                v-model:value="record.minRecharge"
                :min="0.01"
                :precision="2"
                :step="1000"
                style="width: 140px"
              />
            </template>
            <template v-else-if="column.dataIndex === 'discountRate'">
              <a-input-number
                v-model:value="record.discountRate"
                :min="0.1"
                :max="1"
                :precision="2"
                :step="0.05"
                style="width: 120px"
              />
              <span class="discount-hint">{{ discountLabel(record.discountRate) }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <a-switch
                v-model:checked="record.status"
                :checked-value="1"
                :un-checked-value="0"
                checked-children="启用"
                un-checked-children="停用"
              />
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-button type="text" danger size="small" @click="removeTier(record)">
                <delete-outlined />
              </a-button>
            </template>
          </template>
        </a-table>

        <div class="drawer-footer" style="margin-top: 16px">
          <a-button type="primary" :loading="tierSaving" @click="submitTiers">
            保存储值档位
          </a-button>
        </div>
      </a-spin>
    </div>

    <!-- 已购权益会员表格 -->
    <div class="page-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <span class="section-title">已购会员卡会员</span>
          <a-select
            v-model:value="filterPlanId"
            placeholder="会员卡"
            style="width: 180px"
            allow-clear
            :options="planFilterOptions"
            @change="handleMembershipSearch"
          />
          <a-select
            v-model:value="filterStatus"
            placeholder="状态"
            style="width: 120px"
            allow-clear
            :options="membershipStatusOptions"
            @change="handleMembershipSearch"
          />
          <a-button @click="handleMembershipReset">重置</a-button>
        </div>
      </div>

      <a-table
        :columns="membershipColumns"
        :data-source="membershipDataList"
        :loading="membershipLoading"
        row-key="id"
        :pagination="membershipPagination"
        @change="handleMembershipTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="membershipStatusTag(record.status).color">
              {{ membershipStatusTag(record.status).text }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新建/编辑会员卡 Modal -->
    <a-modal
      v-model:open="formModalOpen"
      :title="isEdit ? '编辑会员卡' : '新建会员卡'"
      :confirm-loading="submitting"
      :width="480"
      @ok="submitPlan"
    >
      <a-form ref="planFormRef" :model="planForm" :rules="planRules" layout="vertical">
        <a-form-item label="会员卡名称" name="name">
          <a-input v-model:value="planForm.name" placeholder="如 月度会员卡" />
        </a-form-item>
        <a-form-item label="卡类型">
          <a-tag color="blue">俱乐部会员卡</a-tag>
          <div class="form-tip">俱乐部会员卡由本俱乐部维护；平台会员卡请在「平台会员卡」菜单中配置</div>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="价格(元)" name="price">
              <a-input-number
                v-model:value="planForm.price"
                :min="0"
                :step="10"
                style="width: 100%"
                placeholder="0"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="有效期(月)" name="durationMonths">
              <a-input-number
                v-model:value="planForm.durationMonths"
                :min="1"
                :step="1"
                style="width: 100%"
                placeholder="1"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="上架状态" name="status">
          <a-radio-group v-model:value="planForm.status">
            <a-radio value="active">上架</a-radio>
            <a-radio value="inactive">下架</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 权益配置 Drawer -->
    <a-drawer
      v-model:open="benefitDrawerOpen"
      :title="`配置权益 - ${currentPlan?.name || ''}`"
      width="640"
      :destroy-on-close="true"
    >
      <a-spin :spinning="benefitLoading">
        <a-alert
          type="info"
          show-icon
          message="每张会员卡可配置多项权益：场地折扣（按球馆）、培训课程折扣、每月免费场次、活动报名折扣"
          style="margin-bottom: 16px"
        />
        <div class="benefit-list">
          <div
            v-for="(b, idx) in benefitForm"
            :key="idx"
            class="benefit-item"
          >
            <div class="benefit-item-head">
              <a-select
                v-model:value="b.benefitType"
                style="width: 160px"
                :options="benefitTypeOptions"
                @change="() => onBenefitTypeChange(b)"
              />
              <a-button
                type="text"
                danger
                size="small"
                @click="removeBenefit(idx)"
              >
                <delete-outlined />
              </a-button>
            </div>
            <div class="benefit-item-body">
              <template v-if="b.benefitType === 'VENUE_DISCOUNT'">
                <a-select
                  v-model:value="b.venueId"
                  placeholder="选择球馆"
                  style="width: 220px"
                  :options="venueOptions"
                  show-search
                  option-filter-prop="label"
                />
                <a-input-number
                  v-model:value="b.discountRate"
                  :min="0.1"
                  :max="1"
                  :precision="2"
                  :step="0.05"
                  placeholder="折扣率"
                  style="width: 140px"
                />
                <span class="discount-hint">{{ discountLabel(b.discountRate) }}</span>
              </template>
              <template v-else-if="b.benefitType === 'FREE_SLOT'">
                <a-input-number
                  v-model:value="b.freeSlots"
                  :min="1"
                  :step="1"
                  placeholder="每月免费场次数"
                  style="width: 200px"
                />
                <span class="field-hint">每月免费场次</span>
              </template>
              <template v-else>
                <a-input-number
                  v-model:value="b.discountRate"
                  :min="0.1"
                  :max="1"
                  :precision="2"
                  :step="0.05"
                  placeholder="折扣率"
                  style="width: 140px"
                />
                <span class="discount-hint">{{ discountLabel(b.discountRate) }}</span>
              </template>
            </div>
          </div>
          <a-empty v-if="!benefitForm.length" description="暂未配置权益，点击下方添加" />
        </div>

        <a-button
          type="dashed"
          block
          style="margin-top: 12px"
          @click="addBenefit"
        >
          <plus-outlined />
          添加权益
        </a-button>
      </a-spin>

      <template #footer>
        <div class="drawer-footer">
          <a-button style="margin-right: 8px" @click="benefitDrawerOpen = false">取消</a-button>
          <a-button type="primary" :loading="benefitSaving" @click="submitBenefits">
            保存权益
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, type FormInstance, type TableColumnsType } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { useTable } from '@/composables/useTable'
import {
  getVipPlanList,
  createVipPlan,
  updateVipPlan,
  toggleVipPlanStatus,
  deleteVipPlan,
  getVipPlanBenefits,
  saveVipPlanBenefits,
  getRechargeTiers,
  saveRechargeTiers,
  getVipMemberships,
  getAllVenues,
  type VipMembershipQuery,
} from '@/api/vip'
import type {
  VipPlan,
  VipMembership,
  VipPlanStatus,
  VipBenefit,
  RechargeTier,
  Venue,
} from '@/types/models'

// ===== 工具 =====
/** 分转元, 保留两位小数 */
function formatFen(fen: number | undefined): string {
  if (fen === undefined || fen === null) return '0.00'
  return (fen / 100).toFixed(2)
}

/** 折扣率转文案 0.8 -> "8.0 折" */
function discountLabel(rate: number | undefined | null): string {
  if (rate === undefined || rate === null) return '-'
  return `${(rate * 10).toFixed(1)} 折`
}

let tierRowKey = 1
function nextTierKey() {
  return tierRowKey++
}

// ===== 已购权益会员表格(useTable 分页) =====
const membershipColumns: TableColumnsType = [
  { title: '球友姓名', dataIndex: 'userName', width: 120 },
  { title: '手机号', dataIndex: 'userPhone', width: 140 },
  { title: '会员卡', dataIndex: 'vipPlanName', width: 160 },
  { title: '购买时间', dataIndex: 'purchaseTime', width: 170 },
  { title: '到期时间', dataIndex: 'expireTime', width: 170 },
  { title: '状态', dataIndex: 'status', width: 100 },
]

const membershipStatusOptions = [
  { label: '有效', value: 'active' },
  { label: '已过期', value: 'expired' },
]
function membershipStatusTag(s: 'active' | 'expired'): { color: string, text: string } {
  return s === 'active'
    ? { color: 'green', text: '有效' }
    : { color: 'default', text: '已过期' }
}

const {
  loading: membershipLoading,
  dataList: membershipDataList,
  total: membershipTotal,
  queryParams: membershipQuery,
  pagination: membershipPagination,
  loadData: loadMembershipList,
  refresh: refreshMemberships,
  resetQuery: resetMembershipQuery,
  handleTableChange: handleMembershipTableChange,
} = useTable<VipMembershipQuery, VipMembership>({
  fetchApi: getVipMemberships,
  initialQuery: { vipPlanId: undefined, status: undefined, planType: 'venue' },
})

const filterPlanId = ref<string | number | undefined>(undefined)
const filterStatus = ref<'active' | 'expired' | undefined>(undefined)
function handleMembershipSearch() {
  membershipQuery.vipPlanId = filterPlanId.value
  membershipQuery.status = filterStatus.value
  refreshMemberships()
}
function handleMembershipReset() {
  filterPlanId.value = undefined
  filterStatus.value = undefined
  resetMembershipQuery()
}

// ===== 俱乐部会员卡列表 =====
const planLoading = ref(false)
const planList = ref<VipPlan[]>([])

async function loadPlanList() {
  planLoading.value = true
  try {
    const res = await getVipPlanList({ page: 1, size: 100, planType: 'venue' })
    planList.value = res.list || []
  } catch {
    planList.value = []
  } finally {
    planLoading.value = false
  }
}

// 会员卡筛选下拉选项
const planFilterOptions = computed(() =>
  planList.value.map((p) => ({ label: p.name, value: p.id })),
)

// ===== 统计(本地统计, 无单独 API) =====
const activePlanCount = computed(() =>
  planList.value.filter((p) => p.status === 'active').length,
)
// 月度新增: 当前已加载会员页中本月购买的数量
const monthNewCount = computed(() => {
  const now = dayjs()
  return membershipDataList.value.filter((m) => {
    if (!m.purchaseTime) return false
    return dayjs(m.purchaseTime).isSame(now, 'month')
  }).length
})

// ===== 新建/编辑会员卡 =====
const formModalOpen = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const planFormRef = ref<FormInstance>()
const editingPlanId = ref<string | number>(0)
const planForm = reactive<{
  name: string
  price: number       // 元
  durationMonths: number
  status: VipPlanStatus
}>({
  name: '',
  price: 0,
  durationMonths: 1,
  status: 'active',
})
const planRules = {
  name: [{ required: true, message: '请输入会员卡名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入会员卡价格', trigger: 'blur', type: 'number' }],
  durationMonths: [{ required: true, message: '请输入有效期(月)', trigger: 'blur', type: 'number' }],
}

function openCreatePlan() {
  isEdit.value = false
  Object.assign(planForm, { name: '', price: 0, durationMonths: 1, status: 'active' })
  formModalOpen.value = true
}
function openEditPlan(plan: VipPlan) {
  isEdit.value = true
  editingPlanId.value = plan.id
  Object.assign(planForm, {
    name: plan.name,
    price: plan.price / 100,    // 分转元
    durationMonths: plan.durationMonths,
    status: plan.status,
  })
  formModalOpen.value = true
}
async function submitPlan() {
  await planFormRef.value?.validate()
  submitting.value = true
  try {
    const payload = {
      name: planForm.name,
      planType: 'venue' as const,
      price: Math.round(planForm.price * 100),   // 元转分
      durationMonths: planForm.durationMonths,
      status: planForm.status,
    }
    if (isEdit.value) {
      await updateVipPlan(editingPlanId.value, payload)
      message.success('会员卡更新成功')
    } else {
      await createVipPlan(payload)
      message.success('会员卡创建成功')
    }
    formModalOpen.value = false
    loadPlanList()
  } finally {
    submitting.value = false
  }
}

async function handlePlanStatusChange(plan: VipPlan, checked: boolean | string) {
  const next: VipPlanStatus = checked ? 'active' : 'inactive'
  try {
    await toggleVipPlanStatus(plan.id, next)
    plan.status = next
    message.success(checked ? '已上架' : '已下架')
  } catch {
    // 失败保持原状态
  }
}

async function deletePlan(plan: VipPlan) {
  await deleteVipPlan(plan.id)
  message.success('会员卡已删除')
  loadPlanList()
}

// ===== 权益配置 Drawer =====
const benefitTypeOptions = [
  { label: '场地折扣', value: 'VENUE_DISCOUNT' },
  { label: '培训课程折扣', value: 'TRAINING_DISCOUNT' },
  { label: '每月免费场次', value: 'FREE_SLOT' },
  { label: '活动报名折扣', value: 'ACTIVITY_DISCOUNT' },
]

const benefitDrawerOpen = ref(false)
const benefitLoading = ref(false)
const benefitSaving = ref(false)
const currentPlan = ref<VipPlan | null>(null)
const allVenues = ref<Venue[]>([])
const benefitForm = ref<VipBenefit[]>([])

const venueOptions = computed(() => [
  { label: '全部球馆（本俱乐部统一折扣）', value: 0 },
  ...allVenues.value.map((v) => ({ label: v.name, value: v.id })),
])

function emptyBenefit(type: string): VipBenefit {
  return {
    planId: currentPlan.value?.id ?? 0,
    benefitType: type as VipBenefit['benefitType'],
    // 场地折扣默认“全部球馆”(前端用 0 表示, 提交时转 null)
    venueId: type === 'VENUE_DISCOUNT' ? 0 : null,
    discountRate: 0.9,
    freeSlots: 1,
    remark: '',
  }
}

function onBenefitTypeChange(b: VipBenefit) {
  // 切换类型时重置无关字段
  if (b.benefitType !== 'VENUE_DISCOUNT') {
    b.venueId = null
  } else if (b.venueId == null) {
    b.venueId = 0
  }
  if (b.benefitType !== 'FREE_SLOT') {
    b.freeSlots = null
  }
  if (b.benefitType === 'FREE_SLOT') {
    b.discountRate = null
  } else if (b.discountRate == null) {
    b.discountRate = 0.9
  }
}

function addBenefit() {
  benefitForm.value.push(emptyBenefit('VENUE_DISCOUNT'))
}

function removeBenefit(idx: number) {
  benefitForm.value.splice(idx, 1)
}

async function openBenefitDrawer(plan: VipPlan) {
  currentPlan.value = plan
  benefitDrawerOpen.value = true
  benefitLoading.value = true
  try {
    const [venues, benefits] = await Promise.all([
      getAllVenues(),
      getVipPlanBenefits(plan.id),
    ])
    allVenues.value = venues || []
    const list = benefits || []
    benefitForm.value = list.length
      ? list.map((b) => ({
          ...b,
          // 后端 null 表示全部球馆统一折扣, 前端用 0 显示
          venueId:
            b.benefitType === 'VENUE_DISCOUNT' && b.venueId == null ? 0 : b.venueId,
        }))
      : [emptyBenefit('VENUE_DISCOUNT')]
  } catch {
    allVenues.value = []
    benefitForm.value = []
  } finally {
    benefitLoading.value = false
  }
}

async function submitBenefits() {
  if (!currentPlan.value) return
  const planId = currentPlan.value.id
  // 校验必填
  for (const b of benefitForm.value) {
    if (b.benefitType === 'VENUE_DISCOUNT' && b.discountRate == null) {
      message.warning('场地折扣需填写折扣率')
      return
    }
    if (b.benefitType === 'FREE_SLOT' && (b.freeSlots == null || b.freeSlots <= 0)) {
      message.warning('每月免费场次需大于 0')
      return
    }
    if (
      (b.benefitType === 'TRAINING_DISCOUNT' || b.benefitType === 'ACTIVITY_DISCOUNT')
      && b.discountRate == null
    ) {
      message.warning('折扣类权益需填写折扣率')
      return
    }
  }
  benefitSaving.value = true
  try {
    const payload = benefitForm.value.map((b) => ({
      planId,
      benefitType: b.benefitType,
      // 场地折扣: 0 表示全部球馆(统一折扣) → 保存为 null
      venueId: b.benefitType === 'VENUE_DISCOUNT' ? (b.venueId === 0 ? null : b.venueId) : null,
      discountRate: b.discountRate ?? null,
      freeSlots: b.benefitType === 'FREE_SLOT' ? b.freeSlots : null,
      remark: b.remark,
    }))
    await saveVipPlanBenefits(planId, payload)
    message.success('权益配置已保存')
    benefitDrawerOpen.value = false
  } finally {
    benefitSaving.value = false
  }
}

// ===== 储值等级折扣 =====
type TierRow = RechargeTier & { rowKey: number }

const tierColumns: TableColumnsType = [
  { title: '档位名', dataIndex: 'name', width: 180 },
  { title: '累计充值下限(元)', dataIndex: 'minRecharge', width: 180 },
  { title: '折扣率', dataIndex: 'discountRate', width: 180 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '操作', dataIndex: 'action', width: 60 },
]

const tierLoading = ref(false)
const tierSaving = ref(false)
const tierList = ref<TierRow[]>([])

function normalizeTier(t: RechargeTier): TierRow {
  return {
    ...t,
    rowKey: nextTierKey(),
    status: t.status === 1 ? 1 : 0,
  }
}

async function loadTiers() {
  tierLoading.value = true
  try {
    const list = await getRechargeTiers()
    tierList.value = (list || []).map(normalizeTier)
    // 无档位时填充默认三档(仅本地填充, 点击“保存储值档位”后生效)
    if (tierList.value.length === 0) {
      const defaults: RechargeTier[] = [
        { name: '白银会员', minRecharge: 5000, discountRate: 0.9, status: 1 },
        { name: '黄金会员', minRecharge: 10000, discountRate: 0.8, status: 1 },
        { name: '钻石会员', minRecharge: 30000, discountRate: 0.7, status: 1 },
      ]
      tierList.value = defaults.map(normalizeTier)
    }
  } catch {
    tierList.value = []
  } finally {
    tierLoading.value = false
  }
}

function addTier() {
  tierList.value.push(normalizeTier({
    name: '',
    minRecharge: 10000,
    discountRate: 0.9,
    status: 1,
  }))
}

function removeTier(record: TierRow) {
  const idx = tierList.value.findIndex((t) => t.rowKey === record.rowKey)
  if (idx >= 0) tierList.value.splice(idx, 1)
}

async function submitTiers() {
  for (const t of tierList.value) {
    if (t.minRecharge == null || t.minRecharge <= 0) {
      message.warning('累计充值下限必须大于 0')
      return
    }
    if (t.discountRate == null || t.discountRate <= 0 || t.discountRate > 1) {
      message.warning('折扣率必须在 0~1 之间')
      return
    }
  }
  tierSaving.value = true
  try {
    const payload = tierList.value.map((t) => ({
      name: t.name,
      minRecharge: t.minRecharge,
      discountRate: t.discountRate,
      status: t.status,
    }))
    await saveRechargeTiers(payload)
    message.success('储值等级折扣已保存')
    loadTiers()
  } finally {
    tierSaving.value = false
  }
}

// ===== 初始化加载 =====
onMounted(() => {
  loadPlanList()
  loadMembershipList()
  loadTiers()
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

// ===== 卡片容器 =====
.page-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin-right: 12px;
}

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

.text-muted {
  color: #94a3b8;
}

.tier-tip {
  flex: 1;
  max-width: 460px;
  margin-left: 8px;
}

// ===== 会员卡卡片 =====
.plan-card {
  :deep(.ant-card-body) {
    padding: 16px 18px;
  }
  .plan-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    .plan-name {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
    }
  }
  .plan-price {
    font-size: 24px;
    font-weight: 700;
    color: #059669;
    line-height: 1.2;
    .plan-price-unit {
      font-size: 13px;
      font-weight: 400;
      color: #64748b;
    }
  }
  .plan-meta {
    font-size: 13px;
    color: #64748b;
    margin-top: 6px;
  }
  .plan-switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    padding: 8px 0;
    border-top: 1px dashed #e2e8f0;
    .switch-label {
      font-size: 13px;
      color: #64748b;
    }
  }
  .plan-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
  }
}

// ===== 权益配置 =====
.benefit-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.benefit-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  .benefit-item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .benefit-item-body {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
}
.discount-hint {
  font-size: 13px;
  color: #059669;
  font-weight: 600;
}
.field-hint {
  font-size: 13px;
  color: #64748b;
}

.drawer-footer {
  text-align: right;
}

.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
  line-height: 1.5;
}
</style>
