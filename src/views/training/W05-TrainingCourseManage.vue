<template>
  <div class="page-container">
    <!-- 顶部统计卡 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">在架课程</div>
        <div class="stat-value text-primary">{{ activeCourseCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本月报名</div>
        <div class="stat-value text-accent">{{ stats.monthEnrollments }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总消课率</div>
        <div class="stat-value">{{ stats.consumeRate }}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">培训收入</div>
        <div class="stat-value text-success">¥ {{ formatFen(stats.totalRevenue) }}</div>
      </div>
    </div>

    <div class="page-card">
      <a-tabs v-model:activeKey="activeTab">
        <!-- ========== Tab 1: 课程管理 ========== -->
        <a-tab-pane key="course" tab="课程管理">
          <!-- 工具栏 -->
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <a-input-search
                v-model:value="searchKeyword"
                placeholder="课程名"
                style="width: 220px"
                allow-clear
                @search="handleCourseSearch"
              />
              <a-select
                v-model:value="searchCourseType"
                placeholder="课程类型"
                style="width: 140px"
                allow-clear
                :options="courseTypeOptions"
                @change="handleCourseSearch"
              />
              <a-select
                v-model:value="searchStatus"
                placeholder="状态"
                style="width: 140px"
                allow-clear
                :options="courseStatusOptions"
                @change="handleCourseSearch"
              />
              <a-button @click="handleCourseReset">重置</a-button>
            </div>
            <a-button type="primary" @click="openCreateCourse">
              <plus-outlined />
              新建课程
            </a-button>
          </div>

          <!-- 课程表格 -->
          <a-table
            :columns="courseColumns"
            :data-source="courseList"
            :loading="courseLoading"
            row-key="id"
            :pagination="coursePagination"
            :scroll="{ x: 1200 }"
            @change="handleCourseTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'name'">
                <a-space>
                  <a-tag :color="courseTypeColor(record.courseType)">{{ courseTypeLabel(record.courseType) }}</a-tag>
                  <span>{{ record.name }}</span>
                </a-space>
              </template>
              <template v-else-if="column.dataIndex === 'coachName'">
                {{ record.coachName || '-' }}
              </template>
              <template v-else-if="column.dataIndex === 'price'">
                <span class="price-text">¥ {{ formatFen(record.price) }} /课时</span>
              </template>
              <template v-else-if="column.dataIndex === 'studentCount'">
                {{ record.studentCount ?? 0 }}
              </template>
              <template v-else-if="column.dataIndex === 'progress'">
                <a-progress :percent="courseProgress(record)" size="small" />
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-badge
                  :status="record.status === 'active' ? 'success' : 'default'"
                  :text="record.status === 'active' ? '上架' : '下架'"
                />
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-space>
                  <a @click="openStudentDrawer(record)"><team-outlined /> 学员</a>
                  <a-divider type="vertical" />
                  <a @click="openEditCourse(record)"><edit-outlined /> 编辑</a>
                  <a-divider type="vertical" />
                  <a @click="handleToggleStatus(record)">{{ record.status === 'active' ? '下架' : '上架' }}</a>
                  <a-divider type="vertical" />
                  <a-popconfirm title="确认删除该课程？" @confirm="handleDeleteCourse(record)">
                    <a class="danger-link"><delete-outlined /> 删除</a>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- ========== Tab 2: 教练管理 ========== -->
        <a-tab-pane key="coach" tab="教练管理">
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <a-input-search
                v-model:value="coachSearchKeyword"
                placeholder="姓名 / 手机号"
                style="width: 240px"
                allow-clear
                @search="handleCoachSearch"
              />
              <a-button @click="handleCoachReset">重置</a-button>
            </div>
            <a-button type="primary" @click="openCreateCoach">
              <plus-outlined />
              新建教练
            </a-button>
          </div>

          <a-table
            :columns="coachColumns"
            :data-source="coachList"
            :loading="coachLoading"
            row-key="id"
            :pagination="false"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'name'">
                <a-space>
                  <a-avatar :size="32" style="background-color: #0284c7">
                    <template #icon><user-outlined /></template>
                  </a-avatar>
                  {{ record.name }}
                </a-space>
              </template>
              <template v-else-if="column.dataIndex === 'sessionCount'">
                {{ record.sessionCount ?? 0 }}
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-space>
                  <a @click="openEditCoach(record)"><edit-outlined /> 编辑</a>
                  <a-divider type="vertical" />
                  <a-popconfirm title="确认删除该教练？" @confirm="handleDeleteCoach(record)">
                    <a class="danger-link"><delete-outlined /> 删除</a>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- 新建/编辑课程 Modal -->
    <a-modal
      v-model:open="courseModalOpen"
      :title="isCourseEdit ? '编辑课程' : '新建课程'"
      :confirm-loading="submitting"
      :width="600"
      @ok="submitCourse"
    >
      <a-form ref="courseFormRef" :model="courseForm" :rules="courseRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="课程名" name="name">
              <a-input v-model:value="courseForm.name" placeholder="请输入课程名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="教练" name="coachId">
              <a-select
                v-model:value="courseForm.coachId"
                placeholder="请选择教练"
                :options="coachOptions"
                :field-names="{ label: 'label', value: 'value' }"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="总课时" name="totalSessions">
              <a-input-number
                v-model:value="courseForm.totalSessions"
                :min="1"
                :step="1"
                style="width: 100%"
                placeholder="请输入总课时"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="单价(元/课时)" name="price">
              <a-input-number
                v-model:value="courseForm.price"
                :min="0"
                :step="50"
                style="width: 100%"
                placeholder="0.00"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="课程类型" name="courseType">
              <a-radio-group v-model:value="courseForm.courseType">
                <a-radio value="class">班课</a-radio>
                <a-radio value="private">私教</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态" name="status">
              <a-radio-group v-model:value="courseForm.status">
                <a-radio value="active">上架</a-radio>
                <a-radio value="inactive">下架</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="课程描述" name="description">
          <a-textarea v-model:value="courseForm.description" :rows="3" placeholder="课程描述" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 新建/编辑教练 Modal -->
    <a-modal
      v-model:open="coachModalOpen"
      :title="isCoachEdit ? '编辑教练' : '新建教练'"
      :confirm-loading="submitting"
      :width="480"
      @ok="submitCoach"
    >
      <a-form ref="coachFormRef" :model="coachForm" :rules="coachRules" layout="vertical">
        <a-form-item label="姓名" name="name">
          <a-input v-model:value="coachForm.name" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item label="手机号" name="phone">
          <a-input v-model:value="coachForm.phone" placeholder="请输入手机号" :maxlength="11" />
        </a-form-item>
        <a-form-item label="专项" name="specialty">
          <a-input v-model:value="coachForm.specialty" placeholder="如: 单打技术 / 双打战术 / 少儿启蒙" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 报名学员 Drawer -->
    <a-drawer
      v-model:open="studentDrawerOpen"
      :title="`报名学员 - ${currentCourse?.name || ''}`"
      width="720"
      :destroy-on-close="true"
    >
      <a-table
        :columns="studentColumns"
        :data-source="students"
        :loading="studentsLoading"
        row-key="id"
        :pagination="studentsPagination"
        size="middle"
        @change="handleStudentsTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'progress'">
            <a-progress :percent="record.progress" size="small" />
          </template>
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message, type FormInstance, type TableColumnsType } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import {
  getCourseStats,
  getCourseList,
  createCourse,
  updateCourse,
  toggleCourseStatus,
  deleteCourse,
  getCoachList,
  createCoach,
  updateCoach,
  deleteCoach,
  getCourseStudents,
  type CourseQuery,
} from '@/api/training'
import { useTable } from '@/composables/useTable'
import type { PageQuery } from '@/types/api'
import type {
  Coach,
  TrainingCourse,
  CourseStudent,
  CourseStats,
  CourseType,
  CourseStatus,
} from '@/types/models'

// ===== 工具 =====
/** 分转元, 保留两位小数 */
function formatFen(fen: number | undefined): string {
  if (fen === undefined || fen === null) return '0.00'
  return (fen / 100).toFixed(2)
}

// ===== 映射 =====
const courseTypeOptions = [
  { label: '班课', value: 'class' as CourseType },
  { label: '私教', value: 'private' as CourseType },
]
function courseTypeLabel(t: CourseType): string {
  return courseTypeOptions.find((o) => o.value === t)?.label || t
}
function courseTypeColor(t: CourseType): string {
  return t === 'class' ? 'blue' : 'gold'
}

const courseStatusOptions = [
  { label: '上架', value: 'active' as CourseStatus },
  { label: '下架', value: 'inactive' as CourseStatus },
]

// ===== 统计 =====
const stats = reactive<CourseStats>({
  activeCourses: 0,
  monthEnrollments: 0,
  consumeRate: 0,
  totalRevenue: 0,
})
/** 在架课程数(从课程列表统计) */
const activeCourseCount = ref(0)

async function loadStats() {
  try {
    const data = await getCourseStats()
    Object.assign(stats, data)
  } catch {
    // 静默失败, 保持 0
  }
}
async function loadActiveCourseCount() {
  try {
    // 以 status=active 过滤课程列表, 取 total 作为在架课程数
    const res = await getCourseList({ status: 'active', page: 1, size: 1 })
    activeCourseCount.value = res.total || 0
  } catch {
    activeCourseCount.value = 0
  }
}

// ===== Tab =====
const activeTab = ref<'course' | 'coach'>('course')

// ===== 课程列表 =====
const searchKeyword = ref('')
const searchCourseType = ref<CourseType | undefined>(undefined)
const searchStatus = ref<CourseStatus | undefined>(undefined)

const courseColumns: TableColumnsType = [
  { title: '课程名', dataIndex: 'name', width: 220 },
  { title: '教练', dataIndex: 'coachName', width: 120 },
  { title: '总课时', dataIndex: 'totalSessions', width: 90, align: 'right' },
  { title: '单价', dataIndex: 'price', width: 140, align: 'right' },
  { title: '报名人数', dataIndex: 'studentCount', width: 100, align: 'right' },
  { title: '消课进度', dataIndex: 'progress', width: 170 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '操作', dataIndex: 'action', width: 300, fixed: 'right' },
]

const {
  loading: courseLoading,
  dataList: courseList,
  queryParams: courseQueryParams,
  pagination: coursePagination,
  loadData: loadCourseList,
  refresh: refreshCourseList,
  resetQuery: resetCourseQuery,
  handleTableChange: handleCourseTableChange,
} = useTable<CourseQuery, TrainingCourse>({
  fetchApi: getCourseList,
  initialQuery: { keyword: '', courseType: undefined, status: undefined },
})

function handleCourseSearch() {
  courseQueryParams.keyword = searchKeyword.value || undefined
  courseQueryParams.courseType = searchCourseType.value
  courseQueryParams.status = searchStatus.value
  refreshCourseList()
}
function handleCourseReset() {
  searchKeyword.value = ''
  searchCourseType.value = undefined
  searchStatus.value = undefined
  resetCourseQuery()
}

/** 课程消课进度百分比 */
function courseProgress(record: TrainingCourse): number {
  const total = record.totalSessions || 0
  if (!total) return 0
  return Math.min(100, Math.round(((record.consumedSessions ?? 0) / total) * 100))
}

// ===== 教练列表 (供教练 Tab 与课程表单下拉使用) =====
const coachSearchKeyword = ref('')
const coachList = ref<Coach[]>([])
const coachLoading = ref(false)
const coachOptions = computed(() =>
  coachList.value.map((c) => ({ label: `${c.name}（${c.specialty || '通用'}）`, value: c.id })),
)

async function loadCoachList() {
  coachLoading.value = true
  try {
    const res = await getCoachList({ keyword: coachSearchKeyword.value || undefined })
    coachList.value = res || []
  } catch {
    coachList.value = []
  } finally {
    coachLoading.value = false
  }
}
function handleCoachSearch() {
  loadCoachList()
}
function handleCoachReset() {
  coachSearchKeyword.value = ''
  loadCoachList()
}

const coachColumns: TableColumnsType = [
  { title: '姓名', dataIndex: 'name', width: 180 },
  { title: '手机号', dataIndex: 'phone', width: 150 },
  { title: '专项', dataIndex: 'specialty', width: 180 },
  { title: '已排课节数', dataIndex: 'sessionCount', width: 120, align: 'right' },
  { title: '操作', dataIndex: 'action', width: 160 },
]

// ===== 新建/编辑课程 =====
const courseModalOpen = ref(false)
const isCourseEdit = ref(false)
const submitting = ref(false)
const courseFormRef = ref<FormInstance>()
const editingCourseId = ref(0)
const courseForm = reactive<{
  name: string
  coachId: number | undefined
  totalSessions: number
  price: number
  courseType: CourseType
  description: string
  status: CourseStatus
}>({
  name: '',
  coachId: undefined,
  totalSessions: 0,
  price: 0,
  courseType: 'class',
  description: '',
  status: 'active',
})
const courseRules = {
  name: [{ required: true, message: '请输入课程名', trigger: 'blur' }],
  coachId: [{ required: true, message: '请选择教练', trigger: 'change' }],
  totalSessions: [{ required: true, type: 'number', min: 1, message: '请输入总课时', trigger: 'blur' }],
  price: [{ required: true, type: 'number', min: 0, message: '请输入单价', trigger: 'blur' }],
  courseType: [{ required: true, message: '请选择课程类型', trigger: 'change' }],
}

function openCreateCourse() {
  isCourseEdit.value = false
  Object.assign(courseForm, {
    name: '',
    coachId: undefined,
    totalSessions: 0,
    price: 0,
    courseType: 'class',
    description: '',
    status: 'active',
  })
  courseModalOpen.value = true
  // 刷新教练下拉, 确保选项最新
  loadCoachList()
}
function openEditCourse(record: TrainingCourse) {
  isCourseEdit.value = true
  editingCourseId.value = record.id
  Object.assign(courseForm, {
    name: record.name,
    coachId: record.coachId,
    totalSessions: record.totalSessions,
    // 分转元
    price: record.price / 100,
    courseType: record.courseType,
    description: record.description,
    status: record.status,
  })
  courseModalOpen.value = true
  loadCoachList()
}

async function submitCourse() {
  await courseFormRef.value?.validate()
  submitting.value = true
  try {
    const payload = {
      name: courseForm.name,
      coachId: courseForm.coachId,
      totalSessions: courseForm.totalSessions,
      // 元转分
      price: Math.round(courseForm.price * 100),
      courseType: courseForm.courseType,
      description: courseForm.description,
      status: courseForm.status,
    }
    if (isCourseEdit.value) {
      await updateCourse(editingCourseId.value, payload)
      message.success('课程更新成功')
    } else {
      await createCourse(payload)
      message.success('课程创建成功')
    }
    courseModalOpen.value = false
    loadCourseList()
    loadActiveCourseCount()
    loadStats()
  } finally {
    submitting.value = false
  }
}

async function handleToggleStatus(record: TrainingCourse) {
  const nextStatus: CourseStatus = record.status === 'active' ? 'inactive' : 'active'
  try {
    await toggleCourseStatus(record.id, nextStatus)
    message.success(nextStatus === 'active' ? '已上架' : '已下架')
    loadCourseList()
    loadActiveCourseCount()
  } catch (err: unknown) {
    // 下架失败(如存在未消课学员, API 返回 400), 提示 API 返回的错误消息
    const apiMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    if (apiMsg) message.error(apiMsg)
  }
}

async function handleDeleteCourse(record: TrainingCourse) {
  try {
    await deleteCourse(record.id)
    message.success('删除成功')
    loadCourseList()
    loadActiveCourseCount()
    loadStats()
  } catch {
    // 拦截器已提示
  }
}

// ===== 报名学员 Drawer =====
const studentDrawerOpen = ref(false)
const currentCourse = ref<TrainingCourse | null>(null)
const currentCourseId = ref(0)

const studentColumns: TableColumnsType = [
  { title: '学员', dataIndex: 'studentName', width: 120 },
  { title: '手机号', dataIndex: 'studentPhone', width: 130 },
  { title: '报名时间', dataIndex: 'enrollTime', width: 160 },
  { title: '总课时', dataIndex: 'totalSessions', width: 80, align: 'right' },
  { title: '已消', dataIndex: 'consumedSessions', width: 70, align: 'right' },
  { title: '剩余', dataIndex: 'remainingSessions', width: 70, align: 'right' },
  { title: '进度', dataIndex: 'progress', width: 160 },
]

const {
  loading: studentsLoading,
  dataList: students,
  pagination: studentsPagination,
  refresh: refreshStudents,
  handleTableChange: handleStudentsTableChange,
} = useTable<PageQuery, CourseStudent>({
  // 闭包读取当前课程 id, 调用时取最新值
  fetchApi: (params) => getCourseStudents(currentCourseId.value, params),
})

function openStudentDrawer(record: TrainingCourse) {
  currentCourse.value = record
  currentCourseId.value = record.id
  studentDrawerOpen.value = true
  refreshStudents()
}

// ===== 新建/编辑教练 =====
const coachModalOpen = ref(false)
const isCoachEdit = ref(false)
const coachFormRef = ref<FormInstance>()
const editingCoachId = ref(0)
const coachForm = reactive<{ name: string; phone: string; specialty: string }>({
  name: '',
  phone: '',
  specialty: '',
})
const coachRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
}

function openCreateCoach() {
  isCoachEdit.value = false
  Object.assign(coachForm, { name: '', phone: '', specialty: '' })
  coachModalOpen.value = true
}
function openEditCoach(record: Coach) {
  isCoachEdit.value = true
  editingCoachId.value = record.id
  Object.assign(coachForm, {
    name: record.name,
    phone: record.phone,
    specialty: record.specialty,
  })
  coachModalOpen.value = true
}

async function submitCoach() {
  await coachFormRef.value?.validate()
  submitting.value = true
  try {
    if (isCoachEdit.value) {
      await updateCoach(editingCoachId.value, coachForm)
      message.success('教练更新成功')
    } else {
      await createCoach(coachForm)
      message.success('教练创建成功')
    }
    coachModalOpen.value = false
    loadCoachList()
  } finally {
    submitting.value = false
  }
}

async function handleDeleteCoach(record: Coach) {
  try {
    await deleteCoach(record.id)
    message.success('删除成功')
    loadCoachList()
  } catch {
    // 拦截器已提示
  }
}

// 初始化加载
loadCourseList()
loadStats()
loadActiveCourseCount()
loadCoachList()
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
.page-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
  .table-toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}
.price-text {
  color: #059669;
  font-weight: 600;
}
.danger-link {
  color: #ef4444;
}
</style>
