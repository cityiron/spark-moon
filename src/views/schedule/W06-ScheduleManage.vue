<template>
  <div class="page-container">
    <div class="page-card">
      <!-- 顶部筛选栏 -->
      <div class="filter-bar">
        <a-select
          v-model:value="filterCourseId"
          style="width: 180px"
          :options="courseFilterOptions"
          @change="handleFilterChange"
        />
        <a-select
          v-model:value="filterCoachId"
          style="width: 160px"
          :options="coachFilterOptions"
          @change="handleFilterChange"
        />
        <a-select
          v-model:value="filterVenueId"
          style="width: 180px"
          :options="venueFilterOptions"
          @change="handleFilterChange"
        />
      </div>

      <!-- Tab 切换 -->
      <a-tabs v-model:activeKey="activeTab">
        <!-- Tab 1 排课日历 -->
        <a-tab-pane key="calendar">
          <template #tab>
            <calendar-outlined />
            排课日历
          </template>

          <div class="calendar-toolbar">
            <div class="month-switch">
              <a-button shape="circle" size="small" @click="prevMonth">
                <left-outlined />
              </a-button>
              <span class="month-label">{{ monthLabel }}</span>
              <a-button shape="circle" size="small" @click="nextMonth">
                <right-outlined />
              </a-button>
              <a-button size="small" class="today-btn" @click="goToday">今天</a-button>
            </div>
            <a-button type="primary" @click="openCreate">
              <plus-outlined />
              新增排课
            </a-button>
          </div>

          <a-spin :spinning="calendarLoading">
            <div class="calendar-grid">
              <div v-for="w in weekHeaders" :key="w" class="calendar-header-cell">{{ w }}</div>
              <div
                v-for="cell in calendarCells"
                :key="cell.key"
                class="calendar-cell"
                :class="{ 'out-of-month': !cell.inMonth, today: cell.isToday }"
              >
                <div class="cell-date">{{ cell.dateNum }}</div>
                <div class="cell-sessions">
                  <div
                    v-for="s in cell.sessions"
                    :key="s.id"
                    class="session-item"
                    :style="{ borderLeftColor: courseColorHex(s.courseId) }"
                    @click="openDetail(s)"
                  >
                    <span class="session-time">{{ s.startTime }}</span>
                    <span class="session-name">{{ s.courseName }}</span>
                    <div class="session-meta">
                      {{ s.venueName }}·{{ s.courtName }} / {{ s.coachName }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a-spin>
        </a-tab-pane>

        <!-- Tab 2 自动排课 -->
        <a-tab-pane key="auto">
          <template #tab>
            <thunderbolt-outlined />
            自动排课
          </template>

          <a-form
            ref="autoFormRef"
            :model="autoForm"
            :rules="autoRules"
            layout="vertical"
            style="max-width: 720px"
          >
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="课程" name="courseId">
                  <a-select
                    v-model:value="autoForm.courseId"
                    placeholder="请选择课程"
                    :options="courseSelectOptions"
                    @change="onAutoVenueOrCourseChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="球馆" name="venueId">
                  <a-select
                    v-model:value="autoForm.venueId"
                    placeholder="请选择球馆"
                    :options="venueSelectOptions"
                    @change="onAutoVenueChange"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="场地" name="courtId">
                  <a-select
                    v-model:value="autoForm.courtId"
                    placeholder="请选择场地"
                    :options="autoCourtOptions"
                    :disabled="!autoForm.venueId"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="每周几次" name="weeklyTimes">
                  <a-input-number
                    v-model:value="autoForm.weeklyTimes"
                    :min="1"
                    :max="7"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="每周星期几" name="weekDays">
              <a-checkbox-group v-model:value="autoForm.weekDays" :options="weekDayOptions" />
            </a-form-item>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="起始日期" name="startDate">
                  <a-date-picker
                    v-model:value="autoForm.startDate"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="结束日期" name="endDate">
                  <a-date-picker
                    v-model:value="autoForm.endDate"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="开始时间" name="startTime">
                  <a-time-picker
                    v-model:value="autoForm.startTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="时长(分钟)" name="duration">
                  <a-input-number
                    v-model:value="autoForm.duration"
                    :min="30"
                    :step="30"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item>
              <a-button type="primary" :loading="autoSubmitting" @click="submitAutoSchedule">
                <thunderbolt-outlined />
                生成排课
              </a-button>
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <!-- Tab 3 待处理冲突 -->
        <a-tab-pane key="conflict">
          <template #tab>
            <warning-outlined />
            待处理冲突
            <a-badge v-if="pendingList.length" :count="pendingList.length" :offset="[6, -4]" />
          </template>

          <a-table
            :columns="conflictColumns"
            :data-source="pendingList"
            :loading="pendingLoading"
            row-key="id"
            :pagination="false"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'time'">
                {{ record.startTime }} - {{ record.endTime }}
              </template>
              <template v-else-if="column.dataIndex === 'venue'">
                {{ record.venueName }} · {{ record.courtName }}
              </template>
              <template v-else-if="column.dataIndex === 'conflictType'">
                <a-tag :color="conflictColor(record.conflictType)">
                  {{ conflictLabel(record.conflictType) }}
                </a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-space>
                  <a @click="openResolve(record)">调整</a>
                  <a-divider type="vertical" />
                  <a-popconfirm title="确认取消该排课?" @confirm="cancelPending(record)">
                    <a class="danger-link">取消</a>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- 排课详情 Modal -->
    <a-modal
      v-model:open="detailModalOpen"
      title="排课详情"
      :width="520"
    >
      <template v-if="detailSession">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="课程">
            <a-tag :color="courseColor(detailSession.courseId)">{{ detailSession.courseName }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="日期">{{ detailSession.date }}</a-descriptions-item>
          <a-descriptions-item label="时间">
            {{ detailSession.startTime }} - {{ detailSession.endTime }}
          </a-descriptions-item>
          <a-descriptions-item label="球馆场地">
            {{ detailSession.venueName }} · {{ detailSession.courtName }}
          </a-descriptions-item>
          <a-descriptions-item label="教练">{{ detailSession.coachName }}</a-descriptions-item>
          <a-descriptions-item label="课次编号">第 {{ detailSession.sessionNo }} 节</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-badge
              :status="sessionStatusBadge(detailSession.status)"
              :text="sessionStatusLabel(detailSession.status)"
            />
          </a-descriptions-item>
          <a-descriptions-item v-if="detailSession.conflictType" label="冲突类型">
            <a-tag :color="conflictColor(detailSession.conflictType)">
              {{ conflictLabel(detailSession.conflictType) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item v-if="detailSession.consumedAt" label="消课时间">
            {{ detailSession.consumedAt }}
          </a-descriptions-item>
        </a-descriptions>
      </template>
      <template #footer>
        <a-button @click="detailModalOpen = false">关闭</a-button>
        <a-button
          v-if="detailSession && detailSession.status !== 'consumed'"
          type="primary"
          @click="openEdit(detailSession)"
        >
          编辑
        </a-button>
      </template>
    </a-modal>

    <!-- 新增/编辑排课 Modal -->
    <a-modal
      v-model:open="formModalOpen"
      :title="isEdit ? '编辑排课' : '新增排课'"
      :confirm-loading="submitting"
      :width="560"
      @ok="submitSession"
    >
      <a-form ref="sessionFormRef" :model="sessionForm" :rules="sessionRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="课程" name="courseId">
              <a-select
                v-model:value="sessionForm.courseId"
                placeholder="请选择课程"
                :options="courseSelectOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="教练" name="coachId">
              <a-select
                v-model:value="sessionForm.coachId"
                placeholder="请选择教练"
                :options="coachSelectOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="球馆" name="venueId">
              <a-select
                v-model:value="sessionForm.venueId"
                placeholder="请选择球馆"
                :options="venueSelectOptions"
                @change="onSessionVenueChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="场地" name="courtId">
              <a-select
                v-model:value="sessionForm.courtId"
                placeholder="请选择场地"
                :options="sessionCourtOptions"
                :disabled="!sessionForm.venueId"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="上课日期" name="date">
              <a-date-picker
                v-model:value="sessionForm.date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="开始时间" name="startTime">
              <a-time-picker
                v-model:value="sessionForm.startTime"
                format="HH:mm"
                value-format="HH:mm"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="结束时间" name="endTime">
              <a-time-picker
                v-model:value="sessionForm.endTime"
                format="HH:mm"
                value-format="HH:mm"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 解决冲突 Modal -->
    <a-modal
      v-model:open="resolveModalOpen"
      title="调整冲突排课"
      :confirm-loading="resolveSubmitting"
      :width="520"
      @ok="submitResolve"
    >
      <a-alert
        type="warning"
        show-icon
        message="修改场地或时间以解决冲突, 提交后重新校验"
        style="margin-bottom: 16px"
      />
      <a-form ref="resolveFormRef" :model="resolveForm" :rules="resolveRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="球馆" name="venueId">
              <a-select
                v-model:value="resolveForm.venueId"
                placeholder="请选择球馆"
                :options="venueSelectOptions"
                @change="onResolveVenueChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="场地" name="courtId">
              <a-select
                v-model:value="resolveForm.courtId"
                placeholder="请选择场地"
                :options="resolveCourtOptions"
                :disabled="!resolveForm.venueId"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="上课日期" name="date">
              <a-date-picker
                v-model:value="resolveForm.date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="开始时间" name="startTime">
              <a-time-picker
                v-model:value="resolveForm.startTime"
                format="HH:mm"
                value-format="HH:mm"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="结束时间" name="endTime">
              <a-time-picker
                v-model:value="resolveForm.endTime"
                format="HH:mm"
                value-format="HH:mm"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { message, type FormInstance, type TableColumnsType } from 'ant-design-vue'
import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  getSessionList,
  autoSchedule,
  createSession,
  updateSession,
  deleteSession,
  getPendingSessions,
  resolveConflict,
} from '@/api/schedule'
import { getCourseList, getCoachList } from '@/api/training'
import { getAllVenues, getVenueCourts } from '@/api/venue'
import type {
  TrainingSession,
  AutoScheduleParams,
  SessionStatus,
  Coach,
  TrainingCourse,
  Venue,
  Court,
} from '@/types/models'

// ===== 下拉数据 =====
const courses = ref<TrainingCourse[]>([])
const coaches = ref<Coach[]>([])
const venues = ref<Venue[]>([])

async function loadOptions() {
  try {
    const [c, ch, v] = await Promise.all([getCourseList({ page: 1, size: 1000 }), getCoachList(), getAllVenues()])
    courses.value = c?.list || []
    coaches.value = ch || []
    venues.value = v || []
  } catch {
    // 静默失败, 下拉为空
  }
}

// 筛选下拉(含"全部"选项, value=0 表示全部)
const courseFilterOptions = computed(() => [
  { label: '全部课程', value: 0 },
  ...courses.value.map((c) => ({ label: c.name, value: c.id })),
])
const coachFilterOptions = computed(() => [
  { label: '全部教练', value: 0 },
  ...coaches.value.map((c) => ({ label: c.name, value: c.id })),
])
const venueFilterOptions = computed(() => [
  { label: '全部球馆', value: 0 },
  ...venues.value.map((v) => ({ label: v.name, value: v.id })),
])

// 表单下拉(不含"全部")
const courseSelectOptions = computed(() =>
  courses.value.map((c) => ({ label: c.name, value: c.id })),
)
const coachSelectOptions = computed(() =>
  coaches.value.map((c) => ({ label: c.name, value: c.id })),
)
const venueSelectOptions = computed(() =>
  venues.value.map((v) => ({ label: v.name, value: v.id })),
)

// ===== 颜色 / 状态映射 =====
const PRESET_COLORS = ['blue', 'green', 'orange', 'purple', 'cyan', 'magenta']
const COLOR_HEX: Record<string, string> = {
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  purple: '#722ed1',
  cyan: '#13c2c2',
  magenta: '#eb2f96',
}

/** 课程颜色 -> antd 预设色名(用于 a-tag) */
function courseColor(courseId: number): string {
  return PRESET_COLORS[courseId % PRESET_COLORS.length] || 'blue'
}
/** 课程颜色 -> 实际色值(用于内联样式) */
function courseColorHex(courseId: number): string {
  return COLOR_HEX[courseColor(courseId)] || '#1677ff'
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: '已排课',
  consumed: '已消课',
  cancelled: '已取消',
  pending: '待处理',
}
const STATUS_BADGE: Record<SessionStatus, 'success' | 'default' | 'warning'> = {
  scheduled: 'success',
  consumed: 'default',
  cancelled: 'default',
  pending: 'warning',
}
function sessionStatusLabel(s: SessionStatus): string {
  return STATUS_LABEL[s] || s
}
function sessionStatusBadge(s: SessionStatus): 'success' | 'default' | 'warning' {
  return STATUS_BADGE[s] || 'default'
}

const CONFLICT_LABEL: Record<string, string> = {
  booking: '与预订冲突',
  lock: '与锁定冲突',
  coach: '教练时间冲突',
  other_session: '与其他排课冲突',
}
const CONFLICT_COLOR: Record<string, string> = {
  booking: 'orange',
  lock: 'red',
  coach: 'volcano',
  other_session: 'gold',
}
function conflictLabel(c?: string): string {
  return c ? CONFLICT_LABEL[c] || c : '-'
}
function conflictColor(c?: string): string {
  return c ? CONFLICT_COLOR[c] || 'default' : 'default'
}

// ===== 顶部筛选 =====
const filterCourseId = ref(0)
const filterCoachId = ref(0)
const filterVenueId = ref(0)

// ===== Tab =====
const activeTab = ref<'calendar' | 'auto' | 'conflict'>('calendar')

// ===== Tab1 排课日历 =====
const monthRef = ref<Dayjs>(dayjs())
const weekHeaders = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const calendarLoading = ref(false)
const allSessions = ref<TrainingSession[]>([])

const monthLabel = computed(() => `${monthRef.value.year()}年${monthRef.value.month() + 1}月`)

interface CalendarCell {
  key: string
  date: Dayjs
  dateNum: number
  inMonth: boolean
  isToday: boolean
  sessions: TrainingSession[]
}

const calendarCells = computed<CalendarCell[]>(() => {
  const monthStart = monthRef.value.startOf('month')
  const gridStart = monthStart.subtract(monthStart.day(), 'day')
  const todayStr = dayjs().format('YYYY-MM-DD')
  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = gridStart.add(i, 'day')
    const dateStr = d.format('YYYY-MM-DD')
    cells.push({
      key: dateStr,
      date: d,
      dateNum: d.date(),
      inMonth: d.month() === monthRef.value.month(),
      isToday: dateStr === todayStr,
      sessions: allSessions.value.filter((s) => s.date === dateStr),
    })
  }
  return cells
})

function prevMonth() {
  monthRef.value = monthRef.value.subtract(1, 'month')
}
function nextMonth() {
  monthRef.value = monthRef.value.add(1, 'month')
}
function goToday() {
  monthRef.value = dayjs()
}

async function loadCalendarSessions() {
  calendarLoading.value = true
  try {
    const res = await getSessionList({
      page: 1,
      size: 500,
      courseId: filterCourseId.value || undefined,
      coachId: filterCoachId.value || undefined,
      venueId: filterVenueId.value || undefined,
    })
    allSessions.value = res.list || []
  } catch {
    allSessions.value = []
  } finally {
    calendarLoading.value = false
  }
}

function handleFilterChange() {
  if (activeTab.value === 'calendar') {
    loadCalendarSessions()
  }
}

watch(monthRef, () => loadCalendarSessions())

// 月份切换可能造成筛选不变但需重载, 此处显式触发
watch(activeTab, (tab) => {
  if (tab === 'calendar' && allSessions.value.length === 0) {
    loadCalendarSessions()
  }
  if (tab === 'conflict') {
    loadPending()
  }
})

// ===== 排课详情 Modal =====
const detailModalOpen = ref(false)
const detailSession = ref<TrainingSession | null>(null)

function openDetail(s: TrainingSession) {
  detailSession.value = s
  detailModalOpen.value = true
}

// ===== 新增/编辑排课 Modal =====
const formModalOpen = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const sessionFormRef = ref<FormInstance>()
const editingId = ref(0)
const sessionCourtOptions = ref<Court[]>([])

const sessionForm = reactive<{
  courseId?: number
  coachId?: number
  venueId?: number
  courtId?: number
  date?: string
  startTime?: string
  endTime?: string
}>({
  courseId: undefined,
  coachId: undefined,
  venueId: undefined,
  courtId: undefined,
  date: dayjs().format('YYYY-MM-DD'),
  startTime: '09:00',
  endTime: '10:00',
})

const sessionRules = {
  courseId: [{ required: true, message: '请选择课程', trigger: 'change' }],
  coachId: [{ required: true, message: '请选择教练', trigger: 'change' }],
  venueId: [{ required: true, message: '请选择球馆', trigger: 'change' }],
  courtId: [{ required: true, message: '请选择场地', trigger: 'change' }],
  date: [{ required: true, message: '请选择上课日期', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
}

function openCreate() {
  isEdit.value = false
  Object.assign(sessionForm, {
    courseId: filterCourseId.value || undefined,
    coachId: filterCoachId.value || undefined,
    venueId: filterVenueId.value || undefined,
    courtId: undefined,
    date: dayjs().format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '10:00',
  })
  sessionCourtOptions.value = []
  if (sessionForm.venueId) {
    loadCourts(sessionForm.venueId, sessionCourtOptions)
  }
  formModalOpen.value = true
}

function openEdit(s: TrainingSession) {
  isEdit.value = true
  editingId.value = s.id
  Object.assign(sessionForm, {
    courseId: s.courseId,
    coachId: s.coachId,
    venueId: s.venueId,
    courtId: s.courtId,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
  })
  sessionCourtOptions.value = []
  if (s.venueId) {
    loadCourts(s.venueId, sessionCourtOptions)
  }
  detailModalOpen.value = false
  formModalOpen.value = true
}

async function onSessionVenueChange(venueId: number | undefined) {
  sessionForm.courtId = undefined
  sessionCourtOptions.value = []
  if (venueId) {
    await loadCourts(venueId, sessionCourtOptions)
  }
}

async function submitSession() {
  await sessionFormRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateSession(editingId.value, { ...sessionForm })
      message.success('排课已更新')
    } else {
      await createSession({ ...sessionForm })
      message.success('排课已创建')
    }
    formModalOpen.value = false
    loadCalendarSessions()
  } finally {
    submitting.value = false
  }
}

// ===== Tab2 自动排课 =====
const autoFormRef = ref<FormInstance>()
const autoSubmitting = ref(false)
const autoCourtOptions = ref<Court[]>([])

const autoForm = reactive<AutoScheduleParams>({
  courseId: undefined as unknown as number,
  venueId: undefined as unknown as number,
  courtId: undefined as unknown as number,
  weeklyTimes: 1,
  weekDays: [],
  startDate: dayjs().format('YYYY-MM-DD'),
  endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
  startTime: '09:00',
  duration: 60,
})

const weekDayOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

const autoRules = {
  courseId: [{ required: true, message: '请选择课程', trigger: 'change' }],
  venueId: [{ required: true, message: '请选择球馆', trigger: 'change' }],
  courtId: [{ required: true, message: '请选择场地', trigger: 'change' }],
  weeklyTimes: [{ required: true, message: '请填写每周次数', trigger: 'blur' }],
  weekDays: [{ required: true, message: '请选择每周星期几', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择起始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  duration: [{ required: true, message: '请填写时长', trigger: 'blur' }],
}

async function onAutoVenueChange(venueId: number | undefined) {
  autoForm.courtId = undefined as unknown as number
  autoCourtOptions.value = []
  if (venueId) {
    await loadCourts(venueId, autoCourtOptions)
  }
}
// 课程/球馆变更时占位(预留联动)
function onAutoVenueOrCourseChange() {
  // 暂无联动逻辑
}

async function submitAutoSchedule() {
  await autoFormRef.value?.validate()
  autoSubmitting.value = true
  try {
    const count = await autoSchedule({ ...autoForm })
    message.success(`已生成 ${count} 节排课`)
    activeTab.value = 'calendar'
    loadCalendarSessions()
  } finally {
    autoSubmitting.value = false
  }
}

// ===== 场地加载通用方法 =====
async function loadCourts(venueId: number, target: { value: Court[] }) {
  try {
    target.value = await getVenueCourts(venueId)
  } catch {
    target.value = []
  }
}

// ===== Tab3 待处理冲突 =====
const pendingLoading = ref(false)
const pendingList = ref<TrainingSession[]>([])

const conflictColumns: TableColumnsType = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '时间', dataIndex: 'time', width: 140 },
  { title: '课程', dataIndex: 'courseName', width: 140 },
  { title: '球馆场地', dataIndex: 'venue', width: 180 },
  { title: '教练', dataIndex: 'coachName', width: 100 },
  { title: '冲突类型', dataIndex: 'conflictType', width: 140 },
  { title: '操作', dataIndex: 'action', width: 140, fixed: 'right' },
]

async function loadPending() {
  pendingLoading.value = true
  try {
    const res = await getPendingSessions()
    pendingList.value = (res || []).filter((s) => !!s.conflictType)
  } catch {
    pendingList.value = []
  } finally {
    pendingLoading.value = false
  }
}

async function cancelPending(record: TrainingSession) {
  await deleteSession(record.id)
  message.success('已取消该排课')
  loadPending()
}

// ===== 解决冲突 Modal =====
const resolveModalOpen = ref(false)
const resolveSubmitting = ref(false)
const resolveFormRef = ref<FormInstance>()
const resolveCourtOptions = ref<Court[]>([])

const resolveForm = reactive<{
  id: number
  venueId?: number
  courtId?: number
  date?: string
  startTime?: string
  endTime?: string
}>({
  id: 0,
  venueId: undefined,
  courtId: undefined,
  date: '',
  startTime: '',
  endTime: '',
})

const resolveRules = {
  venueId: [{ required: true, message: '请选择球馆', trigger: 'change' }],
  courtId: [{ required: true, message: '请选择场地', trigger: 'change' }],
  date: [{ required: true, message: '请选择上课日期', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
}

async function openResolve(record: TrainingSession) {
  Object.assign(resolveForm, {
    id: record.id,
    venueId: record.venueId,
    courtId: record.courtId,
    date: record.date,
    startTime: record.startTime,
    endTime: record.endTime,
  })
  resolveCourtOptions.value = []
  if (record.venueId) {
    await loadCourts(record.venueId, resolveCourtOptions)
  }
  resolveModalOpen.value = true
}

async function onResolveVenueChange(venueId: number | undefined) {
  resolveForm.courtId = undefined
  resolveCourtOptions.value = []
  if (venueId) {
    await loadCourts(venueId, resolveCourtOptions)
  }
}

async function submitResolve() {
  await resolveFormRef.value?.validate()
  resolveSubmitting.value = true
  try {
    const { id, ...rest } = resolveForm
    await resolveConflict(id, rest)
    message.success('冲突已解决')
    resolveModalOpen.value = false
    loadPending()
  } finally {
    resolveSubmitting.value = false
  }
}

// ===== 初始化 =====
onMounted(async () => {
  await loadOptions()
  loadCalendarSessions()
})
</script>

<style scoped lang="scss">
// ===== 筛选栏 =====
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

// ===== 日历 =====
.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.month-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  .month-label {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
    min-width: 96px;
    text-align: center;
  }
  .today-btn {
    margin-left: 8px;
  }
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e5e7eb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}
.calendar-header-cell {
  background: #f8fafc;
  padding: 8px;
  text-align: center;
  font-weight: 500;
  color: #475569;
  font-size: 13px;
}
.calendar-cell {
  background: #fff;
  min-height: 116px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  &.out-of-month {
    background: #f8fafc;
    .cell-date {
      color: #cbd5e1;
    }
  }
  &.today {
    background: #f0fdf4;
    .cell-date {
      color: #059669;
      font-weight: 700;
    }
  }
}
.cell-date {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 4px;
}
.cell-sessions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}
.session-item {
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 4px;
  border-left: 3px solid #1677ff;
  background: #f1f5f9;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.8;
  }
  .session-time {
    font-weight: 600;
    color: #0f172a;
    margin-right: 4px;
  }
  .session-name {
    color: #1e293b;
  }
  .session-meta {
    color: #64748b;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// ===== 表格 =====
.danger-link {
  color: #ef4444;
}
.sub-text {
  font-size: 12px;
  color: #999;
}
</style>
