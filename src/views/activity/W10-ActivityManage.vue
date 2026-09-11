<template>
  <div class="page-container">
    <div class="page-card">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="activity" tab="活动列表">
      <!-- 筛选工具栏 -->
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <a-input
            v-model:value="filter.title"
            placeholder="活动标题"
            style="width: 180px"
            allow-clear
            @press-enter="handleSearch"
          />
          <a-select
            v-model:value="filter.activityType"
            placeholder="类型"
            style="width: 120px"
            allow-clear
            :options="activityTypeOptions"
            @change="handleSearch"
          />
          <a-select
            v-model:value="filter.status"
            placeholder="状态"
            style="width: 120px"
            allow-clear
            :options="statusOptions"
            @change="handleSearch"
          />
          <a-select
            v-model:value="filter.isVisible"
            placeholder="上下架"
            style="width: 120px"
            allow-clear
            :options="visibleOptions"
            @change="handleSearch"
          />
          <a-button type="primary" @click="handleSearch">
            <template #icon><SearchOutlined /></template>
            查询
          </a-button>
          <a-button @click="handleReset">重置</a-button>
        </div>
        <div class="table-toolbar-right">
          <a-button type="primary" @click="openCreate">
            <template #icon><PlusOutlined /></template>
            新增活动
          </a-button>
          <a-button style="margin-left: 8px" @click="table.refresh()">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </div>
      </div>

      <!-- 活动列表 -->
      <a-table
        :columns="columns"
        :data-source="table.dataList.value"
        :loading="table.loading.value"
        row-key="id"
        :pagination="table.pagination"
        :scroll="{ x: 1600 }"
        @change="table.handleTableChange"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'title'">
            <div class="title-cell">{{ record.title }}</div>
            <a-tag v-if="repeatLabel(record.repeatRule)" color="purple" style="margin-top: 4px">{{ repeatLabel(record.repeatRule) }}</a-tag>
            <div class="sub-text" v-if="record.id">{{ record.id }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'activityType'">
            <a-tag :color="record.activityType === 'club' ? 'blue' : 'orange'">
              {{ record.activityType === 'club' ? '俱乐部活动' : '临时活动' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'time'">
            <div>{{ record.startDate || '-' }} {{ record.startTime || '' }}</div>
            <div class="sub-text" v-if="record.endTime">至 {{ record.endTime }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'players'">
            <span>{{ record.currentPlayers }} / {{ record.maxPlayers }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'amount'">
            <span v-if="record.feeType === 'free'" class="free-text">免费</span>
            <span v-else>¥ {{ fmtYuan(record.price) }}</span>
            <div class="sub-text">{{ feeTypeLabel(record.feeType) }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'operator'">
            <div>{{ record.operatorName || '-' }}</div>
            <div class="sub-text">{{ record.operatorPhone || '' }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === '报名中' ? 'green' : 'red'">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'isVisible'">
            <a-tag :color="record.isVisible ? 'green' : 'default'">
              {{ record.isVisible ? '上架' : '下架' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'createdAt'">
            <span class="sub-text">{{ record.createdAt || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="0">
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-popconfirm
                :title="record.isVisible ? '确认下架该活动？下架后小程序列表不再展示。' : '确认上架该活动？'"
                @confirm="handleToggleVisible(record)"
              >
                <a-button type="link" size="small">{{ record.isVisible ? '下架' : '上架' }}</a-button>
              </a-popconfirm>
              <a-popconfirm title="确认删除该活动？删除后不可恢复。" @confirm="handleDelete(record)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
        </a-tab-pane>

        <a-tab-pane key="series" tab="周期系列" force-render>
          <!-- 系列筛选工具栏 -->
          <div class="table-toolbar">
            <div class="table-toolbar-left">
              <a-input
                v-model:value="seriesFilter.title"
                placeholder="系列标题"
                style="width: 180px"
                allow-clear
                @press-enter="handleSeriesSearch"
              />
              <a-button type="primary" @click="handleSeriesSearch">
                <template #icon><SearchOutlined /></template>
                查询
              </a-button>
              <a-button @click="handleSeriesReset">重置</a-button>
            </div>
            <div class="table-toolbar-right">
              <a-button style="margin-left: 8px" @click="seriesTable.refresh()">
                <template #icon><ReloadOutlined /></template>
                刷新
              </a-button>
            </div>
          </div>

          <!-- 周期系列列表(一个系列一行, 长期延续) -->
          <a-table
            :columns="seriesColumns"
            :data-source="seriesTable.dataList.value"
            :loading="seriesTable.loading.value"
            row-key="id"
            :pagination="seriesTable.pagination"
            :scroll="{ x: 1200 }"
            @change="seriesTable.handleTableChange"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'title'">
                <div class="title-cell">{{ record.title }}</div>
                <div class="sub-text" v-if="record.id">系列ID {{ record.id }}</div>
              </template>
              <template v-else-if="column.dataIndex === 'weekday'">
                <a-tag color="blue">每周{{ record.weekdayLabel || '-' }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'sessions'">
                <span>已生成 {{ record.totalSessions ?? 0 }} 期</span>
                <div class="sub-text" v-if="record.latestSessionNo">当前进行到第 {{ record.latestSessionNo }} 次</div>
              </template>
              <template v-else-if="column.dataIndex === 'time'">
                <div>{{ record.startTime || '-' }} - {{ record.endTime || '' }}</div>
                <div class="sub-text" v-if="record.nextDate">下一期 {{ record.nextDate }}</div>
              </template>
              <template v-else-if="column.dataIndex === 'players'">
                <span>{{ record.maxPlayers ?? 0 }} 人</span>
              </template>
              <template v-else-if="column.dataIndex === 'amount'">
                <span v-if="record.feeType === 'free'" class="free-text">免费</span>
                <span v-else>¥ {{ fmtYuan(record.price ?? record.feeAmount) }}</span>
              </template>
              <template v-else-if="column.dataIndex === 'operator'">
                <div>{{ record.operatorName || '-' }}</div>
                <div class="sub-text">{{ record.operatorPhone || '' }}</div>
              </template>
              <template v-else-if="column.dataIndex === 'isVisible'">
                <a-tag :color="record.isVisible ? 'green' : 'default'">
                  {{ record.isVisible ? '上架' : '下架' }}
                </a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'action'">
                <a-space :size="0">
                  <a-button type="link" size="small" @click="openSeriesSessions(record)">期次</a-button>
                  <a-button type="link" size="small" @click="openSeriesEdit(record)">修改规则</a-button>
                  <a-popconfirm title="确认删除该周期系列？已有报名的期次将下架保留，其余期次删除。" @confirm="handleSeriesDelete(record)">
                    <a-button type="link" size="small" danger>删除</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- 新增/编辑活动 Modal -->
    <a-modal
      v-model:open="formOpen"
      :title="editing ? '编辑活动' : '新增活动'"
      width="680"
      :confirm-loading="saving"
      :destroy-on-close="true"
      ok-text="保存"
      @ok="handleSave"
    >
      <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-alert
          v-if="editing && editing.seriesId"
          type="info"
          show-icon
          message="该活动为每周重复发布的期次，修改仅影响本期"
          style="margin-bottom: 16px"
        />
        <a-form-item v-if="isSuperAdmin" label="经营者" name="operatorId">
          <a-select
            v-model:value="form.operatorId"
            placeholder="请选择经营者"
            :options="operatorOptions"
            show-search
            option-filter-prop="label"
          />
        </a-form-item>
        <a-form-item label="活动标题" name="title">
          <a-input v-model:value="form.title" placeholder="请输入活动标题" maxlength="64" />
        </a-form-item>
        <a-form-item label="活动类型" name="activityType">
          <a-radio-group v-model:value="form.activityType">
            <a-radio value="club">俱乐部活动</a-radio>
            <a-radio value="temp">临时活动</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="地点名称">
          <a-input v-model:value="form.venueName" placeholder="如：阳光羽毛球馆" maxlength="64" />
        </a-form-item>
        <a-form-item label="场地号">
          <a-input v-model:value="form.court" placeholder="如：1,2 号场（可留空）" maxlength="32" />
        </a-form-item>
        <a-form-item label="活动时间">
          <a-space :size="4" wrap>
            <a-date-picker v-model:value="form.startDate" value-format="YYYY-MM-DD" placeholder="开始日期" />
            <a-time-picker v-model:value="form.startTime" format="HH:mm" value-format="HH:mm" placeholder="开始时间" />
            <span class="sub-text">至</span>
            <a-date-picker v-model:value="form.endDate" value-format="YYYY-MM-DD" placeholder="结束日期" />
            <a-time-picker v-model:value="form.endTime" format="HH:mm" value-format="HH:mm" placeholder="结束时间" />
          </a-space>
        </a-form-item>
        <a-form-item label="每周重复">
          <a-space :size="4" wrap>
            <a-switch v-model:checked="form.repeatEnabled" checked-children="开" un-checked-children="关" :disabled="!!editing" />
            <span v-if="!editing" class="sub-text">按星期定期开展，长期延续自动展开期次（放假日自动跳过），后续可在「周期系列」页修改规则</span>
          </a-space>
          <div v-if="form.repeatEnabled" style="margin-top: 8px">
            <a-select
              v-model:value="form.weekdays"
              mode="multiple"
              placeholder="选择每周重复的星期（可多选）"
              style="width: 100%"
              :options="weekdayOptions"
            />
          </div>
        </a-form-item>
        <a-form-item label="报名截止">
          <a-space :size="4" wrap>
            <a-date-picker v-model:value="form.deadlineDate" value-format="YYYY-MM-DD" placeholder="截止日期" />
            <a-time-picker v-model:value="form.deadlineTime" format="HH:mm" value-format="HH:mm" placeholder="截止时间" />
          </a-space>
        </a-form-item>
        <a-form-item label="人数上限">
          <a-input-number v-model:value="form.maxParticipants" :min="0" :max="999" style="width: 160px" />
        </a-form-item>
        <a-form-item label="费用">
          <a-space :size="4" wrap>
            <a-select v-model:value="form.feeType" style="width: 110px" :options="feeTypeOptions" />
            <a-input-number
              v-if="form.feeType !== 'free'"
              v-model:value="form.feeAmount"
              :min="0"
              :precision="2"
              :step="1"
              style="width: 140px"
              placeholder="金额(元)"
            />
          </a-space>
        </a-form-item>
        <a-form-item label="优惠开关">
          <a-space :size="16">
            <a-switch v-model:checked="form.ladyDiscount" checked-children="女士" un-checked-children="关" />
            <a-switch v-model:checked="form.earlyBird" checked-children="早鸟" un-checked-children="关" />
          </a-space>
        </a-form-item>
        <a-form-item label="标签">
          <a-select
            v-model:value="form.tags"
            mode="tags"
            placeholder="输入后回车添加，如：双打"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="活动描述">
          <a-textarea v-model:value="form.description" :rows="3" placeholder="活动介绍" maxlength="2000" />
        </a-form-item>
        <a-form-item label="联系人">
          <a-space :size="4" wrap>
            <a-input v-model:value="form.contactName" placeholder="姓名" style="width: 120px" />
            <a-input v-model:value="form.contactPhone" placeholder="手机号" style="width: 140px" />
            <a-input v-model:value="form.contactWechat" placeholder="微信号" style="width: 140px" />
          </a-space>
        </a-form-item>
        <a-form-item label="上架状态">
          <a-switch v-model:checked="form.isVisible" checked-children="上架" un-checked-children="下架" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 活动详情 Modal（只读） -->
    <a-modal v-model:open="detailOpen" title="活动详情" width="720" :footer="null" :destroy-on-close="true">
      <a-descriptions v-if="detail" :column="2" bordered size="small" :label-style="{ width: '110px' }">
        <a-descriptions-item label="活动标题" :span="2">{{ detail.title }}</a-descriptions-item>
        <a-descriptions-item label="活动ID">{{ detail.id }}</a-descriptions-item>
        <a-descriptions-item label="活动类型">
          {{ detail.activityType === 'club' ? '俱乐部活动' : '临时活动' }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">{{ detail.status || '-' }}</a-descriptions-item>
        <a-descriptions-item label="上下架">
          <a-tag :color="detail.isVisible ? 'green' : 'default'">{{ detail.isVisible ? '上架' : '下架' }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="所属球馆">{{ detail.venueName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="场地号">{{ detail.court || '-' }}</a-descriptions-item>
        <a-descriptions-item label="详细地址" :span="2">{{ detail.venueAddress || '-' }}</a-descriptions-item>
        <a-descriptions-item label="活动时间">
          {{ fmtDateTime(detail.startDate, detail.startTime) }} ~ {{ fmtDateTime(detail.endDate, detail.endTime) }}
        </a-descriptions-item>
        <a-descriptions-item v-if="repeatLabel(detail.repeatRule)" label="重复发布">{{ repeatLabel(detail.repeatRule) }}</a-descriptions-item>
        <a-descriptions-item label="报名截止">{{ fmtDateTime(detail.deadlineDate, detail.deadlineTime) }}</a-descriptions-item>
        <a-descriptions-item label="已报/上限">{{ detail.currentPlayers }} / {{ detail.maxPlayers }}</a-descriptions-item>
        <a-descriptions-item label="费用">{{ feeLabel(detail) }}</a-descriptions-item>
        <a-descriptions-item label="优惠">{{ discountLabel(detail) }}</a-descriptions-item>
        <a-descriptions-item label="标签">{{ (detail.tags || []).join('、') || '-' }}</a-descriptions-item>
        <a-descriptions-item label="创建人">{{ detail.operatorName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="创建人电话">{{ detail.operatorPhone || '-' }}</a-descriptions-item>
        <a-descriptions-item label="联系人">{{ detail.contactName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="联系人电话">{{ detail.contactPhone || '-' }}</a-descriptions-item>
        <a-descriptions-item label="联系人微信">{{ detail.contactWechat || '-' }}</a-descriptions-item>
        <a-descriptions-item label="创建时间">{{ detail.createdAt || '-' }}</a-descriptions-item>
        <a-descriptions-item label="活动描述" :span="2">
          <span style="white-space: pre-wrap">{{ detail.description || '-' }}</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <!-- 周期系列-期次列表弹窗 -->
    <a-modal
      v-model:open="sessionsOpen"
      :title="sessionsSeries ? `「${sessionsSeries.title}」期次列表` : '期次列表'"
      width="1000"
      :footer="null"
      :destroy-on-close="true"
    >
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <a-range-picker
            v-model:value="sessionsRange"
            value-format="YYYY-MM-DD"
            :allow-clear="false"
            @change="loadSeriesSessions"
          />
          <span class="sub-text">按日期范围查看，范围内的期次自动生成</span>
        </div>
        <div class="table-toolbar-right">
          <a-button type="primary" @click="loadSeriesSessions">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </div>
      </div>
      <a-table
        :columns="sessionsColumns"
        :data-source="sessionsData"
        :loading="sessionsLoading"
        row-key="id"
        size="middle"
        :pagination="false"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'sessionNo'">
            <span>第 {{ record.sessionNo ?? '-' }} 次</span>
            <a-tag v-if="record.isLocked" color="orange" style="margin-left: 4px">已锁定</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'time'">
            <div>{{ record.startDate || '-' }} {{ record.startTime || '' }}</div>
            <div class="sub-text" v-if="record.endTime">至 {{ record.endTime }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'title'">
            <div class="title-cell">{{ record.title }}</div>
          </template>
          <template v-else-if="column.dataIndex === 'players'">
            <span>{{ record.currentPlayers }} / {{ record.maxPlayers }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'amount'">
            <span v-if="record.feeType === 'free'" class="free-text">免费</span>
            <span v-else>¥ {{ fmtYuan(record.price) }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === '报名中' ? 'green' : 'red'">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-space :size="0">
              <a-button type="link" size="small" @click="openEdit(record)">编辑本期</a-button>
              <a-popconfirm
                :title="record.isVisible ? '确认下架该期？' : '确认上架该期？'"
                @confirm="handleToggleVisible(record)"
              >
                <a-button type="link" size="small">{{ record.isVisible ? '下架' : '上架' }}</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
      <div class="sub-text" style="margin-top: 8px">
        期次按需生成：仅当前日期范围内、匹配周几且非法定放假日、尚未生成的日期才会展开；期序号从 1 一直累计（第 51、52 次…）。
        编辑本期会标记「已锁定」，后续周期规则修改不再覆盖该期。
      </div>
    </a-modal>

    <!-- 周期系列-修改规则弹窗 -->
    <a-modal
      v-model:open="seriesEditOpen"
      :title="seriesEditing ? `修改「${seriesEditing.title}」周期规则` : '修改周期规则'"
      width="680"
      :confirm-loading="seriesSaving"
      :destroy-on-close="true"
      ok-text="保存"
      @ok="handleSeriesSave"
    >
      <a-form ref="seriesFormRef" :model="seriesForm" :rules="seriesRules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-alert
          type="info"
          show-icon
          message="生效日期之前的期次（含已修改/已过期）保持不变；生效日期之后按新规则生成/调整。单次手动改过或已有报名的期次不受影响。"
          style="margin-bottom: 16px"
        />
        <a-form-item label="活动标题" name="title">
          <a-input v-model:value="seriesForm.title" placeholder="请输入活动标题" maxlength="64" />
        </a-form-item>
        <a-form-item label="活动类型" name="activityType">
          <a-radio-group v-model:value="seriesForm.activityType">
            <a-radio value="club">俱乐部活动</a-radio>
            <a-radio value="temp">临时活动</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="地点名称">
          <a-input v-model:value="seriesForm.venueName" placeholder="如：阳光羽毛球馆" maxlength="64" />
        </a-form-item>
        <a-form-item label="场地号">
          <a-input v-model:value="seriesForm.court" placeholder="如：1,2 号场（可留空）" maxlength="32" />
        </a-form-item>
        <a-form-item label="活动时间">
          <a-space :size="4" wrap>
            <a-time-picker v-model:value="seriesForm.startTime" format="HH:mm" value-format="HH:mm" placeholder="开始时间" />
            <span class="sub-text">至</span>
            <a-time-picker v-model:value="seriesForm.endTime" format="HH:mm" value-format="HH:mm" placeholder="结束时间" />
          </a-space>
        </a-form-item>
        <a-form-item label="每周重复" name="weekdays">
          <a-select
            v-model:value="seriesForm.weekdays"
            mode="multiple"
            placeholder="选择每周重复的星期（可多选）"
            style="width: 100%"
            :options="weekdayOptions"
          />
        </a-form-item>
        <a-form-item label="规则生效日期">
          <a-space :size="4" wrap>
            <a-date-picker v-model:value="seriesForm.effectiveDate" value-format="YYYY-MM-DD" placeholder="不选则今天生效" />
          </a-space>
        </a-form-item>
        <a-form-item label="人数上限">
          <a-input-number v-model:value="seriesForm.maxParticipants" :min="0" :max="999" style="width: 160px" />
        </a-form-item>
        <a-form-item label="费用">
          <a-space :size="4" wrap>
            <a-select v-model:value="seriesForm.feeType" style="width: 110px" :options="feeTypeOptions" />
            <a-input-number
              v-if="seriesForm.feeType !== 'free'"
              v-model:value="seriesForm.feeAmount"
              :min="0"
              :precision="2"
              :step="1"
              style="width: 140px"
              placeholder="金额(元)"
            />
          </a-space>
        </a-form-item>
        <a-form-item label="优惠开关">
          <a-space :size="16">
            <a-switch v-model:checked="seriesForm.ladyDiscount" checked-children="女士" un-checked-children="关" />
            <a-switch v-model:checked="seriesForm.earlyBird" checked-children="早鸟" un-checked-children="关" />
          </a-space>
        </a-form-item>
        <a-form-item label="标签">
          <a-select
            v-model:value="seriesForm.tags"
            mode="tags"
            placeholder="输入后回车添加，如：双打"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="活动描述">
          <a-textarea v-model:value="seriesForm.description" :rows="3" placeholder="活动介绍" maxlength="2000" />
        </a-form-item>
        <a-form-item label="联系人">
          <a-space :size="4" wrap>
            <a-input v-model:value="seriesForm.contactName" placeholder="姓名" style="width: 120px" />
            <a-input v-model:value="seriesForm.contactPhone" placeholder="手机号" style="width: 140px" />
            <a-input v-model:value="seriesForm.contactWechat" placeholder="微信号" style="width: 140px" />
          </a-space>
        </a-form-item>
        <a-form-item label="上架状态">
          <a-switch v-model:checked="seriesForm.isVisible" checked-children="上架" un-checked-children="下架" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useTable } from '@/composables/useTable'
import { useAuthStore } from '@/stores/auth'
import type { PageQuery } from '@/types/api'
import { getOperatorList } from '@/api/operator'
import { getAllVenues } from '@/api/venue'
import {
  getActivityAdminList,
  createActivityAdmin,
  updateActivityAdmin,
  setActivityVisibility,
  deleteActivityAdmin,
  getActivitySeriesList,
  getActivitySeriesSessions,
  updateActivitySeries,
  deleteActivitySeries,
  type ActivityAdminItem,
  type ActivityAdminQuery,
  type ActivityAdminSave,
  type ActivitySeriesItem,
  type ActivitySeriesSave,
} from '@/api/activity'

// ===== 下拉配置 =====
const activityTypeOptions = [
  { label: '俱乐部活动', value: 'club' },
  { label: '临时活动', value: 'temp' },
]
const statusOptions = [
  { label: '报名中', value: '报名中' },
  { label: '已满', value: '已满' },
]
const visibleOptions = [
  { label: '上架', value: true },
  { label: '下架', value: false },
]
const feeTypeOptions = [
  { label: '免费', value: 'free' },
  { label: '固定费用', value: 'fixed' },
  { label: 'AA制', value: 'aa' },
]
const weekdayOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

function feeTypeLabel(type: string) {
  if (type === 'free') return '免费'
  if (type === 'aa') return 'AA制'
  return '固定费用'
}

/** 后端金额为分，转为元 */
function fmtYuan(price: number) {
  return ((Number(price) || 0) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/** 解析重复规则JSON，非法返回 null */
function parseRepeatRule(rule?: string): { weekdays?: number[]; totalCount?: number } | null {
  if (!rule) return null
  try {
    const obj = JSON.parse(rule)
    if (obj?.repeatType !== 'weekly') return null
    return { weekdays: Array.isArray(obj.weekdays) ? obj.weekdays : [], totalCount: Number(obj.totalCount) || 0 }
  }
  catch {
    return null
  }
}

/** 重复规则展示文案：每周周二、周四 · 20期 */
function repeatLabel(rule?: string): string {
  const r = parseRepeatRule(rule)
  if (!r || !r.weekdays?.length) return ''
  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const wd = r.weekdays.map((n: number) => names[n - 1]).filter(Boolean).join('、')
  return `每周${wd}${r.totalCount ? ` · ${r.totalCount}期` : ''}`
}

// ===== 活动详情弹窗 =====
const detailOpen = ref(false)
const detail = ref<ActivityAdminItem | null>(null)

function openDetail(record: ActivityAdminItem) {
  detail.value = record
  detailOpen.value = true
}

/** 日期 + 时间 → 可读字符串 */
function fmtDateTime(date?: string, time?: string) {
  if (!date) return '-'
  return time ? `${date} ${time}` : date
}

/** 费用展示 */
function feeLabel(d: ActivityAdminItem) {
  if (d.feeType === 'free') return '免费'
  if (d.feeType === 'aa') return 'AA制'
  return `¥ ${fmtYuan(d.price ?? d.feeAmount)}`
}

/** 优惠展示 */
function discountLabel(d: ActivityAdminItem) {
  const parts: string[] = []
  if (d.ladyDiscount) parts.push('女士优惠')
  if (d.earlyBird) parts.push('早鸟优惠')
  return parts.join('、') || '无'
}

// ===== 经营者下拉(super_admin 新增时指定) =====
const authStore = useAuthStore()
const isSuperAdmin = authStore.roles.includes('super_admin')
const operatorOptions = ref<{ label: string; value: string }[]>([])

async function loadOperators() {
  try {
    const res = await getOperatorList({ page: 1, size: 100 })
    operatorOptions.value = (res.list || []).map((o: { id: unknown; name?: string; companyName?: string }) => ({
      label: o.name || o.companyName || String(o.id),
      value: String(o.id),
    }))
  } catch {
    operatorOptions.value = []
  }
}

// ===== 球馆下拉 =====
const venueOptions = ref<{ label: string; value: string }[]>([])

async function loadVenues() {
  try {
    const list = await getAllVenues()
    venueOptions.value = (list || []).map((v: { id: unknown; name?: string }) => ({
      label: v.name || String(v.id),
      value: String(v.id),
    }))
  } catch {
    venueOptions.value = []
  }
}

// ===== 筛选条件 =====
const filter = reactive<{
  title?: string
  activityType?: string
  status?: string
  isVisible?: boolean
}>({
  title: undefined,
  activityType: undefined,
  status: undefined,
  isVisible: undefined,
})

// ===== Tab 切换(活动列表 / 周期系列) =====
const activeTab = ref('activity')

// ===== 列表 =====
const table = useTable<ActivityAdminQuery, ActivityAdminItem>({
  fetchApi: getActivityAdminList,
  initialQuery: { page: 1, size: 10 },
})

function handleSearch() {
  Object.assign(table.queryParams, {
    title: filter.title,
    activityType: filter.activityType,
    status: filter.status,
    isVisible: filter.isVisible,
  })
  table.refresh()
}

function handleReset() {
  Object.assign(filter, { title: undefined, activityType: undefined, status: undefined, isVisible: undefined })
  table.resetQuery()
}

// ===== 表格列 =====
const columns = [
  { title: '活动', dataIndex: 'title', width: 240 },
  { title: '类型', dataIndex: 'activityType', width: 100 },
  { title: '场馆', dataIndex: 'venueName', ellipsis: true },
  { title: '活动时间', dataIndex: 'time', width: 180 },
  { title: '报名', dataIndex: 'players', width: 90 },
  { title: '费用', dataIndex: 'amount', width: 110 },
  { title: '创建人', dataIndex: 'operator', width: 150 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '上下架', dataIndex: 'isVisible', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', dataIndex: 'action', width: 230, fixed: 'right' },
]

// ===== 周期系列 =====
const seriesColumns = [
  { title: '系列', dataIndex: 'title', width: 240 },
  { title: '重复规则', dataIndex: 'weekday', width: 150 },
  { title: '期次', dataIndex: 'sessions', width: 190 },
  { title: '时间', dataIndex: 'time', width: 190 },
  { title: '人数上限', dataIndex: 'players', width: 90 },
  { title: '费用', dataIndex: 'amount', width: 100 },
  { title: '创建人', dataIndex: 'operator', width: 140 },
  { title: '上下架', dataIndex: 'isVisible', width: 90 },
  { title: '操作', dataIndex: 'action', width: 220, fixed: 'right' },
]

const seriesTable = useTable<PageQuery & { title?: string }, ActivitySeriesItem>({
  fetchApi: getActivitySeriesList,
  initialQuery: { page: 1, size: 10 },
})

const seriesFilter = reactive<{ title?: string }>({ title: undefined })

function handleSeriesSearch() {
  Object.assign(seriesTable.queryParams, { title: seriesFilter.title })
  seriesTable.refresh()
}

function handleSeriesReset() {
  Object.assign(seriesFilter, { title: undefined })
  seriesTable.resetQuery()
}

async function handleSeriesDelete(record: ActivitySeriesItem) {
  try {
    await deleteActivitySeries(record.id)
    message.success('删除成功')
    seriesTable.loadData()
    table.loadData()
  }
  catch (e) {
    console.error('删除周期系列失败', e)
    message.error('删除失败')
  }
}

// ===== 系列期次弹窗 =====
function fmtDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number) {
  const t = new Date(d)
  t.setDate(t.getDate() + n)
  return t
}

const sessionsOpen = ref(false)
const sessionsLoading = ref(false)
const sessionsSeries = ref<ActivitySeriesItem | null>(null)
const sessionsData = ref<ActivityAdminItem[]>([])
const sessionsRange = ref<[string, string]>([fmtDate(new Date()), fmtDate(addDays(new Date(), 30))])

async function openSeriesSessions(record: ActivitySeriesItem) {
  sessionsSeries.value = record
  sessionsOpen.value = true
  await loadSeriesSessions()
}

async function loadSeriesSessions() {
  if (!sessionsSeries.value) return
  sessionsLoading.value = true
  try {
    const [from, to] = sessionsRange.value || []
    const list = await getActivitySeriesSessions(sessionsSeries.value.id, { from, to })
    sessionsData.value = list || []
  }
  catch (e) {
    console.error('加载系列期次失败', e)
    sessionsData.value = []
  }
  finally {
    sessionsLoading.value = false
  }
}

const sessionsColumns = [
  { title: '期次', dataIndex: 'sessionNo', width: 110 },
  { title: '日期/时间', dataIndex: 'time', width: 180 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '报名', dataIndex: 'players', width: 90 },
  { title: '费用', dataIndex: 'amount', width: 100 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '操作', dataIndex: 'action', width: 180, fixed: 'right' },
]

// ===== 修改周期规则弹窗 =====
const seriesEditOpen = ref(false)
const seriesSaving = ref(false)
const seriesEditing = ref<ActivitySeriesItem | null>(null)
const seriesFormRef = ref<FormInstance>()
const seriesForm = reactive<{
  title: string
  activityType: 'club' | 'temp'
  court?: string
  venueName?: string
  venueAddress?: string
  startTime?: string
  endTime?: string
  maxParticipants?: number
  feeType: 'free' | 'fixed' | 'aa'
  feeAmount?: number
  ladyDiscount: boolean
  earlyBird: boolean
  tags: string[]
  description?: string
  contactName?: string
  contactPhone?: string
  contactWechat?: string
  weekdays: number[]
  effectiveDate?: string
  isVisible: boolean
}>({
  title: '',
  activityType: 'club',
  court: '',
  venueName: '',
  venueAddress: '',
  startTime: undefined,
  endTime: undefined,
  maxParticipants: undefined,
  feeType: 'free',
  feeAmount: undefined,
  ladyDiscount: false,
  earlyBird: false,
  tags: [],
  description: '',
  contactName: '',
  contactPhone: '',
  contactWechat: '',
  weekdays: [],
  effectiveDate: undefined,
  isVisible: true,
})

const seriesRules = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  weekdays: [{ required: true, type: 'array', min: 1, message: '请至少选择一个重复星期', trigger: 'change' }],
}

function openSeriesEdit(record: ActivitySeriesItem) {
  seriesEditing.value = record
  Object.assign(seriesForm, {
    title: record.title,
    activityType: record.activityType || 'club',
    court: record.court || '',
    venueName: record.venueName || '',
    venueAddress: record.venueAddress || '',
    startTime: record.startTime || undefined,
    endTime: record.endTime || undefined,
    maxParticipants: record.maxPlayers ?? 0,
    feeType: record.feeType || 'free',
    feeAmount: record.feeType === 'free' ? undefined : (Number(record.feeAmount ?? record.price) || 0) / 100,
    ladyDiscount: !!record.ladyDiscount,
    earlyBird: !!record.earlyBird,
    tags: record.tags ? [...record.tags] : [],
    description: record.description || '',
    contactName: record.contactName || '',
    contactPhone: record.contactPhone || '',
    contactWechat: record.contactWechat || '',
    weekdays: record.weekdays ? [...record.weekdays] : [],
    effectiveDate: undefined, // 默认今天生效
    isVisible: record.isVisible ?? true,
  })
  seriesEditOpen.value = true
}

async function handleSeriesSave() {
  try {
    await seriesFormRef.value?.validate()
  }
  catch {
    return
  }
  if (!seriesForm.weekdays?.length) {
    message.warning('请至少选择一个重复星期')
    return
  }
  if (seriesSaving.value) return
  seriesSaving.value = true
  try {
    if (!seriesEditing.value) return
    const payload: ActivitySeriesSave = {
      title: (seriesForm.title || '').trim(),
      activityType: seriesForm.activityType || 'club',
      court: seriesForm.court,
      venueName: seriesForm.venueName,
      venueAddress: seriesForm.venueAddress,
      startTime: seriesForm.startTime,
      endTime: seriesForm.endTime,
      maxParticipants: seriesForm.maxParticipants,
      feeType: seriesForm.feeType || 'free',
      feeAmount: seriesForm.feeType === 'free' ? 0 : Number(seriesForm.feeAmount) || 0,
      ladyDiscount: !!seriesForm.ladyDiscount,
      earlyBird: !!seriesForm.earlyBird,
      tags: seriesForm.tags || [],
      description: seriesForm.description,
      contactName: seriesForm.contactName,
      contactPhone: seriesForm.contactPhone,
      contactWechat: seriesForm.contactWechat,
      weekdays: seriesForm.weekdays || [],
      effectiveDate: seriesForm.effectiveDate || undefined,
      isVisible: !!seriesForm.isVisible,
    }
    await updateActivitySeries(seriesEditing.value.id, payload)
    message.success('规则已更新')
    seriesEditOpen.value = false
    seriesTable.loadData()
    table.loadData()
  }
  catch (e) {
    console.error('修改周期规则失败', e)
    message.error('保存失败，请重试')
  }
  finally {
    seriesSaving.value = false
  }
}

// ===== 新增/编辑表单 =====
const formOpen = ref(false)
const editing = ref<ActivityAdminItem | null>(null)
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<ActivityAdminSave & { operatorId?: string }>({
  operatorId: undefined,
  venueId: undefined,
  title: '',
  activityType: 'club',
  court: '',
  venueName: '',
  startDate: undefined,
  startTime: undefined,
  endDate: undefined,
  endTime: undefined,
  deadlineDate: undefined,
  deadlineTime: undefined,
  maxParticipants: undefined,
  feeType: 'free',
  feeAmount: undefined,
  ladyDiscount: false,
  earlyBird: false,
  tags: [],
  description: '',
  contactName: '',
  contactPhone: '',
  contactWechat: '',
  isVisible: true,
  status: '报名中',
  repeatEnabled: false,
  weekdays: [] as number[],
})

const rules = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  operatorId: [{ required: true, message: '请选择经营者', trigger: 'change' }],
  venueId: [{ required: true, message: '请选择所属球馆', trigger: 'change' }],
}

function openCreate() {
  editing.value = null
  Object.assign(form, {
    operatorId: undefined,
    venueId: undefined,
    title: '',
    activityType: 'club',
    court: '',
    venueName: '',
    startDate: undefined,
    startTime: undefined,
    endDate: undefined,
    endTime: undefined,
    deadlineDate: undefined,
    deadlineTime: undefined,
    maxParticipants: undefined,
    feeType: 'free',
    feeAmount: undefined,
    ladyDiscount: false,
    earlyBird: false,
    tags: [],
    description: '',
    contactName: '',
    contactPhone: '',
    contactWechat: '',
    isVisible: true,
    status: '报名中',
    repeatEnabled: false,
    weekdays: [],
  })
  formOpen.value = true
}

function openEdit(record: ActivityAdminItem) {
  editing.value = record
  Object.assign(form, {
    operatorId: isSuperAdmin ? String(record.operatorId) : undefined,
    venueId: record.venueId ? String(record.venueId) : undefined,
    title: record.title,
    activityType: record.activityType || 'club',
    court: record.court || '',
    venueName: record.venueName || '',
    startDate: record.startDate || undefined,
    startTime: record.startTime || undefined,
    endDate: undefined,
    endTime: record.endTime || undefined,
    deadlineDate: undefined,
    deadlineTime: undefined,
    maxParticipants: record.maxPlayers,
    feeType: record.feeType || 'free',
    feeAmount: record.feeType === 'free' ? undefined : (Number(record.feeAmount) || 0) / 100,
    ladyDiscount: false,
    earlyBird: false,
    tags: [],
    description: '',
    contactName: '',
    contactPhone: '',
    contactWechat: '',
    isVisible: !!record.isVisible,
    status: record.status || '报名中',
    repeatEnabled: false,
    weekdays: [],
  })
  formOpen.value = true
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  // 每周重复(仅新增): 校验星期(期数按需自动生成, 长期延续无固定期数)
  if (!editing.value && form.repeatEnabled) {
    if (!form.weekdays?.length) {
      message.warning('请至少选择一个重复星期')
      return
    }
  }
  if (saving.value) return
  saving.value = true
  try {
    const payload: ActivityAdminSave = {
      operatorId: isSuperAdmin ? form.operatorId : undefined,
      title: (form.title || '').trim(),
      activityType: form.activityType || 'club',
      court: form.court,
      venueName: form.venueName,
      startDate: form.startDate,
      startTime: form.startTime,
      endDate: form.endDate,
      endTime: form.endTime,
      deadlineDate: form.deadlineDate,
      deadlineTime: form.deadlineTime,
      maxParticipants: form.maxParticipants,
      feeType: form.feeType || 'free',
      feeAmount: form.feeType === 'free' ? 0 : Number(form.feeAmount) || 0,
      ladyDiscount: !!form.ladyDiscount,
      earlyBird: !!form.earlyBird,
      tags: form.tags || [],
      description: form.description,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      contactWechat: form.contactWechat,
      isVisible: !!form.isVisible,
      status: form.status || '报名中',
      // 每周重复仅新增生效(创建长期延续系列)；编辑期次不展开，保持原系列
      repeatEnabled: !editing.value && !!form.repeatEnabled,
      weekdays: !editing.value && form.repeatEnabled ? (form.weekdays || []) : undefined,
    }
    if (editing.value) {
      await updateActivityAdmin(editing.value.id, payload)
      message.success('保存成功')
    } else {
      await createActivityAdmin(payload)
      message.success('新增成功')
    }
    formOpen.value = false
    table.refresh()
  }
  catch (e) {
    console.error('保存活动失败', e)
    message.error('保存失败，请重试')
  }
  finally {
    saving.value = false
  }
}

async function handleToggleVisible(record: ActivityAdminItem) {
  try {
    await setActivityVisibility(record.id, !record.isVisible)
    message.success(record.isVisible ? '已下架' : '已上架')
    table.loadData()
  }
  catch (e) {
    console.error('更新上下架失败', e)
    message.error('操作失败')
  }
}

async function handleDelete(record: ActivityAdminItem) {
  try {
    await deleteActivityAdmin(record.id)
    message.success('删除成功')
    table.loadData()
  }
  catch (e) {
    console.error('删除活动失败', e)
    message.error('删除失败')
  }
}

onMounted(() => {
  if (isSuperAdmin) loadOperators()
  loadVenues()
  table.loadData()
  seriesTable.loadData()
})
</script>

<style scoped>
.table-toolbar {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.table-toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.table-toolbar-right {
  display: flex;
  align-items: center;
}
.title-cell {
  font-weight: 600;
}
.sub-text {
  font-size: 12px;
  color: #999;
}
.free-text {
  color: #52c41a;
}
</style>
