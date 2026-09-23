<template>
  <div class="page-container">
    <!-- 顶部统计卡（参照原型 W03 stats-row） -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">会员总数</div>
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
          <a-select
            v-if="isPlatformRole"
            v-model:value="searchOperatorId"
            placeholder="全部俱乐部"
            style="width: 200px"
            allow-clear
            show-search
            option-filter-prop="label"
            :options="clubOptions"
            :loading="clubLoading"
            @change="handleSearch"
          />
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
        :scroll="{ x: 1250 }"
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
          <template v-else-if="column.dataIndex === 'operatorName'">
            <span v-if="record.operatorName">{{ record.operatorName }}</span>
            <span v-else class="text-muted">-</span>
          </template>
          <template v-else-if="column.dataIndex === 'cardType'">
            <a-tag v-if="!record.cardType">未办卡</a-tag>
            <template v-else>
              <a-tag :color="cardTypeColor(record.cardType)">{{ cardTypeLabel(record.cardType) }}</a-tag>
              <div class="sub-text">{{ record.cardNo }}</div>
              <a v-if="(record.cards?.length ?? 0) > 1" @click.stop="openCards(record)">共 {{ record.cards!.length }} 张卡</a>
            </template>
          </template>
          <template v-else-if="column.dataIndex === 'balanceOrTimes'">
            <span v-if="!record.cardType" class="text-muted">-</span>
            <template v-else-if="record.cardType === 'stored_value'">
              <div class="balance-text">¥ {{ formatFen(record.balance) }}</div>
              <div class="sub-text">累计充值 ¥ {{ formatFen(record.totalRecharge) }}</div>
            </template>
            <template v-else-if="record.cardType === 'times_card'">
              <div class="balance-text">剩余 {{ record.remainingTimes ?? 0 }} 次</div>
              <div class="sub-text">累计消费 ¥ {{ formatFen(record.totalConsume) }}</div>
            </template>
            <template v-else>
              <div class="balance-text">不限次</div>
              <div class="sub-text">累计消费 ¥ {{ formatFen(record.totalConsume) }}</div>
            </template>
          </template>
          <template v-else-if="column.dataIndex === 'expireDate'">
            <span v-if="!record.cardType" class="text-muted">-</span>
            <span v-else-if="record.cardType === 'monthly_card'">{{ record.expireDate || '长期有效' }}</span>
            <span v-else-if="record.cardType === 'times_card'">{{ record.expireDate || '-' }}</span>
            <span v-else class="text-muted">长期有效</span>
          </template>
          <template v-else-if="column.dataIndex === 'cardStatus'">
            <span v-if="!record.cardType" class="text-muted">未办卡</span>
            <a-badge v-else :status="cardStatusBadge(record.cardStatus, record)" :text="cardStatusLabel(record.cardStatus, record)" />
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <div class="action-cell">
              <template v-if="record.cardType">
                <a @click="openRecharge(record)">充值</a>
                <a @click="openAdjust(record)">调整</a>
                <a @click="openTransactions(record)">流水</a>
                <a @click="openRefund(record)">退款</a>
                <a @click="openAddCard(record)">办卡</a>
              </template>
              <template v-else>
                <a @click="openTransactions(record)">流水</a>
                <a @click="openAddCard(record)">办卡</a>
              </template>
              <a-dropdown>
                <a class="more-link">更多 <down-outlined /></a>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="openProfileEdit(record)">编辑会员信息</a-menu-item>
                    <a-menu-item v-if="record.cardStatus === 'active'" @click="toggleStatus(record, 'frozen')">冻结</a-menu-item>
                    <a-menu-item v-if="record.cardStatus === 'frozen'" @click="toggleStatus(record, 'active')">解冻</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新增会员 Modal（含首张卡信息） -->
    <a-modal
      v-model:open="formModalOpen"
      title="新增会员"
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
        <!-- 储值卡：初始充值金额；次卡/月卡：选择产品(次数/时长/售价由产品配置带出) -->
        <a-form-item v-if="memberForm.cardType === 'stored_value'" label="初始充值金额(元)" name="initAmount">
          <a-input-number
            v-model:value="memberForm.initAmount"
            :min="0"
            :step="100"
            style="width: 100%"
            placeholder="0"
          />
          <!-- 充值赠送档位参考: 便于确定初始充值金额 -->
          <div v-if="giftTiers.length > 0" class="gift-tiers">
            <div class="gift-tiers-title">充值赠送档位参考（充值满 X 送 Y，立即到账）</div>
            <div class="gift-tiers-list">
              <a-tag v-for="g in giftTiers" :key="g.id" color="orange">
                满 ¥{{ g.minAmount }} 送 ¥{{ g.giftAmount }}
              </a-tag>
            </div>
          </div>
        </a-form-item>
        <!-- 赠送金额: 与实付分开记账(余额=实付+赠送, 流水 RECHARGE/GIFT 分开), 便于后续退款按实付口径限制 -->
        <a-form-item
          v-if="memberForm.cardType === 'stored_value'"
          label="赠送金额(元)"
          name="giftAmount"
        >
          <a-input-number
            v-model:value="memberForm.giftAmount"
            :min="0"
            :step="50"
            style="width: 100%"
            placeholder="0（无赠送）"
          />
        </a-form-item>
        <template v-if="memberForm.cardType === 'times_card' || memberForm.cardType === 'monthly_card'">
          <a-form-item label="会员卡产品" name="planId">
            <a-select
              v-model:value="memberForm.planId"
              :options="memberPlanOptions"
              placeholder="请选择俱乐部上架产品"
              show-search
              option-filter-prop="label"
              @change="loadPlanTimes"
            />
          </a-form-item>
          <div v-if="memberSelectedPlan" class="plan-tip">
            售价 <b>¥ {{ formatFen(memberSelectedPlan.price) }}</b>
            <template v-if="memberForm.cardType === 'times_card'">
              · 总次数 <b>{{ memberSelectedPlanTimes || '-' }} 次</b>
            </template>
            <template v-else>
              · 时长 <b>{{ planDurationLabel(memberSelectedPlan) }}</b>
            </template>
          </div>
          <a-form-item v-if="memberForm.cardType === 'times_card'" label="赠送次数(仅作说明，不参与退款折算)" name="giftTimes">
            <a-input-number
              v-model:value="memberForm.giftTimes"
              :min="0"
              :step="1"
              style="width: 100%"
              placeholder="0（活动/协商多赠）"
            />
          </a-form-item>
        </template>
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
      :destroy-on-close="true"
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
        <!-- 可退金额为只读展示: 用纯文本避免非受控 input-number 在 Modal 动画期间更新触发渲染器空引用 -->
        <a-form-item label="可退金额(元)">
          <div class="refundable-amount-text">¥ {{ refundableAmount.toFixed(2) }}</div>
        </a-form-item>
        <a-form-item label="实际退款金额(元)" name="amount">
          <a-input-number
            v-model:value="refundForm.amount"
            :min="0"
            :max="currentMember?.cardType === 'monthly_card' ? undefined : refundableAmount"
            :step="10"
            style="width: 100%"
            placeholder="不超过可退金额"
          />
        </a-form-item>
        <a-form-item label="退款方式" name="refundMethod">
          <a-radio-group v-model:value="refundForm.refundMethod">
            <!-- 储值卡资金在余额, 退款只能原路退回微信; 次卡/月卡补偿性退款才退到余额 -->
            <a-radio v-if="currentMember?.cardType === 'stored_value'" value="wechat">原路退回微信</a-radio>
            <template v-else>
              <a-radio value="balance">退到会员卡余额</a-radio>
            </template>
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

    <!-- 追加办卡 Modal: 已有会员新增卡(可跨卡种, 同卡种只能一张); 无卡会员办首张卡也走这里 -->
    <a-modal
      v-model:open="addCardModalOpen"
      :title="currentMember?.cardType ? '追加办卡' : '办卡'"
      :confirm-loading="submitting"
      :width="460"
      :destroy-on-close="true"
      @ok="submitAddCard"
    >
      <div v-if="currentMember" class="modal-member-info">
        <a-avatar :src="currentMember.avatar">{{ currentMember.name?.charAt(0) }}</a-avatar>
        <div>
          <div class="info-name">{{ currentMember.name }}
            <template v-if="currentMember.cardType"> · 现有 {{ cardTypeLabel(currentMember.cardType) }}</template>
            <template v-else> · 未办卡</template>
          </div>
          <div class="sub-text">{{ currentMember.cardType ? '为会员再办一张新卡（可办理不同卡种）' : '为会员办理首张会员卡' }}</div>
        </div>
      </div>
      <a-form ref="addCardFormRef" :model="addCardForm" :rules="addCardRules" layout="vertical" style="margin-top: 16px">
        <a-form-item label="新卡类型" name="cardType">
          <a-select v-model:value="addCardForm.cardType" :options="addCardTypeOptions" />
        </a-form-item>
        <template v-if="addCardForm.cardType === 'stored_value'">
          <a-form-item label="初始充值金额(元)" name="initAmount">
            <a-input-number
              v-model:value="addCardForm.initAmount"
              :min="0"
              :step="100"
              style="width: 100%"
              placeholder="0"
            />
            <!-- 充值赠送档位参考: 便于确定初始充值金额 -->
            <div v-if="giftTiers.length > 0" class="gift-tiers">
              <div class="gift-tiers-title">充值赠送档位参考（充值满 X 送 Y，立即到账）</div>
              <div class="gift-tiers-list">
                <a-tag v-for="g in giftTiers" :key="g.id" color="orange">
                  满 ¥{{ g.minAmount }} 送 ¥{{ g.giftAmount }}
                </a-tag>
              </div>
            </div>
          </a-form-item>
          <a-form-item label="赠送金额(元)" name="giftAmount">
            <a-input-number
              v-model:value="addCardForm.giftAmount"
              :min="0"
              :step="50"
              style="width: 100%"
              placeholder="0（无赠送）"
            />
          </a-form-item>
        </template>
        <template v-if="addCardForm.cardType === 'times_card' || addCardForm.cardType === 'monthly_card'">
          <a-form-item label="会员卡产品" name="planId">
            <a-select
              v-model:value="addCardForm.planId"
              :options="addCardPlanOptions"
              placeholder="请选择俱乐部上架产品"
              show-search
              option-filter-prop="label"
              @change="loadPlanTimes"
            />
          </a-form-item>
          <div v-if="addCardSelectedPlan" class="plan-tip">
            售价 <b>¥ {{ formatFen(addCardSelectedPlan.price) }}</b>
            <template v-if="addCardForm.cardType === 'times_card'">
              · 总次数 <b>{{ addCardSelectedPlanTimes || '-' }} 次</b>
            </template>
            <template v-else>
              · 时长 <b>{{ planDurationLabel(addCardSelectedPlan) }}</b>
            </template>
          </div>
          <a-form-item v-if="addCardForm.cardType === 'times_card'" label="赠送次数(仅作说明，不参与退款折算)" name="giftTimes">
            <a-input-number
              v-model:value="addCardForm.giftTimes"
              :min="0"
              :step="1"
              style="width: 100%"
              placeholder="0（活动/协商多赠）"
            />
          </a-form-item>
        </template>
        <a-alert
          v-if="addCardPreviewText"
          type="info"
          show-icon
          :message="addCardPreviewText"
        />
      </a-form>
    </a-modal>

    <!-- 编辑会员信息 Modal: 只改资料(姓名/手机/性别/状态), 不含卡片 -->
    <a-modal
      v-model:open="profileModalOpen"
      title="编辑会员信息"
      :confirm-loading="submitting"
      :width="440"
      @ok="submitProfile"
    >
      <a-form ref="profileFormRef" :model="profileForm" :rules="profileRules" layout="vertical">
        <a-form-item label="姓名" name="name">
          <a-input v-model:value="profileForm.name" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item label="手机号" name="phone">
          <a-input v-model:value="profileForm.phone" placeholder="请输入手机号" :maxlength="11" />
        </a-form-item>
        <a-form-item label="性别" name="gender">
          <a-radio-group v-model:value="profileForm.gender">
            <a-radio value="male">男</a-radio>
            <a-radio value="female">女</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group v-model:value="profileForm.status">
            <a-radio :value="1">正常</a-radio>
            <a-radio :value="0">冻结</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 会员卡片 Drawer: 展示该会员所有卡, 按卡操作 -->
    <a-drawer
      v-model:open="cardsDrawerOpen"
      :title="`会员卡片 - ${currentMember?.name || ''}`"
      width="560"
      :destroy-on-close="true"
    >
      <a-empty v-if="!currentMember?.cards?.length" description="该会员暂未办卡" />
      <a-card
        v-for="card in currentMember?.cards || []"
        :key="card.id"
        class="card-item"
        size="small"
      >
        <div class="card-item-head">
          <a-tag :color="cardTypeColor(card.cardType)">{{ cardTypeLabel(card.cardType) }}</a-tag>
          <span class="sub-text">卡号 {{ card.cardNo }}</span>
          <span class="card-item-status">
            <a-badge :status="cardStatusBadge(card.cardStatus, card)" :text="cardStatusLabel(card.cardStatus, card)" />
          </span>
        </div>
        <div class="card-item-body">
          <template v-if="card.cardType === 'stored_value'">
            余额 <span class="balance-text">¥ {{ formatFen(card.balance) }}</span>
          </template>
          <template v-else-if="card.cardType === 'times_card'">
            剩余 <span class="balance-text">{{ card.remainingTimes ?? 0 }} 次</span>
          </template>
          <template v-else>
            月卡 · 到期 <span class="balance-text">{{ card.expireDate || '-' }}</span>
          </template>
          <span class="sub-text"> · 办卡 {{ card.joinDate }}</span>
          <span v-if="card.operatorName" class="sub-text"> · {{ card.operatorName }}</span>
        </div>
        <div class="card-item-actions">
          <a @click="openCardRecharge(card)">充值</a>
          <a @click="openCardAdjust(card)">调整</a>
          <a @click="openCardRefund(card)">退款</a>
          <a @click="openCardTransactions(card)">流水</a>
          <a
            v-if="card.cardStatus === 'active'"
            class="danger-link"
            @click="toggleCardFreeze(card, 'frozen')"
          >冻结</a>
          <a v-else @click="toggleCardFreeze(card, 'active')">解冻</a>
        </div>
      </a-card>
    </a-drawer>

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
  addMemberCard,
  toggleMemberStatus,
  toggleCardStatus as toggleCardStatusApi,
  recharge,
  adjustBalance,
  refundMember,
  getMemberTransactions,
  getMemberDetail,
  type MemberQuery,
} from '@/api/member'
import { getOperatorList } from '@/api/operator'
import { getRechargeGifts, getVipPlanList, getVipPlanBenefits } from '@/api/vip'
import { useAuthStore } from '@/stores/auth'
import { useTable } from '@/composables/useTable'
import type {
  Member,
  MemberCard,
  MemberStats,
  CardType,
  CardStatus,
  CardTransaction,
  TransactionType,
  RechargeGift,
  VipPlan,
} from '@/types/models'

// ===== 当前角色 & 俱乐部 =====
const authStore = useAuthStore()
/** 平台角色: 超管/管理员可切换俱乐部查看；经营者固定自己俱乐部（后端强制） */
const isPlatformRole = computed(
  () => authStore.roles.includes('super_admin') || authStore.roles.includes('admin'),
)
const clubOptions = ref<{ label: string, value: string | number }[]>([])
const clubLoading = ref(false)
const searchOperatorId = ref<string | number | undefined>(undefined)

async function loadClubs() {
  if (!isPlatformRole.value) return
  clubLoading.value = true
  try {
    const res = await getOperatorList({ page: 1, size: 100, status: 'approved' })
    clubOptions.value = (res.list || []).map((o) => ({
      label: o.companyName || `俱乐部 #${o.id}`,
      value: o.id,
    }))
  } catch {
    clubOptions.value = []
  } finally {
    clubLoading.value = false
  }
}

/** 当前生效的俱乐部过滤（经营者不传，后端强制自己） */
const currentOperatorId = computed(() => (isPlatformRole.value ? searchOperatorId.value : undefined))

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
/** 会员或卡片共有的状态判断字段 */
type CardLike = {
  cardType?: CardType
  balance?: number
  remainingTimes?: number
  expireDate?: string
}

/** 状态文案（含余额不足/即将过期业务态） */
function cardStatusLabel(s: CardStatus, m: CardLike): string {
  // 业务态优先：储值卡余额低于 100 元（10000 分）显示"余额不足"
  if (s === 'active' && m.cardType === 'stored_value' && (m.balance ?? 0) < 10000) return '余额不足'
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
function cardStatusBadge(s: CardStatus, m: CardLike): 'success' | 'error' | 'warning' | 'default' {
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
  { label: '系统错误补偿', value: '系统错误补偿' },
  { label: '手动赠送', value: '手动赠送' },
  { label: '消费退款', value: '消费退款' },
  { label: '错误扣减纠正', value: '错误扣减纠正' },
  { label: '活动奖励', value: '活动奖励' },
  { label: '其他', value: '其他' },
]

const refundReasonOptions = [
  { label: '会员申请退卡', value: '会员申请退卡' },
  { label: '储值卡退款', value: '储值卡退款' },
  { label: '次卡退课', value: '次卡退课' },
  { label: '月卡退订', value: '月卡退订' },
  { label: '服务投诉补偿', value: '服务投诉补偿' },
  { label: '其他', value: '其他' },
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
    const data = await getMemberStats(currentOperatorId.value)
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
  queryParams.operatorId = currentOperatorId.value
  refresh()
  loadStats()
  loadGiftTiers()
}
function handleReset() {
  searchKeyword.value = ''
  searchCardType.value = undefined
  searchCardStatus.value = undefined
  searchOperatorId.value = undefined
  resetQuery()
  loadStats()
}

// ===== 列表 =====
const columns: TableColumnsType = [
  { title: '会员', dataIndex: 'name', width: 200 },
  { title: '卡类型', dataIndex: 'cardType', width: 140 },
  { title: '余额 / 剩余', dataIndex: 'balanceOrTimes', width: 150, align: 'right' },
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
  initialQuery: { keyword: '', cardType: undefined, cardStatus: undefined, operatorId: undefined },
})

// ===== 新增会员（含首张卡） =====
const formModalOpen = ref(false)
const submitting = ref(false)
const memberFormRef = ref<FormInstance>()
/** 当前俱乐部充值赠送档位(初始充值金额填写参考) */
const giftTiers = ref<RechargeGift[]>([])
const memberForm = reactive<Partial<Member> & { initAmount?: number, initTimes?: number, giftAmount?: number }>({
  name: '',
  phone: '',
  gender: 'male',
  cardType: 'stored_value',
  joinDate: dayjs().format('YYYY-MM-DD'),
  expireDate: '',
  remark: '',
  initAmount: 0,
  initTimes: 0,
  giftAmount: 0,
  planId: undefined,
  giftTimes: 0,
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

/** 加载当前俱乐部充值赠送档位(平台角色按所选俱乐部过滤, 经营者固定自己) */
async function loadGiftTiers() {
  try {
    const opId = isPlatformRole.value ? searchOperatorId.value : undefined
    const list = await getRechargeGifts(opId)
    giftTiers.value = (list || []).filter(g => g.status === 1)
  } catch {
    giftTiers.value = []
  }
}

// ===== 会员卡产品（次卡/月卡产品化：开卡只能选俱乐部上架产品，售价/总次数/时长由产品带出） =====
/** 当前俱乐部上架产品（含次卡/月卡，按卡类型过滤） */
const planList = ref<VipPlan[]>([])
/** planId -> 总次数（TOTAL_TIMES 权益汇总缓存，避免重复请求） */
const planBenefitsCache = reactive<Record<string, number>>({})

async function loadPlans() {
  try {
    // 后端 listPlans 按登录账号自动过滤俱乐部（经营者固定自己，平台角色全量）
    const res = await getVipPlanList({ page: 1, size: 100, planType: 'venue', status: 'active' })
    planList.value = res.list || []
  } catch {
    planList.value = []
  }
}

/** 拉取并缓存某产品的总次数权益（仅选中时触发，避免冗余请求） */
async function loadPlanTimes(planId?: string | number) {
  if (planId === undefined || planId === null || planId === '') return
  if (planBenefitsCache[String(planId)] !== undefined) return
  try {
    const benefits = await getVipPlanBenefits(planId)
    const total = (benefits || [])
      .filter((b) => b.benefitType === 'TOTAL_TIMES')
      .reduce((sum, b) => sum + (b.freeSlots ?? 0), 0)
    planBenefitsCache[String(planId)] = total
  } catch {
    planBenefitsCache[String(planId)] = 0
  }
}

/** 产品时长文案：优先 durationDays，兼容 durationMonths */
function planDurationLabel(plan: VipPlan): string {
  const days = plan.durationDays ?? (plan.durationMonths ? plan.durationMonths * 30 : 0)
  if (days > 0) return `${Math.round(days / 30)} 个月`
  return '长期'
}

function planMatchesType(plan: VipPlan, cardType: string | undefined): boolean {
  if (cardType === 'times_card') return plan.productType === 'TIMES_CARD'
  if (cardType === 'monthly_card') return plan.productType === 'MONTHLY_CARD'
  return false
}

/** 新增会员弹窗：按所选卡类型过滤上架产品 */
const memberPlanOptions = computed(() =>
  planList.value
    .filter((p) => planMatchesType(p, memberForm.cardType))
    .map((p) => ({ label: `${p.name}（¥${formatFen(p.price)}）`, value: p.id })),
)
const memberSelectedPlan = computed<VipPlan | null>(() =>
  memberForm.planId ? planList.value.find((p) => p.id === memberForm.planId) || null : null,
)
const memberSelectedPlanTimes = computed(() =>
  memberForm.planId ? (planBenefitsCache[String(memberForm.planId)] ?? 0) : 0,
)

function openCreate() {
  loadGiftTiers()
  loadPlans()
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
    giftAmount: 0,
    planId: undefined,
    giftTimes: 0,
  })
  formModalOpen.value = true
}

async function submitMember() {
  await memberFormRef.value?.validate()
  if ((memberForm.cardType === 'times_card' || memberForm.cardType === 'monthly_card') && !memberForm.planId) {
    message.warning('请选择会员卡产品')
    return
  }
  submitting.value = true
  try {
    await createMember(memberForm)
    message.success('会员创建成功')
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

// ===== 编辑会员信息（只改资料, 不含卡片） =====
const profileModalOpen = ref(false)
const profileFormRef = ref<FormInstance>()
const profileEditId = ref<string | number>(0)
const profileForm = reactive<Partial<Member>>({
  name: '',
  phone: '',
  gender: 'male',
  status: 1,
})
const profileRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
}

function openProfileEdit(record: Member) {
  profileEditId.value = record.id
  Object.assign(profileForm, {
    name: record.name,
    phone: record.phone,
    gender: record.gender ?? 'male',
    status: record.status ?? 1,
  })
  profileModalOpen.value = true
}

async function submitProfile() {
  await profileFormRef.value?.validate()
  submitting.value = true
  try {
    await updateMember(profileEditId.value, profileForm)
    message.success('会员信息更新成功')
    profileModalOpen.value = false
    loadMemberList()
    loadStats()
  } finally {
    submitting.value = false
  }
}

// ===== 会员卡片抽屉（多卡展示 + 按卡操作） =====
const cardsDrawerOpen = ref(false)

function openCards(record: Member) {
  currentMember.value = record
  cardsDrawerOpen.value = true
}

/** 将指定卡信息合并进 currentMember, 使充值/调整/退款弹窗针对该卡展示与提交（cardNo 即卡 id） */
function mergeCardIntoMember(card: MemberCard): Member {
  const base = currentMember.value
  return {
    ...(base || {}),
    cards: base?.cards,
    cardType: card.cardType,
    cardNo: card.cardNo,
    balance: card.balance,
    remainingTimes: card.remainingTimes,
    cardStatus: card.cardStatus,
    expireDate: card.expireDate,
    joinDate: card.joinDate,
    operatorId: card.operatorId,
    operatorName: card.operatorName,
  } as Member
}

function openCardRecharge(card: MemberCard) {
  currentMember.value = mergeCardIntoMember(card)
  openRecharge(currentMember.value)
}

function openCardAdjust(card: MemberCard) {
  currentMember.value = mergeCardIntoMember(card)
  openAdjust(currentMember.value)
}

function openCardRefund(card: MemberCard) {
  currentMember.value = mergeCardIntoMember(card)
  openRefund(currentMember.value)
}

/** 按卡冻结/解冻（仅影响该卡, 不影响会员其他卡） */
async function toggleCardFreeze(card: MemberCard, status: string) {
  submitting.value = true
  try {
    await toggleCardStatusApi(card.id, status)
    message.success(status === 'frozen' ? '该卡已冻结' : '该卡已解冻')
    // 重新拉取会员详情刷新抽屉内全部卡的状态
    if (currentMember.value?.id) {
      currentMember.value = await getMemberDetail(currentMember.value.id)
    }
    loadMemberList()
    loadStats()
  } finally {
    submitting.value = false
  }
}

// ===== 充值 =====
const rechargeModalOpen = ref(false)
const rechargeFormRef = ref<FormInstance>()
const currentMember = ref<Member | null>(null)
const rechargeForm = reactive<{
  memberId: string | number
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
      // 次卡充值: 次数真实增加(remainingTimes += times), amount 传 0
      await recharge({
        memberId: rechargeForm.memberId,
        cardId: currentMember.value.cardNo || undefined,
        amount: 0,
        times: rechargeForm.times,
        payMethod: rechargeForm.payMethod,
        remark: rechargeForm.remark,
      })
    } else {
      await recharge({
        memberId: rechargeForm.memberId,
        cardId: currentMember.value?.cardNo || undefined,
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
  memberId: string | number
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
      cardId: currentMember.value?.cardNo || undefined,
      amount: currentMember.value?.cardType === 'times_card' ? 0 : adjustForm.amount * 100,
      times: currentMember.value?.cardType === 'times_card' ? adjustForm.times : undefined,
      reason: adjustForm.reason,
      remark: adjustForm.remark,
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

/** 次卡可退金额(元): 与后端一致 = 剩余次数×单价(单价=售价÷产品配置总次数), 封顶售价 */
function calcTimesRefundable(m: Member): number {
  const card = m.cards?.find((c) => c.cardType === m.cardType)
  if (!card) return 0
  const planId = card.planId
  const price = card.price // 分
  const remaining = card.remainingTimes ?? 0
  if (!planId || !price || price <= 0) return 0
  const total = planBenefitsCache[String(planId)]
  if (!total) return 0 // 产品总次数未加载时先显示 0，loadPlanTimes 完成后自动更新
  return Math.min((remaining * price) / total, price) / 100
}

/** 可退金额(元): 储值卡 = 余额; 次卡 = 按剩余次数折算; 月卡 = 0(规则未定, 由运营与会员协商填写) */
const refundableAmount = computed(() => {
  if (!currentMember.value) return 0
  if (currentMember.value.cardType === 'stored_value') {
    // 储值卡可退 = 余额（赠送金额不可退，简化为余额）
    return Math.max(0, currentMember.value.balance / 100)
  }
  if (currentMember.value.cardType === 'times_card') {
    return calcTimesRefundable(currentMember.value)
  }
  return 0
})

const refundRuleText = computed(() => {
  if (!currentMember.value) return ''
  if (currentMember.value.cardType === 'stored_value') {
    return '储值卡退款: 原路退回微信支付, 退款金额将从卡余额中扣减(上限为当前余额)'
  }
  if (currentMember.value.cardType === 'times_card') {
    return '次卡退款: 按剩余次数×单价折算(单价=售价÷产品配置总次数), 退到会员卡余额, 退款后该卡剩余次数清零'
  }
  return '月卡退款: 退到会员卡余额(补偿性入账), 金额请与会员协商后填写'
})

function openRefund(record: Member) {
  currentMember.value = record
  // 次卡退款需产品总次数计算可退金额, 触发权益加载（响应式更新可退金额）
  if (record.cardType === 'times_card') {
    const card = record.cards?.find((c) => c.cardType === record.cardType)
    if (card?.planId) loadPlanTimes(card.planId)
  }
  Object.assign(refundForm, {
    amount: refundableAmount.value,
    // 储值卡只能原路退回微信; 次卡/月卡只能退到余额
    refundMethod: record.cardType === 'stored_value' ? 'wechat' : 'balance',
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
      cardId: currentMember.value?.cardNo || undefined,
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

// ===== 追加办卡 =====
const addCardModalOpen = ref(false)
const addCardFormRef = ref<FormInstance>()
const addCardForm = reactive<{
  cardType: CardType
  initAmount: number
  initTimes: number
  giftAmount: number
  planId?: string | number
  giftTimes?: number
}>({
  cardType: 'times_card',
  initAmount: 0,
  initTimes: 0,
  giftAmount: 0,
  planId: undefined,
  giftTimes: 0,
})
const addCardRules = {
  cardType: [{ required: true, message: '请选择卡类型', trigger: 'change' }],
  initTimes: [{ required: false, message: '请输入初始次数', trigger: 'blur' }],
}

/** 追加办卡弹窗：按所选卡类型过滤上架产品 */
const addCardPlanOptions = computed(() =>
  planList.value
    .filter((p) => planMatchesType(p, addCardForm.cardType))
    .map((p) => ({ label: `${p.name}（¥${formatFen(p.price)}）`, value: p.id })),
)
const addCardSelectedPlan = computed<VipPlan | null>(() =>
  addCardForm.planId ? planList.value.find((p) => p.id === addCardForm.planId) || null : null,
)
const addCardSelectedPlanTimes = computed(() =>
  addCardForm.planId ? (planBenefitsCache[String(addCardForm.planId)] ?? 0) : 0,
)

/** 追加办卡可选卡种: 排除会员已持有的全部卡种(同卡种只能一张, 防止新卡覆盖旧卡) */
const addCardTypeOptions = computed(() => {
  const owned = new Set<string>()
  ;(currentMember.value?.cards || []).forEach((c) => {
    if (c.cardType) owned.add(c.cardType)
  })
  if (currentMember.value?.cardType) owned.add(currentMember.value.cardType)
  return cardTypeOptions.filter((o) => !owned.has(o.value))
})

const addCardPreviewText = computed(() => {
  if (!currentMember.value) return ''
  const c = addCardForm.cardType
  if (c === 'stored_value') {
    if (!addCardForm.initAmount && !addCardForm.giftAmount) return ''
    return `新储值卡: 实付 ¥${addCardForm.initAmount || 0} + 赠送 ¥${addCardForm.giftAmount || 0} = 余额 ¥${(addCardForm.initAmount || 0) + (addCardForm.giftAmount || 0)}`
  }
  if (c === 'times_card' || c === 'monthly_card') {
    const plan = addCardSelectedPlan.value
    if (!plan) return '请选择会员卡产品'
    if (c === 'times_card') {
      const total = addCardSelectedPlanTimes.value || 0
      const gift = addCardForm.giftTimes || 0
      return `新次卡: ${plan.name} · ${total} 次${gift ? ` + 赠 ${gift} 次` : ''}，售价 ¥${formatFen(plan.price)}，有效期 ${planDurationLabel(plan)}`
    }
    return `新月卡: ${plan.name} · 售价 ¥${formatFen(plan.price)}，有效期 ${planDurationLabel(plan)}`
  }
  return ''
})

function openAddCard(record: Member) {
  currentMember.value = record
  loadGiftTiers()
  loadPlans()
  // 默认选次卡; 若已有次卡则选剩余可选卡种的第一项（排除会员已持有的全部卡种）
  const owned = new Set<string>()
  ;(record.cards || []).forEach((c) => {
    if (c.cardType) owned.add(c.cardType)
  })
  if (record.cardType) owned.add(record.cardType)
  const available = cardTypeOptions.filter((o) => !owned.has(o.value))
  const defaultType = available.find((o) => o.value === 'times_card') || available[0]
  Object.assign(addCardForm, {
    cardType: defaultType?.value ?? 'times_card',
    initAmount: 0,
    initTimes: 0,
    giftAmount: 0,
    planId: undefined,
    giftTimes: 0,
  })
  addCardModalOpen.value = true
}

async function submitAddCard() {
  await addCardFormRef.value?.validate()
  if ((addCardForm.cardType === 'times_card' || addCardForm.cardType === 'monthly_card') && !addCardForm.planId) {
    message.warning('请选择会员卡产品')
    return
  }
  submitting.value = true
  try {
    await addMemberCard(currentMember.value!.id, {
      cardType: addCardForm.cardType,
      initAmount: addCardForm.initAmount,
      giftAmount: addCardForm.giftAmount,
      initTimes: addCardForm.initTimes,
      planId: addCardForm.planId,
      giftTimes: addCardForm.giftTimes,
      operatorId: currentMember.value?.operatorId,
    })
    message.success('办卡成功')
    addCardModalOpen.value = false
    loadMemberList()
    loadStats()
  } finally {
    submitting.value = false
  }
}

// ===== 交易记录 =====
const transactionDrawerOpen = ref(false)
const txLoading = ref(false)
/** 当前流水查询目标卡 id；undefined 时后端作用主卡（列表行） */
const txCardId = ref<string | number | undefined>(undefined)
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

/** 拉取流水（txCardId 指定时只看该卡） */
async function loadTransactions() {
  transactionDrawerOpen.value = true
  txFilterType.value = ''
  txLoading.value = true
  try {
    const res = await getMemberTransactions(currentMember.value!.id, {
      page: 1,
      size: 100,
      cardId: txCardId.value,
    })
    transactions.value = (res.list || []) as TxRow[]
  } catch {
    transactions.value = []
  } finally {
    txLoading.value = false
  }
}

/** 列表行"流水": 主卡流水（不传 cardId, 后端作用主卡） */
async function openTransactions(record: Member) {
  currentMember.value = record
  txCardId.value = undefined
  await loadTransactions()
}

/** 卡片抽屉"流水": 只看该卡流水 */
async function openCardTransactions(card: MemberCard) {
  currentMember.value = mergeCardIntoMember(card)
  txCardId.value = card.cardNo
  await loadTransactions()
}

// 初始化加载
loadClubs()
loadMemberList()
loadStats()
</script>

<style scoped lang="scss">
.refundable-amount-text {
  font-size: 18px;
  font-weight: 700;
  color: #f5222d;
  line-height: 32px;
  padding: 0 2px;
}

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
.action-cell {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  white-space: nowrap;
  a {
    color: #1677ff;
    font-size: 14px;
  }
}
.danger-link {
  color: #ef4444 !important;
}
.plan-tip {
  margin: -6px 0 14px;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px dashed #38bdf8;
  border-radius: 6px;
  font-size: 13px;
  color: #0369a1;
  b {
    color: #0c4a6e;
  }
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

// ===== 充值赠送档位参考 =====
.gift-tiers {
  margin-top: 8px;
  padding: 8px 10px;
  background: #FFFBF0;
  border: 1px dashed #F59E0B;
  border-radius: 6px;
}
.gift-tiers-title {
  font-size: 12px;
  color: #B45309;
  margin-bottom: 6px;
}
.gift-tiers-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

// ===== 会员卡片抽屉 =====
.card-item {
  margin-bottom: 12px;
  border: 1px solid #f1f5f9;
  &:last-child {
    margin-bottom: 0;
  }
  .card-item-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    .card-item-status {
      margin-left: auto;
    }
  }
  .card-item-body {
    font-size: 14px;
    color: #333;
    margin-bottom: 10px;
  }
  .card-item-actions {
    border-top: 1px dashed #eef2f7;
    padding-top: 8px;
  }
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
