<template>
  <div class="page-container">
    <!-- 顶部统计卡（参照原型 W03 stats-row） -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">持卡会员</div>
        <div class="stat-value text-primary">{{ stats.totalMembers }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">储值卡余额合计</div>
        <div class="stat-value">¥ {{ formatFen(stats.totalBalance) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">次卡剩余次数</div>
        <div class="stat-value text-accent">{{ stats.totalRemainingTimes }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本月充值</div>
        <div class="stat-value text-success">¥ {{ formatFen(stats.monthRecharge) }}</div>
      </div>
    </div>

    <div class="page-card">
      <!-- 搜索栏 -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="姓名 / 手机号 / 卡号"
            style="width: 260px"
            allow-clear
            @search="handleSearch"
          />
          <a-select
            v-model:value="searchCardType"
            placeholder="卡类型"
            style="width: 140px"
            allow-clear
            :options="cardTypeOptions"
            @change="handleSearch"
          />
          <a-select
            v-model:value="searchCardStatus"
            placeholder="卡状态"
            style="width: 140px"
            allow-clear
            :options="cardStatusOptions"
            @change="handleSearch"
          />
          <a-button @click="handleReset">重置</a-button>
        </div>
        <a-button type="primary" @click="openCreate">
          <plus-outlined />
          新增会员
        </a-button>
      </div>

      <!-- 会员表格 -->
      <a-table
        :columns="columns"
        :data-source="dataList"
        :loading="loading"
        row-key="id"
        :pagination="pagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'name'">
            <a-space>
              <a-avatar :size="32" :src="record.avatar">
                {{ record.name?.charAt(0) }}
              </a-avatar>
              <div>
                <div>{{ record.name }}</div>
                <div class="sub-text">{{ record.phone }}</div>
              </div>
            </a-space>
          </template>
          <template v-else-if="column.dataIndex === 'cardType'">
            <a-tag :color="cardTypeColor(record.cardType)">{{ cardTypeLabel(record.cardType) }}</a-tag>
            <div class="sub-text">{{ record.cardNo }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'balanceOrTimes'">
            <span v-if="record.cardType === 'stored_value'" class="balance-text">¥ {{ formatFen(record.balance) }}</span>
            <span v-else-if="record.cardType === 'times_card'">剩余 {{ record.remainingTimes ?? 0 }} 次</span>
            <span v-else class="text-muted">不限次</span>
          </template>
          <template v-else-if="column.dataIndex === 'expireDate'">
            <span v-if="record.cardType === 'monthly_card'">{{ record.expireDate || '长期有效' }}</span>
            <span v-else-if="record.cardType === 'times_card'">{{ record.expireDate || '-' }}</span>
            <span v-else class="text-muted">长期有效</span>
          </template>
          <template v-else-if="column.dataIndex === 'cardStatus'">
            <a-badge :status="cardStatusBadge(record.cardStatus, record)" :text="cardStatusLabel(record.cardStatus, record)" />
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space>
              <a @click="openRecharge(record)">充值</a>
              <a-divider type="vertical" />
              <a @click="openAdjust(record)">调整</a>
              <a-divider type="vertical" />
              <a @click="openTransactions(record)">流水</a>
              <a-divider type="vertical" />
              <a @click="openRefund(record)">退款</a>
              <a-dropdown>
                <a class="more-link">更多 <down-outlined /></a>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="openEdit(record)">编辑</a-menu-item>
                    <a-menu-item v-if="record.cardStatus === 'active'" @click="toggleStatus(record, 'frozen')">冻结</a-menu-item>
                    <a-menu-item v-if="record.cardStatus === 'frozen'" @click="toggleStatus(record, 'active')">解冻</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新增/编辑会员 Modal -->
    <a-modal
      v-model:open="formModalOpen"
      :title="isEdit ? '编辑会员' : '新增会员'"
      :confirm-loading="submitting"
      :width="560"
      @ok="submitMember"
    >
      <a-form ref="memberFormRef" :model="memberForm" :rules="memberRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="姓名" name="name">
              <a-input v-model:value="memberForm.name" placeholder="请输入姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机号" name="phone">
              <a-input v-model:value="memberForm.phone" placeholder="请输入手机号" :maxlength="11" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="性别" name="gender">
              <a-radio-group v-model:value="memberForm.gender">
                <a-radio value="male">男</a-radio>
                <a-radio value="female">女</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="会员卡类型" name="cardType">
              <a-select v-model:value="memberForm.cardType" :options="cardTypeOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="办卡日期" name="joinDate">
              <a-date-picker
                v-model:value="memberForm.joinDate"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="memberForm.cardType !== 'stored_value'" :span="12">
            <a-form-item label="到期日期" name="expireDate">
              <a-date-picker
                v-model:value="memberForm.expireDate"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <!-- 储值卡：初始充值金额；次卡：初始次数；月卡：不填（不限次或按 expireDate） -->
        <a-form-item v-if="!isEdit && memberForm.cardType === 'stored_value'" label="初始充值金额(元)" name="initAmount">
          <a-input-number
            v-model:value="memberForm.initAmount"
            :min="0"
            :step="100"
            style="width: 100%"
            placeholder="0"
          />
        </a-form-item>
        <a-form-item v-if="!isEdit && memberForm.cardType === 'times_card'" label="初始次数" name="initTimes">
          <a-input-number
            v-model:value="memberForm.initTimes"
            :min="0"
            :step="10"
            style="width: 100%"
            placeholder="0"
          />
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="memberForm.remark" :rows="2" placeholder="备注信息" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 充值 Modal -->
    <a-modal
      v-model:open="rechargeModalOpen"
      title="会员充值"
      :confirm-loading="submitting"
      :width="440"
      @ok="submitRecharge"
    >
      <div v-if="currentMember" class="modal-member-info">
        <a-avatar :src="currentMember.avatar">{{ currentMember.name?.charAt(0) }}</a-avatar>
        <div>
          <div class="info-name">{{ currentMember.name }}</div>
          <div class="sub-text">
            <span v-if="currentMember.cardType === 'stored_value'">
              当前余额: <span class="balance-text">¥ {{ formatFen(currentMember.balance) }}</span>
            </span>
            <span v-else-if="currentMember.cardType === 'times_card'">
              剩余次数: <span class="balance-text">{{ currentMember.remainingTimes ?? 0 }} 次</span>
            </span>
            <span v-else>月卡会员</span>
          </div>
        </div>
      </div>
      <a-form ref="rechargeFormRef" :model="rechargeForm" :rules="rechargeRules" layout="vertical" style="margin-top: 16px">
        <!-- 储值卡：充值金额；次卡：充值次数 -->
        <a-form-item v-if="currentMember?.cardType === 'times_card'" label="充值次数" name="times">
          <a-input-number
            v-model:value="rechargeForm.times"
            :min="1"
            :step="10"
            style="width: 100%"
            placeholder="请输入充值次数"
          />
          <div class="quick-amount">
            <a-button v-for="t in [10, 20, 30, 50, 100]" :key="t" size="small" @click="rechargeForm.times = t">
              {{ t }} 次
            </a-button>
          </div>
        </a-form-item>
        <a-form-item v-else label="充值金额(元)" name="amount">
          <a-input-number
            v-model:value="rechargeForm.amount"
            :min="1"
            :step="100"
            style="width: 100%"
            placeholder="请输入充值金额"
          />
          <div class="quick-amount">
            <a-button v-for="a in [100, 200, 500, 1000, 2000]" :key="a" size="small" @click="rechargeForm.amount = a">
              ¥{{ a }}
            </a-button>
          </div>
        </a-form-item>
        <a-form-item v-if="currentMember?.cardType !== 'times_card'" label="赠送金额(元)" name="giftAmount">
          <a-input-number
            v-model:value="rechargeForm.giftAmount"
            :min="0"
            :step="10"
            style="width: 100%"
            placeholder="0"
          />
        </a-form-item>
        <a-form-item label="支付方式" name="payMethod">
          <a-radio-group v-model:value="rechargeForm.payMethod">
            <a-radio-button value="wechat">微信</a-radio-button>
            <a-radio-button value="alipay">支付宝</a-radio-button>
            <a-radio-button value="cash">现金</a-radio-button>
            <a-radio-button value="card">银行卡</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-input v-model:value="rechargeForm.remark" placeholder="备注信息" />
        </a-form-item>
        <a-alert
          v-if="rechargePreviewText"
          type="info"
          show-icon
          :message="rechargePreviewText"
        />
      </a-form>
    </a-modal>

    <!-- 余额调整 Modal -->
    <a-modal
      v-model:open="adjustModalOpen"
      title="余额调整"
      :confirm-loading="submitting"
      :width="440"
      @ok="submitAdjust"
    >
      <a-alert
        message="余额调整会直接修改会员余额, 请谨慎操作并填写原因"
        type="warning"
        show-icon
        style="margin-bottom: 16px"
      />
      <div v-if="currentMember" class="modal-member-info">
        <a-avatar :src="currentMember.avatar">{{ currentMember.name?.charAt(0) }}</a-avatar>
        <div>
          <div class="info-name">{{ currentMember.name }}</div>
          <div class="sub-text">
            <span v-if="currentMember.cardType === 'stored_value'">
              当前余额: <span class="balance-text">¥ {{ formatFen(currentMember.balance) }}</span>
            </span>
            <span v-else-if="currentMember.cardType === 'times_card'">
              剩余次数: <span class="balance-text">{{ currentMember.remainingTimes ?? 0 }} 次</span>
            </span>
            <span v-else>月卡会员</span>
          </div>
        </div>
      </div>
      <a-form ref="adjustFormRef" :model="adjustForm" :rules="adjustRules" layout="vertical" style="margin-top: 16px">
        <a-form-item v-if="currentMember?.cardType === 'times_card'" label="调整次数" name="times">
          <a-input-number
            v-model:value="adjustForm.times"
            style="width: 100%"
            placeholder="正数为增加, 负数为扣减"
          />
        </a-form-item>
        <a-form-item v-else label="调整金额(元)" name="amount">
          <a-input-number
            v-model:value="adjustForm.amount"
            style="width: 100%"
            placeholder="正数为增加, 负数为扣减"
          />
        </a-form-item>
        <a-form-item label="调整原因" name="reason">
          <a-select
            v-model:value="adjustForm.reason"
            placeholder="请选择调整原因"
            :options="adjustReasonOptions"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="详细说明" name="remark">
          <a-textarea v-model:value="adjustForm.remark" :rows="2" placeholder="请填写详细说明" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 退款 Modal -->
    <a-modal
      v-model:open="refundModalOpen"
      title="会员退款"
      :confirm-loading="submitting"
      :width="460"
      @ok="submitRefund"
    >
      <div v-if="currentMember" class="modal-member-info">
        <a-avatar :src="currentMember.avatar">{{ currentMember.name?.charAt(0) }}</a-avatar>
        <div>
          <div class="info-name">{{ currentMember.name }} · {{ cardTypeLabel(currentMember.cardType) }}</div>
          <div class="sub-text">
            <span v-if="currentMember.cardType === 'stored_value'">
              当前余额: <span class="balance-text">¥ {{ formatFen(currentMember.balance) }}</span> · 累计消费 ¥ {{ formatFen(currentMember.totalConsume) }}
            </span>
            <span v-else-if="currentMember.cardType === 'times_card'">
              剩余 {{ currentMember.remainingTimes ?? 0 }} 次
            </span>
            <span v-else>月卡 · 到期 {{ currentMember.expireDate || '-' }}</span>
          </div>
        </div>
      </div>
      <a-alert
        type="warning"
        show-icon
        style="margin: 12px 0"
        :message="refundRuleText"
      />
      <a-form ref="refundFormRef" :model="refundForm" :rules="refundRules" layout="vertical">
        <a-form-item label="可退金额(元)" name="refundableAmount">
          <a-input-number
            :value="refundableAmount"
            :disabled="true"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="实际退款金额(元)" name="amount">
          <a-input-number
            v-model:value="refundForm.amount"
            :min="0"
            :max="refundableAmount"
            :step="10"
            style="width: 100%"
            placeholder="不超过可退金额"
          />
        </a-form-item>
        <a-form-item label="退款方式" name="refundMethod">
          <a-radio-group v-model:value="refundForm.refundMethod">
            <a-radio value="balance">退到会员卡余额</a-radio>
            <a-radio value="wechat">原路退回微信</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="退款原因" name="reason">
          <a-select
            v-model:value="refundForm.reason"
            placeholder="请选择退款原因"
            :options="refundReasonOptions"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="refundForm.remark" :rows="2" placeholder="补充说明" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 交易记录 Drawer -->
    <a-drawer
      v-model:open="transactionDrawerOpen"
      :title="`交易记录 - ${currentMember?.name || ''}`"
      width="560"
      :destroy-on-close="true"
    >
      <div class="tx-filter-bar">
        <a-select
          v-model:value="txFilterType"
          :options="txTypeFilterOptions"
          placeholder="流水类型"
          style="width: 140px"
          allow-clear
          @change="filterTransactions"
        />
      </div>
      <a-spin :spinning="txLoading">
        <a-timeline v-if="filteredTransactions.length > 0">
          <a-timeline-item
            v-for="tx in filteredTransactions"
            :key="tx.id"
            :color="txColor(tx.type)"
          >
            <div class="tx-item">
              <div class="tx-header">
                <span class="tx-type">{{ txTypeLabel(tx.type) }}</span>
                <span
                  class="tx-amount"
                  :class="tx.amount >= 0 ? 'plus' : 'minus'"
                >
                  {{ tx.amount >= 0 ? '+' : '' }}<span v-if="tx.timesDelta !== undefined && tx.timesDelta !== null">{{ tx.timesDelta > 0 ? '+' : '' }}{{ tx.timesDelta }} 次</span><span v-else>¥ {{ formatFen(Math.abs(tx.amount)) }}</span>
                </span>
              </div>
              <div class="tx-meta">
                <span>{{ tx.createdAt }}</span>
                <span v-if="tx.payMethod"> · {{ payMethodLabel(tx.payMethod) }}</span>
                <span v-if="tx.orderNo"> · 订单 {{ tx.orderNo }}</span>
              </div>
              <div v-if="tx.remark" class="tx-remark">{{ tx.remark }}</div>
              <div class="tx-balance">
                <span v-if="tx.balanceAfter !== undefined && tx.balanceAfter !== null">变动后余额: ¥ {{ formatFen(tx.balanceAfter) }}</span>
                <span v-if="tx.timesAfter !== undefined && tx.timesAfter !== null"> · 剩余 {{ tx.timesAfter }} 次</span>
              </div>
            </div>
          </a-timeline-item>
        </a-timeline>
        <a-empty v-else description="暂无交易记录" />
      </a-spin>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message, type FormInstance, type TableColumnsType } from 'ant-design-vue'
import { PlusOutlined, DownOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import {
  getMemberList,
  getMemberStats,
  createMember,
  updateMember,
  toggleMemberStatus,
  recharge,
  adjustBalance,
  refundMember,
  getMemberTransactions,
  type MemberQuery,
} from '@/api/member'
import { useTable } from '@/composables/useTable'
import type {
  Member,
  MemberStats,
  CardType,
  CardStatus,
  CardTransaction,
  TransactionType,
} from '@/types/models'

// ===== 工具 =====
/** 分转元, 保留两位小数 */
function formatFen(fen: number | undefined): string {
  if (fen === undefined || fen === null) return '0.00'
  return (fen / 100).toFixed(2)
}

// ===== 映射 =====
const cardTypeOptions = [
  { label: '储值卡', value: 'stored_value' },
  { label: '次卡', value: 'times_card' },
  { label: '月卡', value: 'monthly_card' },
]
function cardTypeLabel(t: CardType): string {
  return cardTypeOptions.find((o) => o.value === t)?.label || t
}
function cardTypeColor(t: CardType): string {
  const map: Record<CardType, string> = {
    stored_value: 'blue',
    times_card: 'gold',
    monthly_card: 'purple',
  }
  return map[t] || 'default'
}

const cardStatusOptions = [
  { label: '正常', value: 'active' },
  { label: '冻结', value: 'frozen' },
  { label: '过期', value: 'expired' },
  { label: '停用', value: 'disabled' },
]
/** 状态文案（含余额不足/即将过期业务态） */
function cardStatusLabel(s: CardStatus, m: Member): string {
  // 业务态优先：储值卡余额低于 100 元（10000 分）显示"余额不足"
  if (s === 'active' && m.cardType === 'stored_value' && m.balance < 10000) return '余额不足'
  // 次卡剩余 ≤ 3 次、月卡 7 天内到期 显示"即将过期"
  if (s === 'active') {
    if (m.cardType === 'times_card' && (m.remainingTimes ?? 0) <= 3) return '即将过期'
    if (m.cardType === 'monthly_card' && m.expireDate) {
      const days = dayjs(m.expireDate).diff(dayjs(), 'day')
      if (days >= 0 && days <= 7) return '即将过期'
    }
  }
  return cardStatusOptions.find((o) => o.value === s)?.label || s
}
function cardStatusBadge(s: CardStatus, m: Member): 'success' | 'error' | 'warning' | 'default' {
  const label = cardStatusLabel(s, m)
  if (label === '余额不足' || label === '即将过期') return 'warning'
  const map: Record<CardStatus, 'success' | 'error' | 'warning' | 'default'> = {
    active: 'success',
    frozen: 'error',
    expired: 'warning',
    disabled: 'default',
  }
  return map[s] || 'default'
}

function payMethodLabel(m: string): string {
  const map: Record<string, string> = { wechat: '微信', alipay: '支付宝', cash: '现金', card: '银行卡', balance: '余额' }
  return map[m] || m
}

const txTypeFilterOptions = [
  { label: '全部', value: '' },
  { label: '充值', value: 'recharge' },
  { label: '消费', value: 'consume' },
  { label: '退款', value: 'refund' },
  { label: '调整', value: 'adjust' },
]
function txTypeLabel(t: TransactionType): string {
  const map: Record<TransactionType, string> = {
    recharge: '充值',
    consume: '消费',
    refund: '退款',
    adjust: '余额调整',
    lock: '冻结',
    unlock: '解冻',
  }
  return map[t] || t
}
function txColor(t: TransactionType): string {
  const map: Record<TransactionType, string> = {
    recharge: 'green',
    consume: 'gray',
    refund: 'blue',
    adjust: 'orange',
    lock: 'red',
    unlock: 'green',
  }
  return map[t] || 'blue'
}

const adjustReasonOptions = [
  '系统错误补偿',
  '手动赠送',
  '消费退款',
  '错误扣减纠正',
  '活动奖励',
  '其他',
]

const refundReasonOptions = [
  '会员申请退卡',
  '储值卡退款',
  '次卡退课',
  '月卡退订',
  '服务投诉补偿',
  '其他',
]

// ===== 统计 =====
const stats = reactive<MemberStats>({
  totalMembers: 0,
  totalBalance: 0,
  totalRemainingTimes: 0,
  monthRecharge: 0,
})
const statsLoading = ref(false)

async function loadStats() {
  statsLoading.value = true
  try {
    const data = await getMemberStats()
    Object.assign(stats, data)
  } catch {
    // 静默失败, 保持 0
  } finally {
    statsLoading.value = false
  }
}

// ===== 搜索 =====
const searchKeyword = ref('')
const searchCardType = ref<string | undefined>(undefined)
const searchCardStatus = ref<string | undefined>(undefined)

function handleSearch() {
  queryParams.keyword = searchKeyword.value || undefined
  queryParams.cardType = searchCardType.value
  queryParams.cardStatus = searchCardStatus.value
  refresh()
}
function handleReset() {
  searchKeyword.value = ''
  searchCardType.value = undefined
  searchCardStatus.value = undefined
  resetQuery()
}

// ===== 列表 =====
const columns: TableColumnsType = [
  { title: '会员', dataIndex: 'name', width: 200 },
  { title: '卡类型', dataIndex: 'cardType', width: 140 },
  { title: '余额 / 剩余', dataIndex: 'balanceOrTimes', width: 140, align: 'right' },
  { title: '有效期', dataIndex: 'expireDate', width: 120 },
  { title: '状态', dataIndex: 'cardStatus', width: 110 },
  { title: '办卡日期', dataIndex: 'joinDate', width: 120 },
  { title: '操作', dataIndex: 'action', width: 320, fixed: 'right' },
]

const {
  loading,
  dataList,
  queryParams,
  pagination,
  loadData: loadMemberList,
  refresh,
  resetQuery,
  handleTableChange,
} = useTable<MemberQuery, Member>({
  fetchApi: getMemberList,
  initialQuery: { keyword: '', cardType: undefined, cardStatus: undefined },
})

// ===== 新增/编辑 =====
const formModalOpen = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const memberFormRef = ref<FormInstance>()
const editingId = ref(0)
const memberForm = reactive<Partial<Member> & { initAmount?: number, initTimes?: number }>({
  name: '',
  phone: '',
  gender: 'male',
  cardType: 'stored_value',
  joinDate: dayjs().format('YYYY-MM-DD'),
  expireDate: '',
  remark: '',
  initAmount: 0,
  initTimes: 0,
})
const memberRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  cardType: [{ required: true, message: '请选择卡类型', trigger: 'change' }],
  joinDate: [{ required: true, message: '请选择办卡日期', trigger: 'change' }],
}

function openCreate() {
  isEdit.value = false
  Object.assign(memberForm, {
    name: '',
    phone: '',
    gender: 'male',
    cardType: 'stored_value',
    joinDate: dayjs().format('YYYY-MM-DD'),
    expireDate: '',
    remark: '',
    initAmount: 0,
    initTimes: 0,
  })
  formModalOpen.value = true
}

function openEdit(record: Member) {
  isEdit.value = true
  editingId.value = record.id
  Object.assign(memberForm, {
    name: record.name,
    phone: record.phone,
    gender: record.gender,
    cardType: record.cardType,
    joinDate: record.joinDate,
    expireDate: record.expireDate,
    remark: record.remark,
    initAmount: 0,
    initTimes: 0,
  })
  formModalOpen.value = true
}

async function submitMember() {
  await memberFormRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateMember(editingId.value, memberForm)
      message.success('会员更新成功')
    } else {
      await createMember(memberForm)
      message.success('会员创建成功')
    }
    formModalOpen.value = false
    loadMemberList()
    loadStats()
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(record: Member, status: string) {
  await toggleMemberStatus(record.id, status)
  message.success(status === 'frozen' ? '已冻结' : '已解冻')
  loadMemberList()
}

// ===== 充值 =====
const rechargeModalOpen = ref(false)
const rechargeFormRef = ref<FormInstance>()
const currentMember = ref<Member | null>(null)
const rechargeForm = reactive<{
  memberId: number
  amount: number
  times: number
  giftAmount: number
  payMethod: 'wechat' | 'alipay' | 'cash' | 'card'
  remark: string
}>({
  memberId: 0,
  amount: 0,
  times: 0,
  giftAmount: 0,
  payMethod: 'wechat',
  remark: '',
})
const rechargeRules = {
  amount: [{ required: false, message: '请输入充值金额', trigger: 'blur' }],
  times: [{ required: false, message: '请输入充值次数', trigger: 'blur' }],
  payMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
}

const rechargePreviewText = computed(() => {
  if (!currentMember.value) return ''
  if (currentMember.value.cardType === 'times_card') {
    if (!rechargeForm.times) return ''
    const after = (currentMember.value.remainingTimes ?? 0) + rechargeForm.times
    return `充值后剩余次数: ${after} 次`
  }
  // 储值卡
  if (!rechargeForm.amount) return ''
  const base = currentMember.value.balance || 0
  const add = (rechargeForm.amount + (rechargeForm.giftAmount || 0)) * 100
  return `充值后余额: ¥ ${formatFen(base + add)}`
})

function openRecharge(record: Member) {
  currentMember.value = record
  Object.assign(rechargeForm, {
    memberId: record.id,
    amount: 0,
    times: 0,
    giftAmount: 0,
    payMethod: 'wechat',
    remark: '',
  })
  // 根据卡类型切换必填规则
  rechargeRules.amount[0].required = record.cardType === 'stored_value'
  rechargeRules.times[0].required = record.cardType === 'times_card'
  rechargeModalOpen.value = true
}

async function submitRecharge() {
  await rechargeFormRef.value?.validate()
  submitting.value = true
  try {
    if (currentMember.value?.cardType === 'times_card') {
      // 次卡充值：后端约定 amount 用次数 * 单次价格(分) 估算，简化为直接传 times
      // 这里仍走 recharge 接口，amount=0，附加 times 字段（后端兼容）
      await recharge({
        memberId: rechargeForm.memberId,
        amount: 0,
        payMethod: rechargeForm.payMethod,
        remark: `充值 ${rechargeForm.times} 次${rechargeForm.remark ? ' · ' + rechargeForm.remark : ''}`,
      })
    } else {
      await recharge({
        memberId: rechargeForm.memberId,
        amount: rechargeForm.amount * 100,
        giftAmount: (rechargeForm.giftAmount || 0) * 100,
        payMethod: rechargeForm.payMethod,
        remark: rechargeForm.remark,
      })
    }
    message.success('充值成功')
    rechargeModalOpen.value = false
    loadMemberList()
    loadStats()
  } finally {
    submitting.value = false
  }
}

// ===== 余额调整 =====
const adjustModalOpen = ref(false)
const adjustFormRef = ref<FormInstance>()
const adjustForm = reactive<{
  memberId: number
  amount: number
  times: number
  reason: string
  remark: string
}>({
  memberId: 0,
  amount: 0,
  times: 0,
  reason: '',
  remark: '',
})
const adjustRules = {
  amount: [{ required: false, message: '请输入调整金额', trigger: 'blur' }],
  times: [{ required: false, message: '请输入调整次数', trigger: 'blur' }],
  reason: [{ required: true, message: '请选择调整原因', trigger: 'change' }],
}

function openAdjust(record: Member) {
  currentMember.value = record
  Object.assign(adjustForm, { memberId: record.id, amount: 0, times: 0, reason: '', remark: '' })
  adjustRules.amount[0].required = record.cardType !== 'times_card'
  adjustRules.times[0].required = record.cardType === 'times_card'
  adjustModalOpen.value = true
}

async function submitAdjust() {
  await adjustFormRef.value?.validate()
  // 校验调整后不为负
  if (currentMember.value?.cardType === 'times_card') {
    const after = (currentMember.value.remainingTimes ?? 0) + adjustForm.times
    if (after < 0) {
      message.warning('调整后次数不可为负')
      return
    }
  } else if (currentMember.value) {
    const after = currentMember.value.balance + adjustForm.amount * 100
    if (after < 0) {
      message.warning('调整后余额不可为负')
      return
    }
  }
  submitting.value = true
  try {
    await adjustBalance({
      memberId: adjustForm.memberId,
      amount: currentMember.value?.cardType === 'times_card' ? 0 : adjustForm.amount * 100,
      reason: adjustForm.reason,
      remark: currentMember.value?.cardType === 'times_card'
        ? `调整 ${adjustForm.times} 次 · ${adjustForm.reason}${adjustForm.remark ? ' · ' + adjustForm.remark : ''}`
        : adjustForm.remark,
    })
    message.success('余额调整成功')
    adjustModalOpen.value = false
    loadMemberList()
  } finally {
    submitting.value = false
  }
}

// ===== 退款 =====
const refundModalOpen = ref(false)
const refundFormRef = ref<FormInstance>()
const refundForm = reactive<{
  amount: number
  refundMethod: 'balance' | 'wechat'
  reason: string
  remark: string
}>({
  amount: 0,
  refundMethod: 'balance',
  reason: '',
  remark: '',
})
const refundRules = {
  amount: [{ required: true, message: '请输入退款金额', trigger: 'blur' }],
  refundMethod: [{ required: true, message: '请选择退款方式', trigger: 'change' }],
  reason: [{ required: true, message: '请选择退款原因', trigger: 'change' }],
}

/** 可退金额: 储值卡 = 余额, 次卡 = 0(按已消课时另算), 月卡 = 0 */
const refundableAmount = computed(() => {
  if (!currentMember.value) return 0
  if (currentMember.value.cardType === 'stored_value') {
    // 储值卡可退 = 余额（赠送金额不可退，简化为余额）
    return Math.max(0, currentMember.value.balance / 100)
  }
  // 次卡/月卡退款金额需后端计算，前端占位 0
  return 0
})

const refundRuleText = computed(() => {
  if (!currentMember.value) return ''
  if (currentMember.value.cardType === 'stored_value') {
    return '储值卡退款: 可退充值金额(扣除已消费部分), 赠送金额不可退'
  }
  if (currentMember.value.cardType === 'times_card') {
    return '次卡退课: 按剩余次数 × 单次价格计算可退金额, 请联系后端计算后填入'
  }
  return '月卡退订: 按已使用天数折算退款, 请联系后端计算后填入'
})

function openRefund(record: Member) {
  currentMember.value = record
  Object.assign(refundForm, {
    amount: refundableAmount.value,
    refundMethod: 'balance',
    reason: '',
    remark: '',
  })
  refundModalOpen.value = true
}

async function submitRefund() {
  await refundFormRef.value?.validate()
  if (refundForm.amount > refundableAmount.value && currentMember.value?.cardType === 'stored_value') {
    message.warning('退款金额超过可退余额')
    return
  }
  submitting.value = true
  try {
    await refundMember({
      memberId: currentMember.value!.id,
      amount: refundForm.amount * 100,
      refundMethod: refundForm.refundMethod,
      reason: refundForm.reason,
      remark: refundForm.remark,
    })
    message.success('退款成功')
    refundModalOpen.value = false
    loadMemberList()
    loadStats()
  } finally {
    submitting.value = false
  }
}

// ===== 交易记录 =====
const transactionDrawerOpen = ref(false)
const txLoading = ref(false)
// 扩展 CardTransaction 以支持次卡次数变动字段（后端约定可选字段）
type TxRow = CardTransaction & { timesDelta?: number, timesAfter?: number }
const transactions = ref<TxRow[]>([])
const txFilterType = ref<TransactionType | ''>('')

const filteredTransactions = computed<TxRow[]>(() => {
  if (!txFilterType.value) return transactions.value
  return transactions.value.filter((t) => t.type === txFilterType.value)
})

function filterTransactions() {
  // computed 自动响应, 无需操作
}

async function openTransactions(record: Member) {
  currentMember.value = record
  transactionDrawerOpen.value = true
  txFilterType.value = ''
  txLoading.value = true
  try {
    const res = await getMemberTransactions(record.id, { page: 1, size: 100 })
    transactions.value = (res.list || []) as TxRow[]
  } catch {
    transactions.value = []
  } finally {
    txLoading.value = false
  }
}

// 初始化加载
loadMemberList()
loadStats()
</script>

<style scoped lang="scss">
// ===== 统计卡 =====
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
    &.text-primary { color: #059669; }
    &.text-accent { color: #0284c7; }
    &.text-success { color: #16a34a; }
  }
}

// ===== 表格 =====
.sub-text {
  font-size: 12px;
  color: #999;
}
.text-muted {
  color: #94a3b8;
}
.balance-text {
  color: #059669;
  font-weight: 600;
  font-size: 15px;
}
.more-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.modal-member-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f0fdf4;
  border-radius: 6px;
  .info-name {
    font-weight: 500;
    color: #333;
  }
}
.quick-amount {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

// ===== 交易记录 =====
.tx-filter-bar {
  margin-bottom: 16px;
}
.tx-item {
  padding-bottom: 8px;
  .tx-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .tx-type {
      font-weight: 500;
      color: #333;
    }
    .tx-amount {
      font-weight: 600;
      &.plus {
        color: #059669;
      }
      &.minus {
        color: #ef4444;
      }
    }
  }
  .tx-meta {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
  }
  .tx-remark {
    font-size: 13px;
    color: #666;
    margin-top: 4px;
  }
  .tx-balance {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
  }
}
</style>
