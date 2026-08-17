<template>
  <div class="page-container">
    <div class="page-card">
      <!-- 顶部操作栏 -->
      <div class="booking-toolbar">
        <div class="toolbar-left">
          <a-select
            v-model:value="selectedVenueId"
            placeholder="选择场馆"
            style="width: 200px"
            :options="venueOptions"
            @change="loadGrid"
          />
          <a-date-picker
            v-model:value="selectedDate"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :allow-clear="false"
            @change="loadGrid"
          />
          <a-button @click="goPrevDay">
            <left-outlined />
            前一天
          </a-button>
          <a-button @click="goToday">今天</a-button>
          <a-button @click="goNextDay">
            后一天
            <right-outlined />
          </a-button>
          <a-button @click="loadGrid">
            <reload-outlined />
            刷新
          </a-button>
        </div>
        <div class="toolbar-right">
          <a-space>
            <a-button type="primary" @click="openProxyBooking()">
              <user-add-outlined />
              代客预订
            </a-button>
            <a-button @click="openLockForm()">
              <lock-outlined />
              场地锁定
            </a-button>
          </a-space>
        </div>
      </div>

      <!-- 图例 -->
      <div class="legend-bar">
        <span class="legend-item"><i class="dot dot-free"></i>空闲</span>
        <span class="legend-item"><i class="dot dot-booked"></i>已预订</span>
        <span class="legend-item"><i class="dot dot-locked"></i>已锁定</span>
        <span class="legend-item"><i class="dot dot-training"></i>培训</span>
      </div>

      <!-- 预订网格 -->
      <a-spin :spinning="loading">
        <div v-if="gridRows.length === 0 && !loading" class="empty-tip">
          <a-empty description="暂无场地数据, 请先在场馆管理中添加场地" />
        </div>
        <div v-else class="grid-wrap">
          <table class="booking-grid">
            <thead>
              <tr>
                <th class="corner-cell">场地 \ 时段</th>
                <th v-for="slot in timeSlots" :key="slot" class="time-header">
                  {{ slot }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in gridRows" :key="row.court.id">
                <td class="court-cell">
                  <div class="court-name">{{ row.court.name }}</div>
                  <a-tag :color="row.court.indoor ? 'orange' : 'cyan'" style="margin: 0">
                    {{ row.court.indoor ? '室内' : '室外' }}
                  </a-tag>
                </td>
                <td
                  v-for="(slot, si) in row.slots"
                  :key="slot.label"
                  class="slot-cell"
                  :class="[slotClass(slot), slot.rangeKey ? 'slot-range' : '', slot.rangeKey && isRangeStart(row.slots, si) ? 'slot-range-start' : '']"
                  @click="onCellClick(row, slot)"
                >
                  <a-tooltip v-if="slot.order" :title="orderTooltip(slot.order)">
                    <span class="slot-text">{{ slot.order.memberName || '已预订' }}</span>
                  </a-tooltip>
                  <span v-else-if="slot.status === 'locked'" class="slot-text">锁定</span>
                  <span v-else-if="slot.status === 'training'" class="slot-text">培训</span>
                  <span v-else-if="slot.rangeKey" class="slot-range-label">
                    {{ isRangeStart(row.slots, si) ? `整段 ¥${fmtPrice(slot.price)}` : '↔' }}
                  </span>
                  <span v-else class="slot-price">
                    ¥{{ fmtPrice(slot.price) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </a-spin>
    </div>

    <!-- 代客预订 Drawer -->
    <a-drawer
      v-model:open="proxyDrawerOpen"
      title="代客预订"
      width="480"
      :destroy-on-close="true"
    >
      <a-form
        ref="proxyFormRef"
        :model="proxyForm"
        :rules="proxyRules"
        layout="vertical"
      >
        <a-form-item label="场地" name="courtId">
          <a-select
            v-model:value="proxyForm.courtId"
            :options="courtOptions"
            placeholder="请选择场地"
          />
        </a-form-item>
        <a-form-item label="预订日期" name="date">
          <a-date-picker
            v-model:value="proxyForm.date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="开始时间" name="startTime">
              <a-select
                v-model:value="proxyForm.startTime"
                :options="proxyStartOptions.map((t) => ({ label: t, value: t }))"
                placeholder="选择开始时间"
                style="width: 100%"
                :disabled="!proxyForm.courtId"
                @change="onStartTimeChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束时间" name="endTime">
              <a-select
                v-model:value="proxyForm.endTime"
                :options="proxyEndOptions.map((t) => ({ label: t, value: t }))"
                placeholder="选择结束时间"
                style="width: 100%"
                :disabled="!proxyForm.courtId"
                @change="onEndTimeChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-alert
          v-if="rangeInfoText"
          :message="rangeInfoText"
          type="warning"
          show-icon
          style="margin-bottom: 16px"
        />
        <a-form-item label="会员手机号" name="memberPhone">
          <a-input v-model:value="proxyForm.memberPhone" placeholder="输入会员手机号查询" />
        </a-form-item>
        <a-form-item label="预订人姓名" name="memberName">
          <a-input v-model:value="proxyForm.memberName" placeholder="预订人姓名" />
        </a-form-item>
        <a-form-item label="支付方式" name="payMethod">
          <a-radio-group v-model:value="proxyForm.payMethod">
            <a-radio-button value="offline">线下收款</a-radio-button>
            <a-radio-button value="wechat">微信扫码付</a-radio-button>
            <a-radio-button value="alipay">支付宝扫码付</a-radio-button>
            <a-radio-button value="balance">会员卡</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="proxyForm.remark" :rows="2" placeholder="例如：老客、团建" />
        </a-form-item>
        <a-alert
          v-if="proxyAmount > 0"
          :message="`预计金额: ¥ ${(proxyAmount / 100).toFixed(2)}`"
          type="info"
          show-icon
        />
      </a-form>
      <template #footer>
        <div style="text-align: right">
          <a-button style="margin-right: 8px" @click="proxyDrawerOpen = false">取消</a-button>
          <a-button type="primary" :loading="submitting" @click="submitProxy">确认预订</a-button>
        </div>
      </template>
    </a-drawer>

    <!-- 场地锁定 Drawer -->
    <a-drawer
      v-model:open="lockDrawerOpen"
      title="场地锁定 / 培训占用"
      width="460"
      :destroy-on-close="true"
    >
      <a-form
        ref="lockFormRef"
        :model="lockForm"
        :rules="lockRules"
        layout="vertical"
      >
        <a-form-item label="锁定类型" name="type">
          <a-radio-group v-model:value="lockForm.type">
            <a-radio value="lock">场地锁定</a-radio>
            <a-radio value="training">培训占用</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="场地" name="courtId">
          <a-select
            v-model:value="lockForm.courtId"
            :options="courtOptions"
            placeholder="请选择场地"
          />
        </a-form-item>
        <a-form-item label="日期" name="date">
          <a-date-picker
            v-model:value="lockForm.date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="开始时间" name="startTime">
              <a-time-picker
                v-model:value="lockForm.startTime"
                format="HH:mm"
                value-format="HH:mm"
                style="width: 100%"
                :minute-step="60"
                placeholder="09:00"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束时间" name="endTime">
              <a-time-picker
                v-model:value="lockForm.endTime"
                format="HH:mm"
                value-format="HH:mm"
                style="width: 100%"
                :minute-step="60"
                placeholder="10:00"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="重复类型" name="repeatType">
          <a-radio-group v-model:value="lockForm.repeatType">
            <a-radio-button value="once">单次</a-radio-button>
            <a-radio-button value="weekly">每周</a-radio-button>
            <a-radio-button value="daily">每天</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="原因" name="reason">
          <a-textarea
            v-model:value="lockForm.reason"
            :rows="3"
            :placeholder="lockForm.type === 'training' ? '如: 青少年培训班' : '如: 场地维护、俱乐部活动'"
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <div style="text-align: right">
          <a-button style="margin-right: 8px" @click="lockDrawerOpen = false">取消</a-button>
          <a-button type="primary" :loading="submitting" @click="submitLock">确认锁定</a-button>
        </div>
      </template>
    </a-drawer>

    <!-- 订单详情 Modal -->
    <a-modal
      v-model:open="orderModalOpen"
      title="预订订单详情"
      :footer="null"
      width="480"
    >
      <a-descriptions v-if="currentOrder" :column="1" bordered size="small">
        <a-descriptions-item label="订单号">{{ currentOrder.orderNo }}</a-descriptions-item>
        <a-descriptions-item label="场地">{{ currentOrder.courtName }}</a-descriptions-item>
        <a-descriptions-item label="预订人">{{ currentOrder.memberName }}</a-descriptions-item>
        <a-descriptions-item label="手机号">{{ currentOrder.memberPhone }}</a-descriptions-item>
        <a-descriptions-item label="日期">{{ currentOrder.date }}</a-descriptions-item>
        <a-descriptions-item label="时段">
          {{ currentOrder.startTime }} - {{ currentOrder.endTime }}
        </a-descriptions-item>
        <a-descriptions-item label="时长">{{ currentOrder.duration }} 分钟</a-descriptions-item>
        <a-descriptions-item label="金额">¥ {{ (currentOrder.amount / 100).toFixed(2) }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="statusColor(currentOrder.status)">{{ statusLabel(currentOrder.status) }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="备注">{{ currentOrder.remark || '-' }}</a-descriptions-item>
      </a-descriptions>
      <div v-if="currentOrder" style="text-align: right; margin-top: 16px">
        <a-popconfirm
          v-if="['pending', 'confirmed'].includes(currentOrder.status)"
          title="确认取消该订单?"
          @confirm="handleCancelOrder"
        >
          <a-button danger>取消订单</a-button>
        </a-popconfirm>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import {
  LeftOutlined,
  RightOutlined,
  ReloadOutlined,
  UserAddOutlined,
  LockOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { getAllVenues } from '@/api/venue'
import { getBookingGrid, proxyBooking, lockCourt, cancelBooking } from '@/api/booking'
import type { Venue, Court, CourtGridRow, TimeSlot, BookingOrder, BookingStatus, LockRepeatType } from '@/types/models'

// ===== 场馆选择 =====
const venueOptions = ref<{ label: string; value: number }[]>([])
const selectedVenueId = ref<number>()
const selectedDate = ref<string>(dayjs().format('YYYY-MM-DD'))

async function loadVenues() {
  try {
    const list = await getAllVenues()
    venueOptions.value = (list || []).map((v) => ({ label: v.name, value: v.id }))
    if (venueOptions.value.length > 0 && !selectedVenueId.value) {
      selectedVenueId.value = venueOptions.value[0].value
      loadGrid()
    }
  } catch {
    venueOptions.value = []
  }
}

// ===== 网格数据 =====
const loading = ref(false)
const gridRows = ref<CourtGridRow[]>([])
const timeSlots = computed<string[]>(() => {
  if (gridRows.value.length === 0) return []
  return gridRows.value[0].slots.map((s) => {
    const end = s.endTime ? s.endTime.slice(0, 5) : ''
    return end ? `${s.label}-${end}` : s.label
  })
})

const courtOptions = computed(() => {
  return gridRows.value.map((r) => ({ label: r.court.name, value: r.court.id }))
})

async function loadGrid() {
  if (!selectedVenueId.value) return
  loading.value = true
  try {
    const rows = await getBookingGrid({
      venueId: selectedVenueId.value,
      date: selectedDate.value,
    })
    gridRows.value = rows || []
  } catch {
    gridRows.value = []
  } finally {
    loading.value = false
  }
}

// 日期切换
function goPrevDay() {
  selectedDate.value = dayjs(selectedDate.value).subtract(1, 'day').format('YYYY-MM-DD')
  loadGrid()
}
function goNextDay() {
  selectedDate.value = dayjs(selectedDate.value).add(1, 'day').format('YYYY-MM-DD')
  loadGrid()
}
function goToday() {
  selectedDate.value = dayjs().format('YYYY-MM-DD')
  loadGrid()
}

// ===== 单元格交互 =====
function slotClass(slot: TimeSlot): string {
  return `slot-${slot.status}`
}

function orderTooltip(order: BookingOrder): string {
  return [
    `订单号: ${order.orderNo}`,
    `预订人: ${order.memberName || '-'}`,
    `手机: ${order.memberPhone || '-'}`,
    `时段: ${order.startTime} - ${order.endTime}`,
    `金额: ¥ ${(order.amount / 100).toFixed(2)}`,
  ].join('\n')
}

const orderModalOpen = ref(false)
const currentOrder = ref<BookingOrder | null>(null)

function onCellClick(row: CourtGridRow, slot: TimeSlot) {
  if (slot.status === 'free') {
    // 空闲格子 -> 打开代客预订, 预填
    openProxyBooking(row.court, slot)
  } else if (slot.order) {
    // 已预订 -> 显示订单详情
    currentOrder.value = slot.order
    orderModalOpen.value = true
  } else if (slot.status === 'locked' || slot.status === 'training') {
    message.info(`该时段已${slot.status === 'training' ? '被培训占用' : '被锁定'}`)
  }
}

async function handleCancelOrder() {
  if (!currentOrder.value) return
  await cancelBooking(currentOrder.value.id)
  message.success('订单已取消')
  orderModalOpen.value = false
  loadGrid()
}

// 状态映射
function statusLabel(s: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    pending: '待确认',
    confirmed: '已确认',
    checked_in: '已入场',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
  }
  return map[s] || s
}
/** 分 → 元（取整） */
function fmtPrice(cents?: number): string {
  if (cents == null) return '-'
  return (cents / 100).toFixed(0)
}

/** 判断某格是否为 RANGE 段的起始格 */
function isRangeStart(slots: TimeSlot[], index: number): boolean {
  const slot = slots[index]
  if (!slot?.rangeKey) return false
  const prev = slots[index - 1]
  return !prev || prev.rangeKey !== slot.rangeKey
}

function statusColor(s: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    pending: 'orange',
    confirmed: 'green',
    checked_in: 'blue',
    completed: 'default',
    cancelled: 'red',
    refunded: 'purple',
  }
  return map[s] || 'default'
}

// ===== 代客预订 =====
const proxyDrawerOpen = ref(false)
const proxyFormRef = ref<FormInstance>()
const submitting = ref(false)
const proxyForm = reactive<Partial<BookingOrder> & { payMethod?: 'offline' | 'wechat' | 'alipay' | 'balance' }>({
  courtId: undefined,
  date: dayjs().format('YYYY-MM-DD'),
  startTime: '',
  endTime: '',
  memberPhone: '',
  memberName: '',
  remark: '',
  payMethod: 'offline',
})
const proxyRules = {
  courtId: [{ required: true, message: '请选择场地', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  memberPhone: [{ required: true, message: '请输入会员手机号', trigger: 'blur' }],
}

/** 当前选中场地可选的开始时间（仅段边界：RANGE 段只能从段首开始，HOURLY 每格皆可） */
const proxyStartOptions = computed<string[]>(() => {
  const row = gridRows.value.find((r) => r.court.id === proxyForm.courtId)
  if (!row) return []
  return row.slots
    .map((s, i) => (s.rangeKey ? (isRangeStart(row.slots, i) ? s.startTime : null) : s.startTime))
    .filter((t): t is string => !!t)
})

/** 当前选中场地可选的结束时间（仅段边界：RANGE 段只能在该段结束时结束，HOURLY 每格皆可） */
const proxyEndOptions = computed<string[]>(() => {
  const row = gridRows.value.find((r) => r.court.id === proxyForm.courtId)
  if (!row) return []
  const slots = row.slots
  const ends: string[] = []
  slots.forEach((s, i) => {
    if (proxyForm.startTime && s.startTime <= proxyForm.startTime) return
    // 非 RANGE：每格都可作为结束
    if (!s.rangeKey) {
      if (s.endTime) ends.push(s.endTime)
      return
    }
    // RANGE 段：仅当是段内最后一格（下一格不是同一段）才可作为结束
    const next = slots[i + 1]
    if (!next || next.rangeKey !== s.rangeKey) {
      if (s.endTime) ends.push(s.endTime)
    }
  })
  return ends
})

/** 时段选择的提示文案（RANGE 整段不可拆分） */
const rangeInfoText = computed(() => {
  const row = gridRows.value.find((r) => r.court.id === proxyForm.courtId)
  if (!row) return ''
  const hasRange = row.slots.some((s) => s.rangeKey)
  return hasRange ? '注意：标有"整段"的时段为整段一口价出售，不可拆分，需按整段边界选择' : ''
})

function onStartTimeChange() {
  // 开始时间变化后，若已选结束时间不在边界内则清空
  if (proxyForm.endTime && !proxyEndOptions.value.includes(proxyForm.endTime)) {
    proxyForm.endTime = ''
  }
}

function onEndTimeChange() {
  // 结束时间变化后，若开始时间晚于结束则清空开始
  if (proxyForm.startTime && proxyForm.endTime && proxyForm.startTime >= proxyForm.endTime) {
    proxyForm.startTime = ''
  }
}

// 预计金额：按所选场地 + 时段累加网格价格计算（分）。
// RANGE 整段一口价按 rangeKey 去重取整段价，HOURLY 按小时价 × 时长；支持跨多个 RANGE 段累加。
const proxyAmount = computed(() => {
  if (!proxyForm.startTime || !proxyForm.endTime) return 0
  const start = dayjs(`2000-01-01 ${proxyForm.startTime}`)
  const end = dayjs(`2000-01-01 ${proxyForm.endTime}`)
  const minutes = end.diff(start, 'minute')
  if (minutes <= 0) return 0

  const row = gridRows.value.find((r) => r.court.id === proxyForm.courtId)
  if (!row) return 0

  const rangeKeys = new Set<string>()
  let total = 0
  for (const slot of row.slots) {
    if (!slot.startTime || !slot.endTime) continue
    if (slot.startTime < proxyForm.startTime || slot.startTime >= proxyForm.endTime) continue
    if (slot.price == null) continue
    if (slot.rangeKey) {
      // RANGE 段：整段只计一次
      if (rangeKeys.has(slot.rangeKey)) continue
      rangeKeys.add(slot.rangeKey)
      total += slot.price
    } else {
      // HOURLY：按小时价 × 覆盖时长
      const s = dayjs(`2000-01-01 ${slot.startTime}`)
      const e = dayjs(`2000-01-01 ${slot.endTime}`)
      const covered = Math.min(e, end).diff(Math.max(s, start), 'minute')
      total += Math.round((covered / 60) * slot.price)
    }
  }
  return total
})

function openProxyBooking(court?: Court, slot?: TimeSlot) {
  let start = slot?.startTime || ''
  let end = slot?.endTime || ''
  // RANGE 整段：点击段内任一格，预填该段整段范围
  if (court && slot?.rangeKey) {
    const row = gridRows.value.find((r) => r.court.id === court.id)
    if (row) {
      const idx = row.slots.findIndex((s) => s.label === slot.label)
      if (idx >= 0 && isRangeStart(row.slots, idx)) {
        start = slot.startTime
        end = slot.endTime
      } else {
        // 段内格子：向前找到段首，向后找到段尾
        const rangeSlots = row.slots.filter((s) => s.rangeKey === slot.rangeKey)
        if (rangeSlots.length > 0) {
          start = rangeSlots[0].startTime
          end = rangeSlots[rangeSlots.length - 1].endTime
        }
      }
    }
  }
  Object.assign(proxyForm, {
    venueId: selectedVenueId.value,
    courtId: court?.id,
    date: selectedDate.value,
    startTime: start,
    endTime: end,
    memberPhone: '',
    memberName: '',
    remark: '',
    payMethod: 'offline',
  })
  proxyDrawerOpen.value = true
}

/** 前端支付方式 → 后端 paymentMethod 枚举 */
const PAY_METHOD_MAP: Record<string, string> = {
  offline: 'OFFLINE',
  wechat: 'WECHAT',
  alipay: 'ALIPAY',
  balance: 'CARD',
}

/** 由开始/结束时间生成连续的整点时段数组 */
function buildTimeSlots(start: string, end: string): { startTime: string, endTime: string }[] {
  const slots: { startTime: string, endTime: string }[] = []
  let cur = dayjs(`2000-01-01 ${start}`)
  const endM = dayjs(`2000-01-01 ${end}`)
  while (cur.isBefore(endM)) {
    const next = cur.add(1, 'hour')
    if (next.isAfter(endM)) break
    slots.push({ startTime: cur.format('HH:mm'), endTime: next.format('HH:mm') })
    cur = next
  }
  return slots
}

async function submitProxy() {
  await proxyFormRef.value?.validate()
  submitting.value = true
  try {
    const timeSlots = buildTimeSlots(proxyForm.startTime!, proxyForm.endTime!)
    if (timeSlots.length === 0) {
      message.warning('请选择有效的预订时段')
      return
    }
    await proxyBooking({
      venueId: selectedVenueId.value,
      courtId: proxyForm.courtId,
      date: proxyForm.date as string,
      timeSlots,
      paymentMethod: PAY_METHOD_MAP[proxyForm.payMethod || 'offline'],
      memberPhone: proxyForm.memberPhone,
      memberName: proxyForm.memberName,
      remark: proxyForm.remark,
    })
    message.success('代客预订成功')
    proxyDrawerOpen.value = false
    loadGrid()
  } finally {
    submitting.value = false
  }
}

function calcDuration(start: string, end: string): number {
  const s = dayjs(`2000-01-01 ${start}`)
  const e = dayjs(`2000-01-01 ${end}`)
  return e.diff(s, 'minute')
}

// ===== 场地锁定 =====
const lockDrawerOpen = ref(false)
const lockFormRef = ref<FormInstance>()
const lockForm = reactive({
  type: 'lock' as 'lock' | 'training',
  courtId: undefined as number | undefined,
  venueId: undefined as number | undefined,
  date: dayjs().format('YYYY-MM-DD'),
  startTime: '',
  endTime: '',
  reason: '',
  repeatType: 'once' as 'once' | 'daily' | 'weekly',
})
const lockRules = {
  courtId: [{ required: true, message: '请选择场地', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  reason: [{ required: true, message: '请输入原因', trigger: 'blur' }],
}

function openLockForm() {
  Object.assign(lockForm, {
    type: 'lock',
    courtId: undefined,
    venueId: selectedVenueId.value,
    date: selectedDate.value,
    startTime: '',
    endTime: '',
    reason: '',
    repeatType: 'once',
  })
  lockDrawerOpen.value = true
}

async function submitLock() {
  await lockFormRef.value?.validate()
  submitting.value = true
  try {
    await lockCourt({
      ...lockForm,
      venueId: selectedVenueId.value as number,
      courtId: lockForm.courtId as number,
      repeatType: lockForm.repeatType,
    })
    const repeatText = lockForm.repeatType === 'once' ? '' : `（${lockForm.repeatType === 'daily' ? '每天' : '每周'}重复）`
    message.success((lockForm.type === 'training' ? '培训占用已设置' : '场地已锁定') + repeatText)
    lockDrawerOpen.value = false
    loadGrid()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadVenues()
})
</script>

<style scoped lang="scss">
.booking-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.legend-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #666;
  }
  .dot {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    &.dot-free {
      background: #d1fae5;
    }
    &.dot-booked {
      background: #e5e7eb;
    }
    &.dot-locked {
      background: #ffedd5;
    }
    &.dot-training {
      background: #ede9fe;
    }
  }
}

.empty-tip {
  padding: 60px 0;
}

.grid-wrap {
  overflow: auto;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}
.booking-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 100%;
  thead {
    th {
      position: sticky;
      top: 0;
      background: #fafafa;
      border: 1px solid #f0f0f0;
      padding: 8px 4px;
      font-weight: 500;
      white-space: nowrap;
      z-index: 2;
    }
    .corner-cell {
      position: sticky;
      left: 0;
      z-index: 3;
      min-width: 120px;
      text-align: left;
    }
    .time-header {
      min-width: 92px;
      text-align: center;
      white-space: nowrap;
      font-size: 12px;
    }
  }
  tbody {
    td {
      border: 1px solid #f0f0f0;
      padding: 0;
      vertical-align: middle;
    }
    .court-cell {
      position: sticky;
      left: 0;
      z-index: 1;
      background: #fff;
      padding: 8px 10px;
      min-width: 120px;
      .court-name {
        font-weight: 500;
        margin-bottom: 4px;
        color: #333;
      }
    }
    .slot-cell {
      height: 44px;
      text-align: center;
      .slot-text {
        display: block;
        padding: 4px;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .slot-price {
        display: block;
        padding: 4px;
        font-size: 12px;
        color: #0284c7;
        font-weight: 500;
      }
      .slot-range-label {
        display: block;
        padding: 4px;
        font-size: 12px;
        color: #b45309;
        font-weight: 600;
      }
    }
    // RANGE 整段一口价段：整段用同一底色 + 段首左边框标识
    .slot-range {
      background: #fef3c7;
      &.slot-range-start {
        box-shadow: inset 3px 0 0 #f59e0b;
      }
    }
  }
}
</style>
