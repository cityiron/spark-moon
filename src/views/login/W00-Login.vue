<template>
  <div class="login-page">
    <!-- 左侧品牌展示区 -->
    <div class="login-brand">
      <div class="brand-content">
        <div class="brand-logo">
          <img :src="logoSvg" alt="logo" />
          <h1>羽球管家</h1>
        </div>
        <p class="brand-slogan">智慧场馆 · 高效管理 · 贴心服务</p>
        <ul class="brand-features">
          <li><check-circle-filled /> 场馆场地一体化管理</li>
          <li><check-circle-filled /> 可视化预订与场地锁定</li>
          <li><check-circle-filled /> 会员储值卡与交易全记录</li>
          <li><check-circle-filled /> 灵活分时段定价策略</li>
        </ul>
      </div>
      <div class="brand-footer">© {{ year }} 羽球管家 Badminton Venue Admin</div>
    </div>

    <!-- 右侧登录表单区 -->
    <div class="login-form-area">
      <div class="login-box">
        <h2 class="login-title">欢迎登录</h2>
        <p class="login-subtitle">羽球管家场馆管理后台</p>

        <!-- 登录方式切换 -->
        <a-tabs v-model:activeKey="loginType" centered class="login-tabs">
          <a-tab-pane key="account" tab="账号密码登录" />
          <a-tab-pane key="sms" tab="手机号验证码登录" />
        </a-tabs>

        <!-- 账号密码登录 -->
        <a-form
          v-if="loginType === 'account'"
          ref="accountFormRef"
          :model="accountForm"
          :rules="accountRules"
          layout="vertical"
          @finish="handleSubmit"
        >
          <a-form-item label="账号" name="username">
            <a-input
              v-model:value="accountForm.username"
              size="large"
              placeholder="请输入用户名 / 手机号"
              allow-clear
            >
              <template #prefix><user-outlined /></template>
            </a-input>
          </a-form-item>

          <a-form-item label="密码" name="password">
            <a-input-password
              v-model:value="accountForm.password"
              size="large"
              placeholder="请输入密码"
              @keyup.enter="handleSubmit"
            >
              <template #prefix><lock-outlined /></template>
            </a-input-password>
          </a-form-item>

          <a-form-item>
            <div class="form-extra">
              <a-checkbox v-model:checked="rememberMe">记住账号</a-checkbox>
              <a href="javascript:;" class="forget-link">忘记密码?</a>
            </div>
          </a-form-item>

          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
              class="login-btn"
            >
              登 录
            </a-button>
          </a-form-item>
        </a-form>

        <!-- 手机号验证码登录 -->
        <a-form
          v-else
          ref="smsFormRef"
          :model="smsForm"
          :rules="smsRules"
          layout="vertical"
          @finish="handleSubmit"
        >
          <a-form-item label="手机号" name="phone">
            <a-input
              v-model:value="smsForm.phone"
              size="large"
              placeholder="请输入手机号"
              :maxlength="11"
            >
              <template #prefix><mobile-outlined /></template>
            </a-input>
          </a-form-item>

          <a-form-item label="短信验证码" name="smsCode">
            <div class="sms-row">
              <a-input
                v-model:value="smsForm.smsCode"
                size="large"
                placeholder="请输入短信验证码"
                :maxlength="6"
              >
                <template #prefix><safety-outlined /></template>
              </a-input>
              <a-button
                type="primary"
                size="large"
                :disabled="counting > 0 || sending"
                :loading="sending"
                class="sms-btn"
                @click="handleSendSms"
              >
                {{ counting > 0 ? `${counting}s 后重发` : '获取验证码' }}
              </a-button>
            </div>
          </a-form-item>

          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
              class="login-btn"
            >
              登 录
            </a-button>
          </a-form-item>
        </a-form>

        <div class="login-tips">
          <info-circle-outlined />
          <span>{{ tipsText }}</span>
        </div>

        <div class="apply-entry">
          还没有经营者账号?
          <router-link to="/apply" class="apply-link">立即入驻申请</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import {
  UserOutlined,
  LockOutlined,
  SafetyOutlined,
  MobileOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { sendSmsCode } from '@/api/auth'
import type { LoginParams } from '@/types/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const logoSvg =
  'data:image/svg+xml;base64,' +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fff"/><path d="M14 30c2-8 6-13 10-13s8 5 10 13" stroke="#059669" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="24" cy="14" r="3.5" fill="#059669"/></svg>`)

const year = new Date().getFullYear()

// ===== 登录方式切换 =====
type LoginType = 'account' | 'sms'
const loginType = ref<LoginType>('account')

const tipsText = computed(() =>
  loginType.value === 'account'
    ? '演示账号: admin / 123456(超管), lijiangguo / 123456(经营者)'
    : '演示手机号: 13800138000(超管) / 13900139001(经营者), 验证码: 123456',
)

// ===== 账号密码表单 =====
const accountFormRef = ref<FormInstance>()
const accountForm = reactive({
  username: '',
  password: '',
})
const accountRules: Record<string, Rule[]> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

// ===== 手机号验证码表单 =====
const smsFormRef = ref<FormInstance>()
const smsForm = reactive({
  phone: '',
  smsCode: '',
})
const smsRules: Record<string, Rule[]> = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  smsCode: [
    { required: true, message: '请输入短信验证码', trigger: 'blur' },
    { len: 6, message: '验证码为 6 位数字', trigger: 'blur' },
  ],
}

// ===== 通用状态 =====
const loading = ref(false)
const sending = ref(false)
const counting = ref(0)
const rememberMe = ref(true)
let timer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  counting.value = 60
  timer = setInterval(() => {
    counting.value--
    if (counting.value <= 0) {
      if (timer) clearInterval(timer)
      timer = null
    }
  }, 1000)
}

// 切换登录方式时清空另一侧表单
watch(loginType, () => {
  if (loginType.value === 'account') {
    smsForm.phone = ''
    smsForm.smsCode = ''
  } else {
    accountForm.username = ''
    accountForm.password = ''
  }
  if (timer) {
    clearInterval(timer)
    timer = null
    counting.value = 0
  }
})

// ===== 发送短信验证码 =====
async function handleSendSms() {
  await smsFormRef.value?.validateFields(['phone'])
  sending.value = true
  try {
    await sendSmsCode({ phone: smsForm.phone, scene: 'login' })
    message.success('验证码已发送')
    startCountdown()
  } catch {
    // 演示/mock 环境下也启动倒计时
    startCountdown()
  } finally {
    sending.value = false
  }
}

// ===== 提交登录 =====
async function handleSubmit() {
  loading.value = true
  try {
    let params: LoginParams
    if (loginType.value === 'account') {
      params = {
        loginType: 'account',
        username: accountForm.username,
        password: accountForm.password,
      }
    } else {
      params = {
        loginType: 'sms',
        phone: smsForm.phone,
        smsCode: smsForm.smsCode,
      }
    }
    await authStore.login(params)
    await authStore.fetchUserInfo().catch(() => null)
    if (rememberMe.value && loginType.value === 'account') {
      localStorage.setItem('badminton_remember_user', accountForm.username)
    }
    message.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const remembered = localStorage.getItem('badminton_remember_user')
  if (remembered) {
    accountForm.username = remembered
  }
})
</script>

<style scoped lang="scss">
.login-page {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 左侧品牌区 */
.login-brand {
  flex: 1;
  background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -100px;
    right: -100px;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
  }
  &::after {
    content: '';
    position: absolute;
    bottom: -80px;
    left: -80px;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
  }
}
.brand-content {
  position: relative;
  z-index: 1;
}
.brand-logo {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  img {
    width: 56px;
    height: 56px;
  }
  h1 {
    font-size: 36px;
    margin: 0;
    font-weight: 700;
    letter-spacing: 2px;
  }
}
.brand-slogan {
  font-size: 18px;
  opacity: 0.9;
  margin: 0 0 40px;
}
.brand-features {
  list-style: none;
  padding: 0;
  margin: 0;
  li {
    font-size: 15px;
    line-height: 2.2;
    opacity: 0.92;
    .anticon {
      margin-right: 8px;
      color: #a7f3d0;
    }
  }
}
.brand-footer {
  position: absolute;
  bottom: 24px;
  left: 64px;
  font-size: 12px;
  opacity: 0.6;
}

/* 右侧表单区 */
.login-form-area {
  width: 460px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 40px;
}
.login-box {
  width: 100%;
  max-width: 360px;
}
.login-title {
  font-size: 26px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
  text-align: center;
}
.login-subtitle {
  color: #6b7280;
  margin: 8px 0 16px;
  font-size: 14px;
  text-align: center;
}
.login-tabs {
  margin-bottom: 8px;
  :deep(.ant-tabs-tab) {
    padding: 8px 0;
  }
}
.sms-row {
  display: flex;
  gap: 10px;
  .sms-btn {
    flex-shrink: 0;
    width: 130px;
  }
}
.form-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .forget-link {
    color: #059669;
    font-size: 13px;
  }
}
.login-btn {
  height: 44px;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 4px;
}
.login-tips {
  margin-top: 16px;
  padding: 10px 12px;
  background: #f0fdf4;
  border-radius: 6px;
  color: #047857;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.apply-entry {
  margin-top: 16px;
  text-align: center;
  font-size: 13px;
  color: #6b7280;

  .apply-link {
    color: #059669;
    font-weight: 500;
    margin-left: 4px;

    &:hover {
      text-decoration: underline;
    }
  }
}

/* 响应式: 小屏隐藏品牌区 */
@media (max-width: 768px) {
  .login-brand {
    display: none;
  }
  .login-form-area {
    width: 100%;
  }
}
</style>
