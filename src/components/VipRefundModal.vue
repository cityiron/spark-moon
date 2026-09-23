<template>
  <a-modal
    :open="open"
    title="会员卡退款"
    :width="520"
    :confirm-loading="submitting"
    :ok-text="'确认退款'"
    :ok-button-props="{ danger: true }"
    @update:open="(v: boolean) => emit('update:open', v)"
    @ok="submitRefund"
  >
    <a-spin :spinning="calcLoading">
      <a-alert
        v-if="record"
        type="info"
        show-icon
        style="margin-bottom: 16px"
        :message="`${record.userName || '-'}（${record.userPhone || '-'}） · ${record.vipPlanName || '-'}`"
      />

      <!-- 退款类型: 切换会重新计算 -->
      <a-form layout="vertical">
        <a-form-item label="退款类型">
          <a-radio-group
            :value="form.refundType"
            :disabled="calcLoading"
            @change="handleRefundTypeChange"
          >
            <a-radio value="USER">用户主动退款</a-radio>
            <a-radio value="ADMIN">管理员不可抗力</a-radio>
          </a-radio-group>
          <div class="form-tip">
            用户主动退款会折算已用的免费场次权益；管理员不可抗力（如闭馆）不扣权益。
          </div>
        </a-form-item>
      </a-form>

      <!-- 折算明细 -->
      <div v-if="calc" class="calc-card">
        <div class="calc-row">
          <span class="calc-label">卡费</span>
          <span class="calc-value">¥ {{ formatFen(calc.cardFee) }}</span>
        </div>
        <div class="calc-row">
          <span class="calc-label">已用天数</span>
          <span class="calc-value">{{ calc.elapsedDays }} 天</span>
        </div>
        <div class="calc-row">
          <span class="calc-label">时间折算扣款</span>
          <span class="calc-value text-minus">- ¥ {{ formatFen(calc.timeDeduct) }}</span>
        </div>
        <div class="calc-row">
          <span class="calc-label">权益折算扣款（仅用户主动）</span>
          <span class="calc-value text-minus">- ¥ {{ formatFen(calc.benefitDeduct) }}</span>
        </div>
        <div class="calc-row calc-total">
          <span class="calc-label">应退金额</span>
          <span class="calc-value text-primary">¥ {{ formatFen(calc.refundAmount) }}</span>
        </div>
      </div>

      <a-form layout="vertical" style="margin-top: 16px">
        <a-form-item label="实际退款金额(元)">
          <a-input-number
            v-model:value="form.refundAmountYuan"
            :min="0"
            :max="calc ? calc.refundAmount / 100 : undefined"
            :precision="2"
            :step="10"
            style="width: 100%"
            placeholder="0.00"
          />
          <div class="form-tip">可手动改小（不超过系统应退金额），留空或填满则按系统应退。</div>
        </a-form-item>
        <a-form-item label="退款方式">
          <a-radio-group v-model:value="form.refundMethod">
            <a-radio value="balance">退到储值卡余额</a-radio>
            <a-radio value="cash">线下扫码转账</a-radio>
            <a-radio value="wechat" disabled>微信原路退回（暂未接入）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="退款原因">
          <a-select
            v-model:value="form.reason"
            placeholder="请选择退款原因"
            :options="reasonOptions"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="form.remark" :rows="2" placeholder="补充说明（可选）" />
        </a-form-item>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getVipRefundCalc, refundVip, type VipRefundMethod, type VipRefundType } from '@/api/vip'
import type { VipMembership, VipRefundCalc } from '@/types/models'

interface Props {
  open: boolean
  record: VipMembership | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

/** 分转元, 保留两位小数 */
function formatFen(fen: number | undefined | null): string {
  if (fen === undefined || fen === null) return '0.00'
  return (fen / 100).toFixed(2)
}

const reasonOptions = [
  { label: '用户主动退卡', value: '用户主动退卡' },
  { label: '不可抗力（闭馆/停业等）', value: '不可抗力' },
  { label: '重复购买', value: '重复购买' },
  { label: '其他', value: '其他' },
]

const calcLoading = ref(false)
const submitting = ref(false)
const calc = ref<VipRefundCalc | null>(null)

const form = reactive<{
  refundType: VipRefundType
  refundMethod: VipRefundMethod
  refundAmountYuan: number | undefined
  reason: string | undefined
  remark: string
}>({
  refundType: 'USER',
  refundMethod: 'balance',
  refundAmountYuan: undefined,
  reason: undefined,
  remark: '',
})

async function loadCalc() {
  if (!props.record) return
  calcLoading.value = true
  try {
    calc.value = await getVipRefundCalc(props.record.id, form.refundType)
    form.refundAmountYuan = undefined
  } catch {
    calc.value = null
  } finally {
    calcLoading.value = false
  }
}

function handleRefundTypeChange(e: { target: { value: VipRefundType } }) {
  form.refundType = e.target.value
  loadCalc()
}

watch(
  () => [props.open, props.record?.id],
  ([open]) => {
    if (open) {
      form.refundType = 'USER'
      form.refundMethod = 'balance'
      form.refundAmountYuan = undefined
      form.reason = undefined
      form.remark = ''
      calc.value = null
      loadCalc()
    }
  },
)

async function submitRefund() {
  if (!props.record || !calc.value) return
  if (form.refundAmountYuan != null && form.refundAmountYuan > calc.value.refundAmount / 100) {
    message.warning('实际退款金额不能超过系统应退金额')
    return
  }
  if (!form.reason) {
    message.warning('请选择退款原因')
    return
  }
  submitting.value = true
  try {
    await refundVip({
      subscriptionId: props.record.id,
      refundType: form.refundType,
      refundMethod: form.refundMethod,
      // 未填写/填满则不下发, 由服务端按系统应退
      refundAmount:
        form.refundAmountYuan != null
          ? Math.round(form.refundAmountYuan * 100)
          : undefined,
      reason: form.reason,
      remark: form.remark || undefined,
    })
    message.success('退款成功')
    emit('update:open', false)
    emit('success')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.calc-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
}
.calc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
  .calc-label {
    color: #64748b;
  }
  .calc-value {
    font-weight: 600;
    color: #0f172a;
    &.text-minus {
      color: #dc2626;
    }
    &.text-primary {
      color: #059669;
      font-size: 16px;
    }
  }
}
.calc-total {
  border-top: 1px dashed #cbd5e1;
  margin-top: 4px;
  padding-top: 10px;
}
.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
  line-height: 1.5;
}
</style>
