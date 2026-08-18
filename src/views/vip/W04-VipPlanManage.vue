<template>
  <div class="page-container">
    <!-- 顶部统计卡 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">在架套餐数</div>
        <div class="stat-value text-primary">{{ activePlanCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已购权益会员数</div>
        <div class="stat-value">{{ membershipTotal }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">月度新增</div>
        <div class="stat-value text-success">{{ monthNewCount }}</div>
      </div>
    </div>

    <!-- VIP 套餐列表卡片网格 -->
    <div class="page-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <span class="section-title">VIP 套餐</span>
        </div>
        <a-button type="primary" @click="openCreatePlan">
          <plus-outlined />
          新建套餐
        </a-button>
      </div>

      <a-spin :spinning="planLoading">
        <a-row v-if="planList.length" :gutter="[16, 16]">
          <a-col v-for="plan in planList" :key="plan.id" :span="8">
            <a-card class="plan-card" :bordered="true">
              <div class="plan-card-header">
                <div class="plan-name">
                  {{ plan.name }}
                  <a-tag :color="plan.planType === 'platform' ? 'purple' : 'blue'" style="margin-left: 6px">
                    {{ plan.planType === 'platform' ? '平台卡' : '球馆卡' }}
                  </a-tag>
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
                <a-button size="small" type="primary" ghost @click="message.info('折扣配置开发中')">
                  <thunderbolt-outlined />
                  配置折扣
                </a-button>
                <a-popconfirm title="确认删除该套餐？" @confirm="deletePlan(plan)">
                  <a-button size="small" danger>
                    <delete-outlined />
                    删除
                  </a-button>
                </a-popconfirm>
              </div>
            </a-card>
          </a-col>
        </a-row>
        <a-empty v-else description="暂无套餐，点击右上角新建" />
      </a-spin>
    </div>

    <!-- 已购 VIP 权益会员表格 -->
    <div class="page-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <span class="section-title">已购 VIP 权益会员</span>
          <a-select
            v-model:value="filterPlanId"
            placeholder="套餐"
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

    <!-- 新建/编辑套餐 Modal -->
    <a-modal
      v-model:open="formModalOpen"
      :title="isEdit ? '编辑套餐' : '新建套餐'"
      :confirm-loading="submitting"
      :width="480"
      @ok="submitPlan"
    >
      <a-form ref="planFormRef" :model="planForm" :rules="planRules" layout="vertical">
        <a-form-item label="套餐名称" name="name">
          <a-input v-model:value="planForm.name" placeholder="如 月度 VIP" />
        </a-form-item>
        <a-form-item label="卡类型" name="planType">
          <a-radio-group v-model:value="planForm.planType" :disabled="isEdit">
            <a-radio-button value="venue">球馆卡</a-radio-button>
            <a-radio-button value="platform">平台卡</a-radio-button>
          </a-radio-group>
          <div class="form-tip">平台卡仅平台管理员可配置，全平台球馆通用（需球馆开通）</div>
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

    <!-- 折扣配置 Drawer -->
    <a-drawer
      v-model:open="discountDrawerOpen"
      :title="`配置折扣 - ${currentPlan?.name || ''}`"
      width="560"
      :destroy-on-close="true"
    >
      <a-spin :spinning="discountLoading">
        <a-alert
          type="info"
          show-icon
          message="折扣率范围 0.1-1.0, 0.8 表示 8 折; 未配置或 1.0 视为不享受折扣"
          style="margin-bottom: 16px"
        />
        <a-form layout="vertical">
          <a-form-item
            v-for="d in drawerDiscounts"
            :key="d.venueId"
            :label="d.venueName"
          >
            <a-input-number
              v-model:value="d.discountRate"
              :min="0.1"
              :max="1"
              :step="0.05"
              style="width: 200px"
            />
            <span class="discount-hint">{{ discountLabel(d.discountRate) }}</span>
          </a-form-item>
        </a-form>
        <a-empty v-if="!drawerDiscounts.length" description="暂无球馆" />

        <!-- 折扣效果预览 -->
        <div class="preview-section">
          <div class="section-title">折扣效果预览</div>
          <a-row :gutter="12">
            <a-col :span="12">
              <a-select
                v-model:value="previewVenueId"
                placeholder="选择球馆"
                :options="venueOptions"
                allow-clear
                style="width: 100%"
              />
            </a-col>
            <a-col :span="12">
              <a-input-number
                v-model:value="previewOriginPrice"
                :min="0"
                :step="10"
                placeholder="原价(元)"
                style="width: 100%"
              />
            </a-col>
          </a-row>
          <div class="preview-result">
            <template v-if="previewVenueId == null || previewOriginPrice == null">
              <span class="text-muted">请选择球馆并输入原价</span>
            </template>
            <template v-else-if="previewDiscountRate == null || previewDiscountRate >= 1">
              <span class="text-muted">该球馆不享受折扣</span>
            </template>
            <template v-else>
              <span class="preview-final">¥ {{ previewFinalPrice?.toFixed(2) }}</span>
              <span class="preview-origin">
                原价 ¥ {{ previewOriginPrice?.toFixed(2) }} · {{ discountLabel(previewDiscountRate) }}
              </span>
            </template>
          </div>
        </div>
      </a-spin>

      <template #footer>
        <div class="drawer-footer">
          <a-button style="margin-right: 8px" @click="discountDrawerOpen = false">取消</a-button>
          <a-button type="primary" :loading="discountSaving" @click="submitDiscounts">
            保存折扣
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
  getVipPlanVenueDiscounts,
  saveVipPlanVenueDiscounts,
  getVipMemberships,
  getAllVenues,
  type VipMembershipQuery,
} from '@/api/vip'
import type {
  VipPlan,
  VipPlanVenue,
  VipMembership,
  VipPlanStatus,
  Venue,
} from '@/types/models'

// ===== 工具 =====
/** 分转元, 保留两位小数 */
function formatFen(fen: number | undefined): string {
  if (fen === undefined || fen === null) return '0.00'
  return (fen / 100).toFixed(2)
}

/** 折扣率转文案 0.8 -> "8.0 折" */
function discountLabel(rate: number): string {
  return `${(rate * 10).toFixed(1)} 折`
}

// ===== 已购权益会员表格(useTable 分页) =====
const membershipColumns: TableColumnsType = [
  { title: '球友姓名', dataIndex: 'userName', width: 120 },
  { title: '手机号', dataIndex: 'userPhone', width: 140 },
  { title: '套餐', dataIndex: 'vipPlanName', width: 160 },
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
  initialQuery: { vipPlanId: undefined, status: undefined },
})

const filterPlanId = ref<number | undefined>(undefined)
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

// ===== VIP 套餐列表 =====
const planLoading = ref(false)
const planList = ref<VipPlan[]>([])

async function loadPlanList() {
  planLoading.value = true
  try {
    const res = await getVipPlanList({ page: 1, size: 100 })
    planList.value = res.list || []
  } catch {
    planList.value = []
  } finally {
    planLoading.value = false
  }
}

// 套餐筛选下拉选项
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

// ===== 新建/编辑套餐 =====
const formModalOpen = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const planFormRef = ref<FormInstance>()
const editingPlanId = ref(0)
const planForm = reactive<{
  name: string
  planType: 'platform' | 'venue'
  price: number       // 元
  durationMonths: number
  status: VipPlanStatus
}>({
  name: '',
  planType: 'venue',
  price: 0,
  durationMonths: 1,
  status: 'active',
})
const planRules = {
  name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入套餐价格', trigger: 'blur', type: 'number' }],
  durationMonths: [{ required: true, message: '请输入有效期(月)', trigger: 'blur', type: 'number' }],
}

function openCreatePlan() {
  isEdit.value = false
  Object.assign(planForm, { name: '', planType: 'venue', price: 0, durationMonths: 1, status: 'active' })
  formModalOpen.value = true
}
function openEditPlan(plan: VipPlan) {
  isEdit.value = true
  editingPlanId.value = plan.id
  Object.assign(planForm, {
    name: plan.name,
    planType: plan.planType || 'venue',
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
      planType: planForm.planType,
      price: Math.round(planForm.price * 100),   // 元转分
      durationMonths: planForm.durationMonths,
      status: planForm.status,
    }
    if (isEdit.value) {
      await updateVipPlan(editingPlanId.value, payload)
      message.success('套餐更新成功')
    } else {
      await createVipPlan(payload)
      message.success('套餐创建成功')
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
  message.success('套餐已删除')
  loadPlanList()
}

// ===== 折扣配置 Drawer =====
type DrawerDiscount = VipPlanVenue & { venueName: string }

const discountDrawerOpen = ref(false)
const discountLoading = ref(false)
const discountSaving = ref(false)
const currentPlan = ref<VipPlan | null>(null)
const allVenues = ref<Venue[]>([])
const drawerDiscounts = ref<DrawerDiscount[]>([])

const venueOptions = computed(() =>
  allVenues.value.map((v) => ({ label: v.name, value: v.id })),
)

async function openDiscountDrawer(plan: VipPlan) {
  currentPlan.value = plan
  discountDrawerOpen.value = true
  // 预览区重置
  previewVenueId.value = undefined
  previewOriginPrice.value = undefined
  discountLoading.value = true
  try {
    const [venues, discounts] = await Promise.all([
      getAllVenues(),
      getVipPlanVenueDiscounts(plan.id),
    ])
    allVenues.value = venues || []
    drawerDiscounts.value = allVenues.value.map((v) => {
      const exist = (discounts || []).find((d) => d.venueId === v.id)
      return {
        vipPlanId: plan.id,
        venueId: v.id,
        venueName: v.name,
        discountRate: exist ? exist.discountRate : 1,
      }
    })
  } catch {
    allVenues.value = []
    drawerDiscounts.value = []
  } finally {
    discountLoading.value = false
  }
}

/** 取球馆折扣率(未配置视为 1.0) */
function getVenueDiscountRate(venueId: number): number {
  const d = drawerDiscounts.value.find((x) => x.venueId === venueId)
  return d ? d.discountRate : 1
}

async function submitDiscounts() {
  if (!currentPlan.value) return
  discountSaving.value = true
  try {
    await saveVipPlanVenueDiscounts(currentPlan.value.id, drawerDiscounts.value)
    message.success('折扣配置已保存')
    discountDrawerOpen.value = false
    loadPlanList()
  } finally {
    discountSaving.value = false
  }
}

// ===== 折扣效果预览 =====
const previewVenueId = ref<number | undefined>(undefined)
const previewOriginPrice = ref<number | undefined>(undefined)

const previewDiscountRate = computed(() => {
  if (previewVenueId.value == null) return null
  return getVenueDiscountRate(previewVenueId.value)
})

const previewFinalPrice = computed(() => {
  if (previewVenueId.value == null || previewOriginPrice.value == null) return null
  const rate = previewDiscountRate.value
  if (rate == null || rate >= 1) return null
  return previewOriginPrice.value * rate
})

// ===== 初始化加载 =====
onMounted(() => {
  loadPlanList()
  loadMembershipList()
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

// ===== 套餐卡片 =====
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

// ===== 折扣配置 =====
.discount-hint {
  margin-left: 12px;
  font-size: 13px;
  color: #059669;
  font-weight: 600;
}

.preview-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  .section-title {
    display: block;
    margin-bottom: 12px;
    margin-right: 0;
  }
  .preview-result {
    margin-top: 12px;
    min-height: 32px;
    display: flex;
    align-items: baseline;
    gap: 12px;
    .preview-final {
      font-size: 22px;
      font-weight: 700;
      color: #16a34a;
    }
    .preview-origin {
      font-size: 12px;
      color: #94a3b8;
    }
  }
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
