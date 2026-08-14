<template>
  <div class="venue-manage">
    <!-- 顶部工具栏：标题 + 球馆选择器 + 小程序场地锁定入口 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">球馆管理</h2>
        <a-select
          v-model:value="currentVenueId"
          class="venue-selector"
          :options="venueOptions"
          :loading="venueLoading"
          placeholder="请选择球馆"
          :disabled="venueOptions.length === 0"
          @change="onVenueChange"
        >
          <template #prefix><environment-outlined /></template>
        </a-select>
      </div>
      <a-tooltip title="场地锁定功能请在小程序管理端操作">
        <a-button @click="goMpLock">
          <lock-outlined />
          小程序场地锁定
        </a-button>
      </a-tooltip>
    </div>

    <a-spin :spinning="detailLoading" tip="加载中...">
      <a-tabs v-model:activeKey="activeTab" class="content-tabs">
        <!-- ========== Tab 1: 球馆信息 ========== -->
        <a-tab-pane key="info" tab="球馆信息">
          <div class="page-card">
            <div class="card-title">基本信息</div>
            <a-form
              ref="venueFormRef"
              :model="venueForm"
              :rules="venueRules"
              layout="vertical"
            >
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="球馆名称" name="name">
                    <a-input v-model:value="venueForm.name" placeholder="请输入球馆名称" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="联系电话" name="phone">
                    <a-input v-model:value="venueForm.phone" placeholder="请输入联系电话" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="球馆地址" name="address">
                    <a-input v-model:value="venueForm.address" placeholder="请输入球馆地址" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="详细地址" name="detailAddress">
                    <a-input v-model:value="venueForm.detailAddress" placeholder="门牌号、楼层等" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="营业开始时间" name="openTime">
                    <a-time-picker
                      v-model:value="venueForm.openTime"
                      format="HH:mm"
                      value-format="HH:mm"
                      style="width: 100%"
                      placeholder="08:00"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="营业结束时间" name="closeTime">
                    <a-time-picker
                      v-model:value="venueForm.closeTime"
                      format="HH:mm"
                      value-format="HH:mm"
                      style="width: 100%"
                      placeholder="22:00"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item label="球馆图片（最多 5 张）">
                <a-upload
                  v-model:file-list="imageFileList"
                  list-type="picture-card"
                  :max-count="5"
                  :before-upload="() => false"
                  accept="image/*"
                >
                  <div v-if="imageFileList.length < 5">
                    <plus-outlined />
                    <div class="upload-text">上传图片</div>
                  </div>
                </a-upload>
              </a-form-item>

              <a-form-item label="球馆简介" name="intro">
                <a-textarea
                  v-model:value="venueForm.intro"
                  :rows="4"
                  placeholder="输入球馆介绍、配套设施、交通指引等"
                  :maxlength="500"
                  show-count
                />
              </a-form-item>

              <div class="form-actions">
                <a-button @click="resetVenueForm">取消</a-button>
                <a-button type="primary" :loading="saving" @click="saveVenueInfo">保存基本信息</a-button>
              </div>
            </a-form>
          </div>
        </a-tab-pane>

        <!-- ========== Tab 2: 场地配置 ========== -->
        <a-tab-pane key="courts" tab="场地配置">
          <div class="page-card">
            <div class="card-toolbar">
              <div class="card-title">
                场地列表（{{ courtList.length }} 片）
              </div>
              <a-button type="primary" @click="openCourtCreate">
                <plus-outlined />
                添加场地
              </a-button>
            </div>
            <a-table
              :columns="courtColumns"
              :data-source="courtList"
              :loading="courtLoading"
              row-key="id"
              :pagination="false"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'type'">
                  {{ courtTypeLabel(record.type) }}
                </template>
                <template v-else-if="column.dataIndex === 'indoor'">
                  <a-tag :color="record.indoor ? 'orange' : 'cyan'">
                    {{ record.indoor ? '室内' : '室外' }}
                  </a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'status'">
                  <a-switch
                    :checked="record.status === 1"
                    checked-children="可用"
                    un-checked-children="维护"
                    @change="(v: boolean) => toggleCourtStatus(record, v)"
                  />
                </template>
                <template v-else-if="column.dataIndex === 'action'">
                  <a @click="openCourtEdit(record)">编辑</a>
                  <a-divider type="vertical" />
                  <a-popconfirm title="删除该场地?" @confirm="handleDeleteCourt(record)">
                    <a class="danger-link">删除</a>
                  </a-popconfirm>
                </template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <!-- ========== Tab 3: 时段价格 ========== -->
        <a-tab-pane key="prices" tab="时段价格">
          <div class="page-card">
            <div class="card-toolbar">
              <div class="card-title">时段价格配置</div>
              <a-space>
                <span class="hint-text">价格组按优先级从高到低匹配，当天命中最高优先级的组生效</span>
                <a-button type="primary" :disabled="courtList.length === 0" @click="openGroupCreate">
                  <plus-outlined />
                  新增价格组
                </a-button>
              </a-space>
            </div>

            <a-alert
              v-if="courtList.length === 0"
              type="warning"
              show-icon
              message="请先在“场地配置”中添加场地"
              style="margin-bottom: 16px"
            />

            <!-- 价格组列表 -->
            <a-table
              :columns="groupColumns"
              :data-source="groupList"
              row-key="key"
              :pagination="false"
              size="middle"
              :loading="priceLoading"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'priority'">
                  <a-tag :color="record.priority > 0 ? 'geekblue' : 'default'">优先级 {{ record.priority }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'matchType'">
                  <a-tag :color="matchTypeColor(record.matchType)">{{ matchTypeLabel(record.matchType) }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'scope'">
                  {{ scopeText(record) }}
                </template>
                <template v-else-if="column.dataIndex === 'status'">
                  <a-switch
                    :checked="record.status === 1"
                    checked-children="启用"
                    un-checked-children="停用"
                    @change="(v: boolean) => { record.status = v ? 1 : 0 }"
                  />
                </template>
                <template v-else-if="column.dataIndex === 'rules'">
                  <template v-if="record.rules.length === 0">
                    <span class="hint-text">未配置时段</span>
                  </template>
                  <a-tag v-for="(r, i) in record.rules" :key="i" class="rule-tag">
                    {{ r.startTime }}-{{ r.endTime }}
                    {{ priceTypeLabel(r.priceType) }} {{ r.price / 100 }} 元
                  </a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'action'">
                  <a @click="openGroupEdit(record)">编辑</a>
                  <a-divider type="vertical" />
                  <a-popconfirm title="删除该价格组?" @confirm="removeGroup(record.key)">
                    <a class="danger-link">删除</a>
                  </a-popconfirm>
                </template>
              </template>
            </a-table>

            <div class="form-actions">
              <a-button type="primary" :loading="saving" :disabled="courtList.length === 0" @click="savePrices">
                保存价格配置
              </a-button>
            </div>
          </div>
        </a-tab-pane>

        <!-- ========== Tab 4: 球馆介绍 ========== -->
        <a-tab-pane key="intro" tab="球馆介绍">
          <div class="page-card">
            <div class="card-title">球馆介绍</div>
            <a-form layout="vertical">
              <a-form-item label="场馆详情">
                <a-textarea
                  v-model:value="venueForm.description"
                  :rows="6"
                  placeholder="输入球馆介绍、配套设施、交通指引等"
                  :maxlength="2000"
                  show-count
                />
              </a-form-item>
              <a-form-item label="交通指引">
                <a-input
                  v-model:value="venueForm.traffic"
                  placeholder="如：地铁 1 号线高新园站 D 口 · 步行约 8 分钟"
                />
              </a-form-item>
              <a-form-item label="配套设施标签">
                <a-select
                  v-model:value="venueForm.facilities"
                  mode="multiple"
                  :options="facilityOptions"
                  placeholder="选择配套设施"
                />
              </a-form-item>
              <a-form-item label="球馆相册（最多 9 张）">
                <a-upload
                  v-model:file-list="albumFileList"
                  list-type="picture-card"
                  :max-count="9"
                  :before-upload="() => false"
                  accept="image/*"
                >
                  <div v-if="albumFileList.length < 9">
                    <plus-outlined />
                    <div class="upload-text">上传图片</div>
                  </div>
                </a-upload>
              </a-form-item>
              <div class="form-actions">
                <a-button @click="resetIntroForm">取消</a-button>
                <a-button type="primary" :loading="saving" @click="saveIntro">保存介绍</a-button>
              </div>
            </a-form>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-spin>

    <!-- 场地新增/编辑 Drawer -->
    <a-drawer
      v-model:open="courtDrawerOpen"
      :title="courtIsEdit ? '编辑场地' : '新增场地'"
      width="440"
      :destroy-on-close="true"
    >
      <a-form
        ref="courtFormRef"
        :model="courtForm"
        :rules="courtRules"
        layout="vertical"
      >
        <a-form-item label="场地编号/名称" name="name">
          <a-input v-model:value="courtForm.name" placeholder="如：1号场" />
        </a-form-item>
        <a-form-item label="运动类型" name="type">
          <a-select v-model:value="courtForm.type" :options="courtTypeOptions" />
        </a-form-item>
        <a-form-item label="室内/室外" name="indoor">
          <a-radio-group v-model:value="courtForm.indoor">
            <a-radio :value="true">室内</a-radio>
            <a-radio :value="false">室外</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="是否可用" name="status">
          <a-radio-group v-model:value="courtForm.status">
            <a-radio :value="1">可用</a-radio>
            <a-radio :value="0">维护中</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="排序顺序" name="sort">
          <a-input-number v-model:value="courtForm.sort" :min="0" style="width: 100%" />
        </a-form-item>
      </a-form>
      <template #footer>
        <div style="text-align: right">
          <a-button style="margin-right: 8px" @click="courtDrawerOpen = false">取消</a-button>
          <a-button type="primary" :loading="saving" @click="submitCourt">保存</a-button>
        </div>
      </template>
    </a-drawer>

    <!-- 价格组新增/编辑 Drawer -->
    <a-drawer
      v-model:open="groupDrawerOpen"
      :title="groupIsEdit ? '编辑价格组' : '新增价格组'"
      width="640"
      :destroy-on-close="true"
    >
      <a-form ref="groupFormRef" :model="groupForm" :rules="groupRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="组名称" name="name">
              <a-input v-model:value="groupForm.name" placeholder="如：默认价/工作日/周末/国庆" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="适用日期类型" name="matchType">
              <a-select
                v-model:value="groupForm.matchType"
                :options="matchTypeOptions"
                style="width: 100%"
                @change="onMatchTypeChange"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row v-if="showWeekdayPicker" :gutter="16">
          <a-col :span="24">
            <a-form-item label="适用星期">
              <a-checkbox-group v-model:value="groupForm.daysArr">
                <a-checkbox v-for="d in dayOptions" :key="d.value" :value="d.value">
                  {{ d.label }}
                </a-checkbox>
              </a-checkbox-group>
              <div class="hint-text">可选多个星期；若选“周一~周五”即工作日，选“周六、周日”即周末</div>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row v-if="showDatePicker" :gutter="16">
          <a-col :span="24">
            <a-form-item label="适用日期区间（法定节假日/固定日期请在此选择具体日期）">
              <a-range-picker
                v-model:value="groupForm.dateRange"
                :value-format="'YYYY-MM-DD'"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="优先级（数字越大越优先）" name="priority">
              <a-input-number v-model:value="groupForm.priority" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-radio-group v-model:value="groupForm.status">
                <a-radio :value="1">启用</a-radio>
                <a-radio :value="0">停用</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>

        <div class="card-title">时段规则（组内各时段的计价）</div>
        <a-form layout="inline" class="price-form" :model="ruleForm">
          <a-form-item label="开始时间">
            <a-time-picker v-model:value="ruleForm.startTime" format="HH:mm" value-format="HH:mm" style="width: 100px" />
          </a-form-item>
          <a-form-item label="结束时间">
            <a-time-picker v-model:value="ruleForm.endTime" format="HH:mm" value-format="HH:mm" style="width: 100px" />
          </a-form-item>
          <a-form-item label="计价方式">
            <a-select v-model:value="ruleForm.priceType" :options="priceTypeOptions" style="width: 130px" />
          </a-form-item>
          <a-form-item label="价格">
            <a-input-number
              v-model:value="ruleForm.price"
              :min="0"
              :step="10"
              style="width: 110px"
              :addon-after="ruleForm.priceType === 'range' ? '元/整段' : '元/小时'"
            />
          </a-form-item>
          <a-form-item v-if="ruleForm.priceType === 'hourly'" label="最小时长">
            <a-input-number v-model:value="ruleForm.minDuration" :min="30" :step="30" style="width: 100px" addon-after="分钟" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" @click="submitRule">添加规则</a-button>
          </a-form-item>
        </a-form>

        <a-table
          :columns="ruleColumns"
          :data-source="ruleList"
          row-key="key"
          :pagination="false"
          size="small"
          style="margin-top: 8px"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'timeRange'">
              {{ record.startTime }} - {{ record.endTime }}
            </template>
            <template v-else-if="column.dataIndex === 'priceType'">
              {{ priceTypeLabel(record.priceType) }}
            </template>
            <template v-else-if="column.dataIndex === 'price'">
              <span class="price-tag">{{ record.price }} 元/{{ record.priceType === 'hourly' ? '小时' : '整段' }}</span>
            </template>
            <template v-else-if="column.dataIndex === 'minDuration'">
              {{ record.minDuration }} 分钟
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a @click="editRule(record)">编辑</a>
              <a-divider type="vertical" />
              <a-popconfirm title="删除该规则?" @confirm="ruleList.splice(index, 1)">
                <a class="danger-link">删除</a>
              </a-popconfirm>
            </template>
          </template>
        </a-table>
      </a-form>
      <template #footer>
        <div style="text-align: right">
          <a-button style="margin-right: 8px" @click="groupDrawerOpen = false">取消</a-button>
          <a-button type="primary" :loading="saving" @click="submitGroup">保存价格组</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message, type FormInstance, type TableColumnsType, type UploadFile } from 'ant-design-vue'
import { PlusOutlined, LockOutlined, EnvironmentOutlined } from '@ant-design/icons-vue'
import {
  getAllVenues,
  getVenueDetail,
  updateVenue,
  getVenueCourts,
  createCourt,
  updateCourt,
  deleteCourt,
  getCourtPriceGroups,
  saveCourtPriceGroups,
} from '@/api/venue'
import type {
  Venue,
  Court,
  CourtType,
  PriceType,
  PriceGroup,
  PriceGroupMatchType,
  PriceRule,
} from '@/types/models'

// ===== 映射 =====
const facilityOptions = [
  { label: '免费停车', value: 'parking' },
  { label: 'WiFi', value: 'wifi' },
  { label: '饮水机', value: 'water' },
  { label: '空调', value: 'ac' },
  { label: '更衣室', value: 'changing_room' },
  { label: '淋浴间', value: 'shower' },
]

const courtTypeOptions = [
  { label: '羽毛球', value: 'badminton' },
  { label: '网球', value: 'tennis' },
  { label: '篮球', value: 'basketball' },
  { label: '乒乓球', value: 'table_tennis' },
]
function courtTypeLabel(t: CourtType): string {
  return courtTypeOptions.find((o) => o.value === t)?.label || t
}

const dayOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]
function dayLabel(d: number): string {
  return dayOptions.find((o) => o.value === d)?.label || String(d)
}

const matchTypeOptions = [
  { label: '全部日期（默认价）', value: 'default' as PriceGroupMatchType },
  { label: '工作日', value: 'weekday' as PriceGroupMatchType },
  { label: '周末', value: 'weekend' as PriceGroupMatchType },
  { label: '法定节假日', value: 'holiday' as PriceGroupMatchType },
  { label: '固定日期', value: 'custom' as PriceGroupMatchType },
]
function matchTypeLabel(t: PriceGroupMatchType): string {
  return matchTypeOptions.find((o) => o.value === t)?.label || t
}
function matchTypeColor(t: PriceGroupMatchType): string {
  switch (t) {
    case 'default': return 'default'
    case 'weekday': return 'blue'
    case 'weekend': return 'green'
    case 'holiday': return 'red'
    case 'custom': return 'purple'
    default: return 'default'
  }
}

const priceTypeOptions = [
  { label: '按小时计价', value: 'hourly' as PriceType },
  { label: '按区间打包', value: 'range' as PriceType },
]
function priceTypeLabel(p: PriceType): string {
  return priceTypeOptions.find((o) => o.value === p)?.label || p
}

// ===== 球馆选择器 =====
const venueOptions = ref<{ label: string, value: number }[]>([])
const venueLoading = ref(false)
const currentVenueId = ref<number>(0)
const detailLoading = ref(false)

async function loadVenueOptions() {
  venueLoading.value = true
  try {
    const list = await getAllVenues()
    venueOptions.value = (list || []).map((v) => ({ label: v.name, value: v.id }))
    if (venueOptions.value.length > 0 && !currentVenueId.value) {
      currentVenueId.value = venueOptions.value[0].value
      await loadVenueDetail()
    }
  } catch {
    venueOptions.value = []
  } finally {
    venueLoading.value = false
  }
}

function onVenueChange() {
  loadVenueDetail()
}

// ===== 球馆详情（信息 + 介绍 共用 venueForm） =====
const venueFormRef = ref<FormInstance>()
const venueForm = reactive<Partial<Venue>>({
  name: '',
  address: '',
  phone: '',
  detailAddress: '',
  openTime: '08:00',
  closeTime: '22:00',
  intro: '',
  description: '',
  traffic: '',
  facilities: [],
  status: 1,
})
const venueRules = {
  name: [{ required: true, message: '请输入球馆名称', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  address: [{ required: true, message: '请输入球馆地址', trigger: 'blur' }],
  openTime: [{ required: true, message: '请选择营业开始时间', trigger: 'change' }],
  closeTime: [{ required: true, message: '请选择营业结束时间', trigger: 'change' }],
}

// 球馆图片（信息Tab）与相册（介绍Tab），暂用本地 fileList 占位，不实际上传
const imageFileList = ref<UploadFile[]>([])
const albumFileList = ref<UploadFile[]>([])

async function loadVenueDetail() {
  if (!currentVenueId.value) return
  detailLoading.value = true
  try {
    const detail = await getVenueDetail(currentVenueId.value)
    Object.assign(venueForm, {
      name: detail.name,
      address: detail.address,
      phone: detail.phone,
      detailAddress: detail.detailAddress || '',
      openTime: detail.openTime,
      closeTime: detail.closeTime,
      intro: detail.intro || '',
      description: detail.description || '',
      traffic: detail.traffic || '',
      facilities: [...(detail.facilities || [])],
      status: detail.status,
    })
    // 同步加载场地与价格
    loadCourts()
    loadPriceConfigs()
  } finally {
    detailLoading.value = false
  }
}

function resetVenueForm() {
  loadVenueDetail()
}

function resetIntroForm() {
  loadVenueDetail()
}

const saving = ref(false)

async function saveVenueInfo() {
  await venueFormRef.value?.validate()
  saving.value = true
  try {
    await updateVenue(currentVenueId.value, {
      name: venueForm.name,
      address: venueForm.address,
      phone: venueForm.phone,
      detailAddress: venueForm.detailAddress,
      openTime: venueForm.openTime,
      closeTime: venueForm.closeTime,
      intro: venueForm.intro,
    })
    message.success('基本信息已保存')
  } finally {
    saving.value = false
  }
}

async function saveIntro() {
  saving.value = true
  try {
    await updateVenue(currentVenueId.value, {
      description: venueForm.description,
      traffic: venueForm.traffic,
      facilities: venueForm.facilities,
    })
    message.success('球馆介绍已保存')
  } finally {
    saving.value = false
  }
}

// ===== 场地配置 =====
const courtList = ref<Court[]>([])
const courtLoading = ref(false)
const courtColumns: TableColumnsType = [
  { title: '排序', dataIndex: 'sort', width: 80, align: 'center' },
  { title: '场地编号', dataIndex: 'name', width: 140 },
  { title: '运动类型', dataIndex: 'type', width: 120 },
  { title: '室内/室外', dataIndex: 'indoor', width: 100 },
  { title: '状态', dataIndex: 'status', width: 120 },
  { title: '操作', dataIndex: 'action', width: 140 },
]

async function loadCourts() {
  if (!currentVenueId.value) return
  courtLoading.value = true
  try {
    const list = await getVenueCourts(currentVenueId.value)
    courtList.value = list || []
  } catch {
    courtList.value = []
  } finally {
    courtLoading.value = false
  }
}

// 场地新增/编辑
const courtDrawerOpen = ref(false)
const courtIsEdit = ref(false)
const courtFormRef = ref<FormInstance>()
const editingCourtId = ref<number>(0)
const courtForm = reactive<Partial<Court>>({
  name: '',
  type: 'badminton',
  indoor: true,
  status: 1,
  sort: 0,
})
const courtRules = {
  name: [{ required: true, message: '请输入场地名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择运动类型', trigger: 'change' }],
}

function openCourtCreate() {
  courtIsEdit.value = false
  Object.assign(courtForm, {
    name: '',
    type: 'badminton',
    indoor: true,
    status: 1,
    sort: courtList.value.length + 1,
  })
  courtDrawerOpen.value = true
}

function openCourtEdit(court: Court) {
  courtIsEdit.value = true
  editingCourtId.value = court.id
  Object.assign(courtForm, {
    name: court.name,
    type: court.type,
    indoor: court.indoor,
    status: court.status,
    sort: court.sort,
  })
  courtDrawerOpen.value = true
}

async function submitCourt() {
  await courtFormRef.value?.validate()
  saving.value = true
  try {
    if (courtIsEdit.value) {
      await updateCourt(currentVenueId.value, editingCourtId.value, courtForm)
      message.success('场地更新成功')
    } else {
      await createCourt(currentVenueId.value, courtForm)
      message.success('场地添加成功')
    }
    courtDrawerOpen.value = false
    loadCourts()
  } finally {
    saving.value = false
  }
}

async function toggleCourtStatus(court: Court, checked: boolean) {
  const newStatus = checked ? 1 : 0
  const oldStatus = court.status
  try {
    await updateCourt(currentVenueId.value, court.id, { status: newStatus })
    court.status = newStatus
    message.success(newStatus === 1 ? '场地已启用' : '场地已停用')
  } catch {
    // 失败时回滚开关状态
    court.status = oldStatus
  }
}

async function handleDeleteCourt(court: Court) {
  try {
    await deleteCourt(currentVenueId.value, court.id)
    message.success('场地已删除')
    loadCourts()
  } catch {
    // 删除有预订等异常由 request 层抛出
  }
}

// ===== 时段价格（价格组 + 优先级） =====
type PriceGroupRow = PriceGroup & { key: number }
const groupList = ref<PriceGroupRow[]>([])
const priceLoading = ref(false)
const groupColumns: TableColumnsType = [
  { title: '优先级', dataIndex: 'priority', width: 110 },
  { title: '组名称', dataIndex: 'name', width: 140 },
  { title: '适用日期', dataIndex: 'matchType', width: 120 },
  { title: '适用范围', dataIndex: 'scope', width: 200 },
  { title: '时段规则', dataIndex: 'rules' },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '操作', dataIndex: 'action', width: 120 },
]

/** 组内适用范围文案 */
function scopeText(g: PriceGroup): string {
  if (g.matchType === 'weekday' || g.matchType === 'weekend') {
    if (!g.daysOfWeek) return '未选择星期'
    return g.daysOfWeek.split(',').map((d) => dayLabel(Number(d))).join('、')
  }
  if (g.matchType === 'holiday' || g.matchType === 'custom') {
    if (g.startDate && g.endDate) return `${g.startDate} ~ ${g.endDate}`
    return '未选择日期'
  }
  return '全部日期'
}

/** 前端行转换: 展示单位为元, 保存时再转回分 */
function toGroupRow(g: PriceGroup, index: number): PriceGroupRow {
  return {
    ...g,
    name: g.name,
    matchType: g.matchType,
    priority: g.priority,
    status: g.status ?? 1,
    rules: (g.rules || []).map((r) => ({ ...r })),
    key: g.id || Date.now() + index,
  }
}

async function loadPriceConfigs() {
  // 价格按场地配置：当前实现只对第一个场地
  if (courtList.value.length === 0) {
    groupList.value = []
    return
  }
  const courtId = courtList.value[0].id
  priceLoading.value = true
  try {
    const groups = await getCourtPriceGroups(courtId)
    groupList.value = (groups || []).map(toGroupRow)
  } catch {
    groupList.value = []
  } finally {
    priceLoading.value = false
  }
}

// ---- 价格组编辑 ----
const groupDrawerOpen = ref(false)
const groupIsEdit = ref(false)
const groupFormRef = ref<FormInstance>()
const editingGroupKey = ref<number | null>(null)
const groupForm = reactive<{
  name: string
  matchType: PriceGroupMatchType
  daysArr: number[]
  dateRange: [string, string] | []
  priority: number
  status: number
}>({
  name: '',
  matchType: 'default',
  daysArr: [],
  dateRange: [],
  priority: 0,
  status: 1,
})
const groupRules = {
  name: [{ required: true, message: '请输入组名称', trigger: 'blur' }],
}

/** weekday/weekend 显示星期多选 */
const showWeekdayPicker = computed(() =>
  groupForm.matchType === 'weekday' || groupForm.matchType === 'weekend')
/** holiday/custom 显示日期区间 */
const showDatePicker = computed(() =>
  groupForm.matchType === 'holiday' || groupForm.matchType === 'custom')

function onMatchTypeChange() {
  // 切换类型时清空不适用的范围
  groupForm.daysArr = []
  groupForm.dateRange = []
}

/** 组内规则 */
type RuleRow = PriceRule & { key: number }
const ruleList = ref<RuleRow[]>([])
const ruleForm = reactive<{
  startTime: string
  endTime: string
  priceType: PriceType
  price: number
  minDuration: number
}>({
  startTime: '09:00',
  endTime: '18:00',
  priceType: 'hourly',
  price: 50,
  minDuration: 60,
})
const ruleColumns: TableColumnsType = [
  { title: '时段区间', dataIndex: 'timeRange', width: 140 },
  { title: '计价方式', dataIndex: 'priceType', width: 120 },
  { title: '价格', dataIndex: 'price', width: 140 },
  { title: '最小时长', dataIndex: 'minDuration', width: 110 },
  { title: '操作', dataIndex: 'action', width: 120 },
]

function openGroupCreate() {
  groupIsEdit.value = false
  editingGroupKey.value = null
  Object.assign(groupForm, {
    name: '',
    matchType: 'default',
    daysArr: [],
    dateRange: [],
    priority: 0,
    status: 1,
  })
  ruleList.value = []
  groupDrawerOpen.value = true
}

function openGroupEdit(row: PriceGroupRow) {
  groupIsEdit.value = true
  editingGroupKey.value = row.key
  const daysArr = row.daysOfWeek ? row.daysOfWeek.split(',').map(Number).filter(Boolean) : []
  const dateRange: [string, string] | [] = row.startDate && row.endDate
    ? [row.startDate, row.endDate]
    : []
  Object.assign(groupForm, {
    name: row.name,
    matchType: row.matchType,
    daysArr,
    dateRange,
    priority: row.priority,
    status: row.status ?? 1,
  })
  ruleList.value = (row.rules || []).map((r, i) => ({ ...r, key: r.id || Date.now() + i }))
  groupDrawerOpen.value = true
}

function submitRule() {
  if (!ruleForm.startTime || !ruleForm.endTime) {
    message.warning('请选择时段')
    return
  }
  if (ruleForm.startTime >= ruleForm.endTime) {
    message.warning('结束时间必须晚于开始时间')
    return
  }
  if (!ruleForm.price || ruleForm.price <= 0) {
    message.warning('请输入价格')
    return
  }
  // 冲突检测：组内时段重叠
  const overlap = ruleList.value.some((r) =>
    ruleForm.startTime < r.endTime && ruleForm.endTime > r.startTime)
  if (overlap) {
    message.warning('组内时段冲突，请调整时段范围')
    return
  }
  ruleList.value.push({
    key: Date.now(),
    startTime: ruleForm.startTime,
    endTime: ruleForm.endTime,
    priceType: ruleForm.priceType,
    price: ruleForm.price,
    minDuration: ruleForm.minDuration,
  })
  Object.assign(ruleForm, {
    startTime: '09:00',
    endTime: '18:00',
    priceType: 'hourly',
    price: 50,
    minDuration: 60,
  })
}

function editRule(row: RuleRow) {
  Object.assign(ruleForm, {
    startTime: row.startTime,
    endTime: row.endTime,
    priceType: row.priceType,
    price: row.price,
    minDuration: row.minDuration,
  })
  ruleList.value = ruleList.value.filter((r) => r.key !== row.key)
}

function removeGroup(key: number) {
  groupList.value = groupList.value.filter((g) => g.key !== key)
}

function submitGroup() {
  if (!groupForm.name) {
    message.warning('请输入组名称')
    return
  }
  if (groupForm.matchType === 'weekday' || groupForm.matchType === 'weekend') {
    if (groupForm.daysArr.length === 0) {
      message.warning('请选择适用星期')
      return
    }
  }
  if (groupForm.matchType === 'holiday' || groupForm.matchType === 'custom') {
    if (!groupForm.dateRange || groupForm.dateRange.length !== 2) {
      message.warning('请选择适用日期区间')
      return
    }
  }
  const payload: PriceGroup = {
    name: groupForm.name,
    matchType: groupForm.matchType,
    priority: groupForm.priority,
    status: groupForm.status,
    rules: ruleList.value.map(({ key, ...rest }) => ({ ...rest })),
  }
  if (showWeekdayPicker.value) {
    payload.daysOfWeek = groupForm.daysArr.sort((a, b) => a - b).join(',')
  }
  if (showDatePicker.value && groupForm.dateRange.length === 2) {
    payload.startDate = groupForm.dateRange[0]
    payload.endDate = groupForm.dateRange[1]
  }

  if (groupIsEdit.value && editingGroupKey.value != null) {
    const idx = groupList.value.findIndex((g) => g.key === editingGroupKey.value)
    if (idx >= 0) {
      groupList.value[idx] = toGroupRow(payload, idx)
    }
  } else {
    groupList.value.push(toGroupRow(payload, groupList.value.length))
  }
  groupDrawerOpen.value = false
}

async function savePrices() {
  if (courtList.value.length === 0) {
    message.warning('请先添加场地')
    return
  }
  saving.value = true
  try {
    // 当前实现只对第一个场地保存
    const courtId = courtList.value[0].id
    // 校验：需有兜底的默认价组，且同类型范围不冲突
    const hasDefault = groupList.value.some((g) => g.matchType === 'default')
    if (!hasDefault) {
      message.warning('请至少配置一个“全部日期（默认价）”价格组作为兜底')
      return
    }
    const payload: PriceGroup[] = groupList.value.map(({ key, ...g }) => ({
      name: g.name,
      matchType: g.matchType,
      daysOfWeek: g.daysOfWeek,
      startDate: g.startDate,
      endDate: g.endDate,
      priority: g.priority,
      status: g.status ?? 1,
      rules: (g.rules || []).map((r) => ({
        startTime: r.startTime,
        endTime: r.endTime,
        priceType: r.priceType,
        price: Math.round((r.price || 0) * 100), // 元转分
        minDuration: r.priceType === 'hourly' ? (r.minDuration ?? 60) : undefined,
      })),
    }))
    await saveCourtPriceGroups(courtId, payload)
    message.success('价格配置已保存')
  } finally {
    saving.value = false
  }
}

// ===== Tab 切换 =====
const activeTab = ref<'info' | 'courts' | 'prices' | 'intro'>('info')

// 切到价格 Tab 时若价格组为空则重新加载
watch(activeTab, (tab) => {
  if (tab === 'prices' && groupList.value.length === 0 && courtList.value.length > 0) {
    loadPriceConfigs()
  }
})

// ===== 小程序场地锁定入口 =====
function goMpLock() {
  message.info('场地锁定功能请在小程序管理端操作')
}

// ===== 初始化 =====
onMounted(() => {
  loadVenueOptions()
})
</script>

<style scoped lang="scss">
.venue-manage {
  padding: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.venue-selector {
  width: 260px;
}

.content-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 0 16px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.page-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16px;
}

.card-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  .card-title {
    margin-bottom: 0;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.upload-text {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.price-form {
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #f1f5f9;
  :deep(.ant-form-item) {
    margin-bottom: 8px;
  }
}

.price-tag {
  display: inline-flex;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 13px;
  background: #e0f2fe;
  color: #0284c7;
  font-weight: 500;
}

.rule-tag {
  margin-bottom: 4px;
}

.hint-text {
  font-size: 12px;
  color: #94a3b8;
}

.danger-link {
  color: #ef4444;
}
</style>
