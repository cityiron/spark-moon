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
          <a-select
            v-if="isSuperAdmin"
            v-model:value="filterOperatorId"
            placeholder="选择俱乐部"
            style="width: 220px"
            allow-clear
            show-search
            option-filter-prop="label"
            :options="operatorOptions"
            @change="reloadAll"
          />
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
                  <a-tag v-if="plan.operatorId" color="cyan">{{ operatorNameMap[String(plan.operatorId)] || '俱乐部' }}</a-tag>
                  <a-tag v-if="plan.productType === 'TIMES_CARD'" color="gold">次卡</a-tag>
                  <a-tag v-else-if="plan.productType === 'MONTHLY_CARD'" color="purple">月卡</a-tag>
                  <a-tag v-else color="green">订阅</a-tag>
                </div>
                <a-tag v-if="plan.status === 'active'" color="green">在架</a-tag>
                <a-tag v-else color="default">下架</a-tag>
              </div>
              <div class="plan-price">
                ¥ {{ formatFen(plan.price) }}<span v-if="plan.productType === 'SUBSCRIBE'" class="plan-price-unit">/月</span>
              </div>
              <div class="plan-meta">
                有效期：{{ plan.durationMonths }} 个月
                <template v-if="plan.productType === 'TIMES_CARD'"> · 按次使用</template>
                <template v-else-if="plan.productType === 'MONTHLY_CARD'"> · 买断</template>
              </div>
              <div v-if="plan.productType === 'TIMES_CARD'" class="plan-restrict">
                {{ timesRestrictText(plan) }}
              </div>
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

      <!-- 等级统计窗口配置: 档位按近 N 个月累计充值匹配 -->
      <div class="stats-window-row">
        <span class="window-label">等级统计窗口</span>
        <a-input-number
          v-model:value="statsWindowMonths"
          :min="0"
          :max="120"
          :step="1"
          style="width: 120px"
          placeholder="12"
        />
        <span class="window-hint">个月（按近 N 个月累计充值匹配档位，0=不限）</span>
        <a-button
          type="primary"
          size="small"
          :loading="statsConfigSaving"
          @click="submitStatsConfig"
        >保存统计窗口</a-button>
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

    <!-- 充值赠送档位配置 -->
    <div class="page-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <span class="section-title">充值赠送档位</span>
          <a-alert
            type="info"
            show-icon
            class="tier-tip"
            message="用户充值满 minAmount 即赠送 giftAmount，到账余额=实付+赠送；赠送金额不参与累计充值等级计算"
          />
        </div>
        <div>
          <a-button style="margin-right: 8px" @click="loadGifts">刷新</a-button>
          <a-button type="primary" @click="addGift">新增档位</a-button>
        </div>
      </div>

      <a-spin :spinning="giftLoading">
        <a-table
          :columns="giftColumns"
          :data-source="giftList"
          row-key="rowKey"
          :pagination="false"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'minAmount'">
              <a-input-number
                v-model:value="record.minAmount"
                :min="0.01"
                :precision="2"
                :step="100"
                style="width: 140px"
              />
            </template>
            <template v-else-if="column.dataIndex === 'giftAmount'">
              <a-input-number
                v-model:value="record.giftAmount"
                :min="0.01"
                :precision="2"
                :step="50"
                style="width: 140px"
              />
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
              <a-button type="text" danger size="small" @click="removeGift(record)">
                <delete-outlined />
              </a-button>
            </template>
          </template>
        </a-table>

        <div class="drawer-footer" style="margin-top: 16px">
          <a-button type="primary" :loading="giftSaving" @click="submitGifts">
            保存赠送档位
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
          <template v-else-if="column.dataIndex === 'action'">
            <a @click="openRefund(record)">退款</a>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 会员卡退款 Modal -->
    <VipRefundModal
      v-model:open="refundModalOpen"
      :record="refundRecord"
      @success="refreshMemberships"
    />

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
        <a-form-item label="产品类型" name="productType">
          <a-select v-model:value="planForm.productType" :options="productTypeOptions" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :label="planForm.productType === 'SUBSCRIBE' ? '价格(元/月)' : '售价(元)'" name="price">
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
        <!-- 次卡双条件: 限定时段(星期+时间) + 价格上限 -->
        <template v-if="planForm.productType === 'TIMES_CARD'">
          <a-form-item label="可用星期（不选=不限）">
            <a-checkbox-group
              v-model:value="planForm.validWeekdays"
              :options="weekdayOptions"
            />
            <div class="form-tip">次卡仅限所选星期使用；不选则不限制星期</div>
          </a-form-item>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="可用开始时间（不填=不限）">
                <a-time-picker
                  v-model:value="planForm.timeStart"
                  format="HH:mm"
                  value-format="HH:mm"
                  placeholder="如 09:00"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="可用结束时间（不填=不限）">
                <a-time-picker
                  v-model:value="planForm.timeEnd"
                  format="HH:mm"
                  value-format="HH:mm"
                  placeholder="如 18:00"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="价格上限(元/小时)（不填=不限）">
            <a-input-number
              v-model:value="planForm.priceLimit"
              :min="0"
              :step="10"
              :precision="2"
              style="width: 100%"
              placeholder="如 100"
            />
            <div class="form-tip">场次小时单价高于该值则该场次不可用；不填则不限制价格</div>
          </a-form-item>
        </template>
        <a-alert
          v-if="planForm.productType === 'TIMES_CARD'"
          type="info"
          show-icon
          message="次卡需在「配置权益」中添加「总次数」权益，作为开卡次数与退款折算依据；售价为整卡买断总价"
        />
        <a-alert
          v-else-if="planForm.productType === 'MONTHLY_CARD'"
          type="info"
          show-icon
          message="月卡为一次性买断，有效期月数即使用时长，到期后失效"
        />
        <a-form-item label="上架状态" name="status" style="margin-top: 16px">
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
          message="每张会员卡可配置多项权益：场地折扣（按球馆）、培训课程折扣、每月免费场次、活动报名折扣；次卡需配置「总次数」权益作为开卡次数与退款折算依据"
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
              <template v-else-if="b.benefitType === 'TOTAL_TIMES'">
                <a-input-number
                  v-model:value="b.freeSlots"
                  :min="1"
                  :step="10"
                  placeholder="整卡总次数"
                  style="width: 200px"
                />
                <span class="field-hint">整卡总次数（开卡次数与退款折算依据）</span>
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
  getRechargeGifts,
  saveRechargeGifts,
  getStatsConfig,
  saveStatsConfig,
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
  RechargeGift,
  Venue,
  OperatorApplication,
} from '@/types/models'
import VipRefundModal from '@/components/VipRefundModal.vue'
import { getOperatorList } from '@/api/operator'
import { useAuthStore } from '@/stores/auth'

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

// ===== 次卡限定时段工具 =====
const weekdayOptions = [
  { label: '周一', value: '1' },
  { label: '周二', value: '2' },
  { label: '周三', value: '3' },
  { label: '周四', value: '4' },
  { label: '周五', value: '5' },
  { label: '周六', value: '6' },
  { label: '周日', value: '7' },
]
const WEEKDAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
/** 星期集合(如 "1,2,3,4")转中文(周一~周四) */
function weekdayText(weekdays?: string): string {
  if (!weekdays) return ''
  const parts = weekdays
    .split(',')
    .map((d) => Number(d))
    .filter((n) => n >= 1 && n <= 7)
    .sort((a, b) => a - b)
  if (!parts.length) return ''
  // 连续区间合并为 "周一~周四"
  const segs: string[] = []
  let start = parts[0]
  let prev = parts[0]
  for (let i = 1; i <= parts.length; i++) {
    const cur = parts[i]
    if (cur === prev + 1) {
      prev = cur
      continue
    }
    segs.push(start === prev ? WEEKDAY_NAMES[start] : `${WEEKDAY_NAMES[start]}~${WEEKDAY_NAMES[prev]}`)
    start = cur
    prev = cur
  }
  return segs.join('、')
}
/** 次卡可用范围文案: 限定时段 + 价格上限 */
function timesRestrictText(plan: VipPlan): string {
  const parts: string[] = []
  const wd = weekdayText(plan.validWeekdays)
  if (wd) parts.push(wd)
  if (plan.timeStart || plan.timeEnd) {
    parts.push(`${plan.timeStart || '00:00'}~${plan.timeEnd || '24:00'}`)
  }
  if (plan.priceLimit != null && plan.priceLimit > 0) {
    parts.push(`单价≤¥${plan.priceLimit}/小时`)
  }
  return parts.length ? `可用范围：${parts.join(' · ')}` : '可用范围：不限时段与价格'
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
  { title: '操作', dataIndex: 'action', width: 80 },
]

const membershipStatusOptions = [
  { label: '有效', value: 'active' },
  { label: '已过期', value: 'expired' },
  { label: '已退款', value: 'refunded' },
]
function membershipStatusTag(s: 'active' | 'expired' | 'refunded'): { color: string, text: string } {
  if (s === 'active') return { color: 'green', text: '有效' }
  if (s === 'refunded') return { color: 'red', text: '已退款' }
  return { color: 'default', text: '已过期' }
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

// ===== 会员卡退款 =====
const refundModalOpen = ref(false)
const refundRecord = ref<VipMembership | null>(null)
function openRefund(record: VipMembership) {
  refundRecord.value = record
  refundModalOpen.value = true
}

// ===== 俱乐部会员卡列表 =====
const planLoading = ref(false)
const planList = ref<VipPlan[]>([])

// ===== 俱乐部筛选(超管) =====
const authStore = useAuthStore()
/** 是否平台超管(超管可跨俱乐部查看/筛选) */
const isSuperAdmin = computed(() => authStore.roles.includes('super_admin'))
/** 当前筛选的俱乐部(经营者主体) */
const filterOperatorId = ref<string | number | undefined>(undefined)
/** 经营者(俱乐部)下拉选项: 仅超管加载 */
const operatorOptions = ref<{ label: string, value: string | number }[]>([])
/** operatorId → 俱乐部名映射(卡片归属标注) */
const operatorNameMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const opt of operatorOptions.value) {
    map[String(opt.value)] = opt.label
  }
  return map
})

/** 加载已通过的经营者列表(俱乐部下拉) */
async function loadOperators() {
  try {
    const res = await getOperatorList({ page: 1, size: 999, status: 'approved' })
    operatorOptions.value = (res.list || []).map((o: OperatorApplication) => ({
      label: o.companyName,
      value: o.id,
    }))
  } catch {
    operatorOptions.value = []
  }
}

async function loadPlanList() {
  planLoading.value = true
  try {
    const res = await getVipPlanList({
      page: 1,
      size: 100,
      planType: 'venue',
      operatorId: isSuperAdmin.value ? filterOperatorId.value : undefined,
    })
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
  productType: 'SUBSCRIBE' | 'TIMES_CARD' | 'MONTHLY_CARD'
  status: VipPlanStatus
  validWeekdays: string[]
  timeStart: string   // HH:mm
  timeEnd: string     // HH:mm
  priceLimit: number | undefined
  operatorId: string | number | undefined  // 归属经营者(超管新建时指定)
}>({
  name: '',
  price: 0,
  durationMonths: 1,
  productType: 'SUBSCRIBE',
  status: 'active',
  validWeekdays: [],
  timeStart: '',
  timeEnd: '',
  priceLimit: undefined,
  operatorId: undefined,
})
const productTypeOptions = [
  { label: '订阅卡（按月付费，长期有效）', value: 'SUBSCRIBE' },
  { label: '次卡（按次使用，售完即止）', value: 'TIMES_CARD' },
  { label: '月卡（一次性买断）', value: 'MONTHLY_CARD' },
]
const planRules = {
  name: [{ required: true, message: '请输入会员卡名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入会员卡价格', trigger: 'blur', type: 'number' }],
  durationMonths: [{ required: true, message: '请输入有效期(月)', trigger: 'blur', type: 'number' }],
  productType: [{ required: true, message: '请选择产品类型', trigger: 'change' }],
}

function openCreatePlan() {
  // 超管新建球馆卡必须先选俱乐部(否则卡无归属, 会混入全部列表)
  if (isSuperAdmin.value && filterOperatorId.value == null) {
    message.warning('请先在上方选择要新建会员卡的俱乐部')
    return
  }
  isEdit.value = false
  Object.assign(planForm, {
    name: '',
    price: 0,
    durationMonths: 1,
    productType: 'SUBSCRIBE',
    status: 'active',
    validWeekdays: [],
    timeStart: '',
    timeEnd: '',
    priceLimit: undefined,
    // 超管新建球馆卡归属当前筛选的俱乐部
    operatorId: isSuperAdmin.value ? filterOperatorId.value : undefined,
  })
  formModalOpen.value = true
}
function openEditPlan(plan: VipPlan) {
  isEdit.value = true
  editingPlanId.value = plan.id
  Object.assign(planForm, {
    name: plan.name,
    price: plan.price / 100,    // 分转元
    durationMonths: plan.durationMonths,
    productType: plan.productType ?? 'SUBSCRIBE',
    status: plan.status,
    validWeekdays: (plan.validWeekdays || '').split(',').filter(Boolean),
    timeStart: plan.timeStart || '',
    timeEnd: plan.timeEnd || '',
    priceLimit: plan.priceLimit ?? undefined,
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
      productType: planForm.productType,
      price: Math.round(planForm.price * 100),   // 元转分
      durationMonths: planForm.durationMonths,
      status: planForm.status,
      // 次卡限定时段 + 价格上限(仅 TIMES_CARD 生效, 其余类型后端忽略)
      validWeekdays: planForm.productType === 'TIMES_CARD' && planForm.validWeekdays.length
        ? planForm.validWeekdays.join(',')
        : undefined,
      timeStart: planForm.productType === 'TIMES_CARD' ? (planForm.timeStart || undefined) : undefined,
      timeEnd: planForm.productType === 'TIMES_CARD' ? (planForm.timeEnd || undefined) : undefined,
      priceLimit: planForm.productType === 'TIMES_CARD' ? (planForm.priceLimit ?? undefined) : undefined,
      // 归属经营者(仅新建时指定; 编辑不改变归属)
      operatorId: isEdit.value ? undefined : planForm.operatorId,
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
  { label: '总次数（次卡）', value: 'TOTAL_TIMES' },
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
    discountRate: type === 'FREE_SLOT' || type === 'TOTAL_TIMES' ? null : 0.9,
    freeSlots: type === 'FREE_SLOT' || type === 'TOTAL_TIMES' ? 30 : null,
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
  if (b.benefitType !== 'FREE_SLOT' && b.benefitType !== 'TOTAL_TIMES') {
    b.freeSlots = null
  }
  if (b.benefitType === 'FREE_SLOT' || b.benefitType === 'TOTAL_TIMES') {
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
    if (b.benefitType === 'TOTAL_TIMES' && (b.freeSlots == null || b.freeSlots <= 0)) {
      message.warning('次卡总次数需大于 0')
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
  // 次卡产品必须配置总次数权益（开卡次数与退款折算依据）
  if (currentPlan.value?.productType === 'TIMES_CARD' && !benefitForm.value.some((b) => b.benefitType === 'TOTAL_TIMES')) {
    message.warning('次卡必须配置「总次数」权益')
    return
  }
  benefitSaving.value = true
  try {
    const payload = benefitForm.value.map((b) => ({
      planId,
      benefitType: b.benefitType,
      // 场地折扣: 0 表示全部球馆(统一折扣) → 保存为 null
      venueId: b.benefitType === 'VENUE_DISCOUNT' ? (b.venueId === 0 ? null : b.venueId) : null,
      discountRate: b.discountRate ?? null,
      freeSlots: b.benefitType === 'FREE_SLOT' || b.benefitType === 'TOTAL_TIMES' ? b.freeSlots : null,
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
    const list = await getRechargeTiers(isSuperAdmin.value ? filterOperatorId.value : undefined)
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

// ===== 充值赠送档位 =====
type GiftRow = RechargeGift & { rowKey: number }

const giftColumns: TableColumnsType = [
  { title: '充值满(元)', dataIndex: 'minAmount', width: 200 },
  { title: '赠送金额(元)', dataIndex: 'giftAmount', width: 200 },
  { title: '状态', dataIndex: 'status', width: 120 },
  { title: '操作', dataIndex: 'action', width: 60 },
]

const giftLoading = ref(false)
const giftSaving = ref(false)
const giftList = ref<GiftRow[]>([])

function normalizeGift(g: RechargeGift): GiftRow {
  return {
    ...g,
    rowKey: nextTierKey(),
    minAmount: Number(g.minAmount ?? 0),
    giftAmount: Number(g.giftAmount ?? 0),
    status: g.status === 0 ? 0 : 1,
  }
}

async function loadGifts() {
  giftLoading.value = true
  try {
    const list = await getRechargeGifts(isSuperAdmin.value ? filterOperatorId.value : undefined)
    giftList.value = (list || []).map(normalizeGift)
  } catch {
    giftList.value = []
  } finally {
    giftLoading.value = false
  }
}

/** 切换筛选俱乐部时, 会员卡/储值档位/赠送档位三块一起重载 */
function reloadAll() {
  return Promise.allSettled([loadPlanList(), loadTiers(), loadGifts()])
}

function addGift() {
  giftList.value.push(normalizeGift({
    minAmount: 500,
    giftAmount: 50,
    status: 1,
  }))
}

function removeGift(record: GiftRow) {
  const idx = giftList.value.findIndex((g) => g.rowKey === record.rowKey)
  if (idx >= 0) giftList.value.splice(idx, 1)
}

async function submitGifts() {
  for (const g of giftList.value) {
    if (!g.minAmount || g.minAmount <= 0) {
      message.warning('充值金额必须大于 0')
      return
    }
    if (!g.giftAmount || g.giftAmount <= 0) {
      message.warning('赠送金额必须大于 0')
      return
    }
  }
  giftSaving.value = true
  try {
    const payload = giftList.value.map((g) => ({
      minAmount: g.minAmount,
      giftAmount: g.giftAmount,
      status: g.status,
    }))
    await saveRechargeGifts(payload)
    message.success('充值赠送档位已保存')
    loadGifts()
  } finally {
    giftSaving.value = false
  }
}

// ===== 等级统计窗口配置 =====
const statsWindowMonths = ref<number | undefined>(12)
const statsConfigSaving = ref(false)

async function loadStatsConfig() {
  try {
    const cfg = await getStatsConfig()
    statsWindowMonths.value = cfg?.statsWindowMonths ?? 12
  } catch {
    statsWindowMonths.value = 12
  }
}

async function submitStatsConfig() {
  const months = statsWindowMonths.value
  if (months == null || months < 0 || months > 120) {
    message.warning('统计窗口需在 0~120 个月之间')
    return
  }
  statsConfigSaving.value = true
  try {
    await saveStatsConfig(months)
    message.success('统计窗口已保存')
  } finally {
    statsConfigSaving.value = false
  }
}

// ===== 初始化加载 =====
onMounted(() => {
  if (isSuperAdmin.value) {
    // 超管: 先加载俱乐部列表, 默认选中第一个并按它过滤
    loadOperators().then(() => {
      if (filterOperatorId.value == null && operatorOptions.value.length) {
        filterOperatorId.value = operatorOptions.value[0].value
      }
      reloadAll()
    })
  } else {
    loadPlanList()
    loadTiers()
    loadGifts()
  }
  loadMembershipList()
  loadStatsConfig()
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

// ===== 等级统计窗口 =====
.stats-window-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  .window-label {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
  }
  .window-hint {
    font-size: 12px;
    color: #94a3b8;
    margin-right: 8px;
  }
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
  .plan-restrict {
    margin-top: 6px;
    padding: 6px 8px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    font-size: 12px;
    color: #166534;
    line-height: 1.5;
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
