<template>
  <div class="page-container">
    <div class="page-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <a-input-search
            v-model:value="query.keyword"
            placeholder="搜索俱乐部名称"
            style="width: 240px"
            allow-clear
            @search="reload"
          />
          <a-select
            v-model:value="query.certified"
            placeholder="认证状态"
            style="width: 140px"
            allow-clear
            :options="certifiedOptions"
            @change="reload"
          />
          <a-button @click="resetQuery">重置</a-button>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="dataList"
        :loading="loading"
        row-key="id"
        :pagination="pagination"
        :scroll="{ x: 1080 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'name'">
            <div class="club-cell">
              <a-avatar
                v-if="record.avatar"
                :src="record.avatar"
                :size="36"
                shape="square"
              />
              <a-avatar v-else :size="36" shape="square" style="background: #059669">
                <template #icon><team-outlined /></template>
              </a-avatar>
              <div>
                <div class="club-name">{{ record.name }}</div>
                <div v-if="record.tags" class="sub-text">{{ record.tags }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'certified'">
            <a-tag v-if="record.certified" color="gold">官方</a-tag>
            <a-tag v-else color="default">普通</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'operatorName'">
            <span v-if="record.operatorName">{{ record.operatorName }}</span>
            <span v-else class="sub-text">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'address'">
            <span v-if="record.address">{{ record.address }}</span>
            <span v-else class="sub-text">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a v-if="!record.certified" @click="openCertifyModal(record)">官方认证</a>
            <a-popconfirm
              v-else
              title="确认取消该俱乐部的官方认证?"
              @confirm="handleCancelCertify(record)"
            >
              <a class="text-danger">取消认证</a>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 官方认证 Modal -->
    <a-modal
      v-model:open="certifyVisible"
      title="官方认证"
      :confirm-loading="certifyLoading"
      @ok="confirmCertify"
    >
      <a-alert
        message="认证后该俱乐部将绑定到指定经营者主体，在小程序端展示为「官方」俱乐部"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />
      <a-form layout="vertical">
        <a-form-item label="俱乐部">
          <a-input :value="currentClub?.name" disabled />
        </a-form-item>
        <a-form-item label="绑定经营者" required>
          <a-select
            v-model:value="certifyForm.operatorId"
            placeholder="选择该俱乐部绑定的经营者"
            :options="operatorOptions"
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { TeamOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { useTable } from '@/composables/useTable'
import {
  getAdminClubList,
  certifyClub,
  type ClubAdminQuery,
  type ClubAdminItem,
} from '@/api/club'
import { getOperatorList } from '@/api/operator'

defineOptions({ name: 'ClubManage' })

// ==================== 列表 ====================
const query = reactive<ClubAdminQuery>({ page: 1, size: 10 })
const {
  dataList,
  loading,
  pagination,
  queryParams,
  refresh,
  resetQuery,
  handleTableChange,
} = useTable<ClubAdminQuery, ClubAdminItem>({
  fetchApi: getAdminClubList,
  initialQuery: query,
})

function reload() {
  queryParams.page = 1
  refresh()
}

const certifiedOptions = [
  { value: 1, label: '已认证' },
  { value: 0, label: '未认证' },
]

// ==================== 官方认证 ====================
const certifyVisible = ref(false)
const certifyLoading = ref(false)
const currentClub = ref<ClubAdminItem | null>(null)
const certifyForm = reactive<{ operatorId?: string | number }>({ operatorId: undefined })
const operatorOptions = ref<Array<{ value: string | number, label: string }>>([])

async function loadOperatorOptions() {
  try {
    const res = await getOperatorList({ status: 'approved', page: 1, size: 100 })
    operatorOptions.value = (res.list || []).map((o) => ({
      value: o.id,
      label: `${o.companyName} (${o.contactName})`,
    }))
  } catch {
    operatorOptions.value = []
  }
}

function openCertifyModal(record: ClubAdminItem) {
  currentClub.value = record
  certifyForm.operatorId = record.operatorId
  loadOperatorOptions()
  certifyVisible.value = true
}

async function confirmCertify() {
  if (!certifyForm.operatorId) {
    message.warning('请选择绑定的经营者')
    return
  }
  certifyLoading.value = true
  try {
    await certifyClub({
      clubId: currentClub.value!.id,
      certified: true,
      operatorId: certifyForm.operatorId,
    })
    message.success('认证成功')
    certifyVisible.value = false
    reload()
  } catch {
    // 错误已由拦截器提示
  } finally {
    certifyLoading.value = false
  }
}

function handleCancelCertify(record: ClubAdminItem) {
  Modal.confirm({
    title: '确认取消认证?',
    icon: h(ExclamationCircleOutlined),
    content: `将取消「${record.name}」的官方认证，其与经营者的绑定关系将被移除.`,
    okText: '确认取消',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: async () => {
      try {
        await certifyClub({ clubId: record.id, certified: false })
        message.success('已取消认证')
        reload()
      } catch {
        // 错误已由拦截器提示
      }
    },
  })
}

// ==================== 表格列 ====================
const columns: TableColumnsType = [
  { title: '俱乐部', dataIndex: 'name', width: 240 },
  { title: '创建者', dataIndex: 'ownerName', width: 140 },
  { title: '成员数', dataIndex: 'memberCount', width: 90 },
  { title: '认证状态', dataIndex: 'certified', width: 100 },
  { title: '绑定经营者', dataIndex: 'operatorName', width: 180 },
  { title: '常去地点', dataIndex: 'address', width: 200 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
  { title: '操作', dataIndex: 'action', width: 120, fixed: 'right' },
]

// ==================== 初始化 ====================
onMounted(() => {
  reload()
})
</script>

<style scoped lang="scss">
.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.table-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.club-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.club-name {
  font-weight: 500;
}

.sub-text {
  color: #94a3b8;
  font-size: 12px;
}

.text-danger {
  color: #ef4444;
}
</style>
