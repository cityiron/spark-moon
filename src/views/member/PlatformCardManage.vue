<template>
  <div class="page-container">
    <!-- 顶部统计卡 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">在架平台卡种</div>
        <div class="stat-value text-primary">{{ activePlanCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已购平台卡会员数</div>
        <div class="stat-value">{{ membershipTotal }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">开通平台卡球馆</div>
        <div class="stat-value text-success">{{ platformVenueCount }}</div>
      </div>
    </div>

    <div class="page-card">
      <a-tabs v-model:activeKey="activeTab">
        <!-- Tab1 平台卡种 -->
        <a-tab-pane key="plans" tab="平台卡种">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <span class="section-title">平台卡（全平台球馆通用，需球馆开通）</span>
            </div>
            <a-button type="primary" @click="openCreatePlan">
              <plus-outlined />
              新建平台卡
            </a-button>
          </div>

          <a-spin :spinning="planLoading">
            <a-row v-if="planList.length" :gutter="[16, 16]">
              <a-col v-for="plan in planList" :key="plan.id" :span="8">
                <a-card class="plan-card" :bordered="true">
                  <div class="plan-card-header">
                    <div class="plan-name">
                      {{ plan.name }}
                      <a-tag color="purple" style="margin-left: 6px">平台卡</a-tag>
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
                    <a-popconfirm title="确认删除该平台卡？" @confirm="deletePlan(plan)">
                      <a-button size="small" danger>
                        <delete-outlined />
                        删除
                      </a-button>
                    </a-popconfirm>
                  </div>
                </a-card>
              </a-col>
            </a-row>
            <a-empty v-else description="暂无平台卡，点击右上角新建" />
          </a-spin>
        </a-tab-pane>

        <!-- Tab2 开通球馆 -->
        <a-tab-pane key="venues" tab="开通球馆">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <span class="section-title">球馆平台卡开通与折扣</span>
              <a-input-search
                v-model:value="venueKeyword"
                placeholder="搜索球馆 / 俱乐部 / 地址"
                allow-clear
                style="width: 240px"
              />
              <a-select
                v-model:value="discountPlanId"
                placeholder="选择要配置折扣的平台卡"
                style="width: 220px"
                :options="planFilterOptions"
                allow-clear
                @change="handleDiscountPlanChange"
              />
              <a-alert
                type="info"
                show-icon
                message="开启球馆接受平台卡后，可在此按球馆配置该平台卡的折扣率；未配置折扣的球馆不享受平台卡折扣"
                style="flex: 1; max-width: 480px"
              />
            </div>
            <a-button
              type="primary"
              :disabled="!discountPlanId"
              :loading="discountSaving"
              @click="saveVenueDiscounts"
            >
              保存折扣配置
            </a-button>
          </div>
          <a-table
            :columns="venueColumns"
            :data-source="filteredVenueList"
            :loading="venueLoading"
            row-key="id"
            :pagination="false"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'operatorName'">
                {{ record.operatorName || '-' }}
              </template>
              <template v-else-if="column.dataIndex === 'acceptPlatformCard'">
                <a-switch
                  :checked="record.acceptPlatformCard === 1"
                  checked-children="已开通"
                  un-checked-children="未开通"
                  @change="(c: boolean | string) => handleVenueSwitch(record, c)"
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
                  placeholder="1.0"
                />
                <span class="discount-hint">{{ discountLabel(record.discountRate) }}</span>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- Tab3 已购平台卡会员 -->
        <a-tab-pane key="memberships" tab="已购平台卡会员">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <span class="section-title">持卡会员</span>
              <a-select
                v-model:value="filterPlanId"
                placeholder="平台卡"
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
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- 新建/编辑平台卡 Modal -->
    <a-modal
      v-model:open="formModalOpen"
      :title="isEdit ? '编辑平台卡' : '新建平台卡'"
      :confirm-loading="submitting"
      :width="480"
      @ok="submitPlan"
    >
      <a-form ref="planFormRef" :model="planForm" :rules="planRules" layout="vertical">
        <a-form-item label="卡种名称" name="name">
          <a-input v-model:value="planForm.name" placeholder="如 平台月卡" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, type FormInstance, type TableColumnsType } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { useTable } from '@/composables/useTable'
import {
  getVipPlanList,
  createVipPlan,
  updateVipPlan,
  toggleVipPlanStatus,
  deleteVipPlan,
  getVipPlanBenefits,
  saveVipPlanBenefits,
  getVipMemberships,
  getAllVenues,
  type VipMembershipQuery,
} from '@/api/vip'
import { updateVenue } from '@/api/venue'
import type { VipPlan, VipMembership, VipPlanStatus, VipBenefit, Venue } from '@/types/models'

/** 分转元, 保留两位小数 */
function formatFen(fen: number | undefined): string {
  if (fen === undefined || fen === null) return '0.00'
  return (fen / 100).toFixed(2)
}

/** 折扣率转文案 0.8 -> "8.0 折" */
function discountLabel(rate: number | undefined | null): string {
  if (rate === undefined || rate === null) return '1.0 折'
  return `${(rate * 10).toFixed(1)} 折`
}

const activeTab = ref('plans')

// ===== Tab1 平台卡种 =====
const planLoading = ref(false)
const planList = ref<VipPlan[]>([])

async function loadPlanList() {
  planLoading.value = true
  try {
    const res = await getVipPlanList({ page: 1, size: 100, planType: 'platform' })
    planList.value = res.list || []
  } catch {
    planList.value = []
  } finally {
    planLoading.value = false
  }
}

const activePlanCount = computed(() =>
  planList.value.filter((p) => p.status === 'active').length,
)

const planFilterOptions = computed(() =>
  planList.value.map((p) => ({ label: p.name, value: p.id })),
)

const formModalOpen = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const planFormRef = ref<FormInstance>()
const editingPlanId = ref<string | number>(0)
const planForm = reactive<{
  name: string
  price: number
  durationMonths: number
  status: VipPlanStatus
}>({
  name: '',
  price: 0,
  durationMonths: 1,
  status: 'active',
})
const planRules = {
  name: [{ required: true, message: '请输入卡种名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur', type: 'number' }],
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
    price: plan.price / 100,
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
      planType: 'platform' as const,
      price: Math.round(planForm.price * 100),
      durationMonths: planForm.durationMonths,
      status: planForm.status,
    }
    if (isEdit.value) {
      await updateVipPlan(editingPlanId.value, payload)
      message.success('平台卡更新成功')
    } else {
      await createVipPlan(payload)
      message.success('平台卡创建成功')
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
  message.success('平台卡已删除')
  loadPlanList()
}

// ===== Tab2 开通球馆 =====
const venueColumns: TableColumnsType = [
  { title: '球馆名称', dataIndex: 'name', width: 200 },
  { title: '归属俱乐部', dataIndex: 'operatorName', width: 200 },
  { title: '地址', dataIndex: 'address' },
  { title: '平台卡状态', dataIndex: 'acceptPlatformCard', width: 140 },
  { title: '折扣率', dataIndex: 'discountRate', width: 180 },
]

const venueLoading = ref(false)
const venueList = ref<Venue[]>([])
const discountPlanId = ref<number | undefined>(undefined)
const discountSaving = ref(false)

/** 开通球馆搜索关键词 */
const venueKeyword = ref('')
/** 按关键词过滤后的球馆列表（名称/归属俱乐部/地址） */
const filteredVenueList = computed(() => {
  const kw = venueKeyword.value.trim().toLowerCase()
  if (!kw) return venueList.value
  return venueList.value.filter(
    (v) =>
      (v.name || '').toLowerCase().includes(kw)
      || (v.operatorName || '').toLowerCase().includes(kw)
      || (v.address || '').toLowerCase().includes(kw),
  )
})

async function loadVenues() {
  venueLoading.value = true
  try {
    const list = await getAllVenues()
    venueList.value = Array.isArray(list) ? list : []
    // 若已选中平台卡, 重新回填折扣率
    if (discountPlanId.value) {
      await applyVenueDiscounts()
    }
  } catch {
    venueList.value = []
  } finally {
    venueLoading.value = false
  }
}

const platformVenueCount = computed(
  () => venueList.value.filter((v) => v.acceptPlatformCard === 1).length,
)

async function handleVenueSwitch(record: Venue, checked: boolean | string) {
  const next = checked ? 1 : 0
  try {
    await updateVenue(record.id, { acceptPlatformCard: next })
    record.acceptPlatformCard = next
    message.success(checked ? '已开通平台卡' : '已关闭平台卡')
  } catch {
    // 失败保持原状态
  }
}

/** 切换平台卡: 回填各球馆折扣率 */
async function handleDiscountPlanChange() {
  venueList.value.forEach((v) => (v.discountRate = null))
  if (!discountPlanId.value) return
  await applyVenueDiscounts()
}

/** 按选中平台卡的权益(场地折扣)回填各球馆折扣率 */
async function applyVenueDiscounts() {
  const planId = discountPlanId.value
  if (!planId) return
  try {
    const benefits = await getVipPlanBenefits(planId)
    const venueMap = new Map(
      benefits
        .filter((b) => b.benefitType === 'VENUE_DISCOUNT' && b.venueId != null)
        .map((b) => [String(b.venueId), b.discountRate ?? null]),
    )
    venueList.value.forEach((v) => {
      v.discountRate = venueMap.get(String(v.id)) ?? null
    })
  } catch {
    // 读取失败保持为空
  }
}

/** 保存选中平台卡在各球馆的折扣率 */
async function saveVenueDiscounts() {
  const planId = discountPlanId.value
  if (!planId) return
  const payload = venueList.value
    .filter((v) => v.acceptPlatformCard === 1 && v.discountRate != null && v.discountRate < 1)
    .map((v) => ({
      planId,
      benefitType: 'VENUE_DISCOUNT' as const,
      venueId: v.id,
      discountRate: v.discountRate,
    }))
  discountSaving.value = true
  try {
    await saveVipPlanBenefits(planId, payload)
    message.success('平台卡折扣配置已保存')
  } finally {
    discountSaving.value = false
  }
}

// ===== Tab3 已购平台卡会员 =====
const membershipColumns: TableColumnsType = [
  { title: '球友姓名', dataIndex: 'userName', width: 120 },
  { title: '手机号', dataIndex: 'userPhone', width: 140 },
  { title: '平台卡', dataIndex: 'vipPlanName', width: 160 },
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
  refresh: refreshMemberships,
  resetQuery: resetMembershipQuery,
  handleTableChange: handleMembershipTableChange,
} = useTable<VipMembershipQuery, VipMembership>({
  fetchApi: getVipMemberships,
  initialQuery: { vipPlanId: undefined, status: undefined, planType: 'platform' },
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

onMounted(() => {
  loadPlanList()
  loadVenues()
  refreshMemberships()
})
</script>

<style scoped lang="scss">
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

.page-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 16px 20px;
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
</style>
