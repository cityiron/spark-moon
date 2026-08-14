<template>
  <div class="apply-page">
    <div class="apply-container">
      <!-- 顶部品牌 -->
      <div class="apply-header">
        <div class="brand-logo">
          <img :src="logoSvg" alt="logo" />
          <h1>羽球管家</h1>
        </div>
        <p class="brand-slogan">经营者入驻申请</p>
        <p class="brand-desc">填写公司和球馆信息, 审核通过后即可开通管理后台</p>
      </div>

      <!-- 步骤条 -->
      <a-steps :current="currentStep" class="apply-steps">
        <a-step title="公司信息" />
        <a-step title="球馆信息" />
        <a-step title="提交完成" />
      </a-steps>

      <!-- 表单区 -->
      <div class="apply-form-area">
        <!-- Step 1: 公司信息 -->
        <div v-if="currentStep === 0" class="step-pane">
          <a-form
            ref="companyFormRef"
            :model="companyForm"
            :rules="companyRules"
            layout="vertical"
          >
            <a-form-item label="公司名称" name="companyName">
              <a-input
                v-model:value="companyForm.companyName"
                placeholder="请输入公司全称"
                :maxlength="100"
              />
            </a-form-item>

            <a-form-item label="营业执照编号" name="licenseNo">
              <a-input
                v-model:value="companyForm.licenseNo"
                placeholder="请输入统一社会信用代码"
                :maxlength="50"
              />
            </a-form-item>

            <a-form-item label="营业执照照片" name="licenseImage">
              <a-upload
                :before-upload="handleLicenseUpload"
                :max-count="1"
                accept="image/*"
              >
                <a-button>
                  <upload-outlined />
                  上传营业执照
                </a-button>
              </a-upload>
              <div v-if="companyForm.licenseImage" class="upload-tip">
                已上传, 可继续重新上传替换
              </div>
              <div v-else class="upload-tip">支持 jpg/png, 最大 5MB</div>
            </a-form-item>

            <a-form-item label="联系人姓名" name="contactName">
              <a-input
                v-model:value="companyForm.contactName"
                placeholder="请输入联系人姓名"
                :maxlength="50"
              />
            </a-form-item>

            <a-form-item label="联系电话" name="contactPhone">
              <a-input
                v-model:value="companyForm.contactPhone"
                placeholder="请输入手机号"
                :maxlength="11"
              />
            </a-form-item>

            <div class="step-actions">
              <a-button @click="goLogin">返回登录</a-button>
              <a-button type="primary" @click="goStep2">下一步</a-button>
            </div>
          </a-form>
        </div>

        <!-- Step 2: 球馆信息 -->
        <div v-else-if="currentStep === 1" class="step-pane">
          <a-form
            ref="venueFormRef"
            :model="venueForm"
            :rules="venueRules"
            layout="vertical"
          >
            <a-alert type="info" show-icon style="margin-bottom: 16px">
              <template #message>
                入驻后您可在管理后台继续添加更多球馆, 此处只需录入首个球馆信息
              </template>
            </a-alert>

            <a-form-item label="球馆名称" name="venueName">
              <a-input
                v-model:value="venueForm.venueName"
                placeholder="请输入球馆名称"
                :maxlength="100"
              />
            </a-form-item>

            <a-form-item label="球馆地址" name="venueAddress">
              <a-input
                v-model:value="venueForm.venueAddress"
                placeholder="请输入球馆详细地址"
                :maxlength="255"
              />
            </a-form-item>

            <a-form-item label="场地数量" name="venueCourtCount">
              <a-input-number
                v-model:value="venueForm.venueCourtCount"
                :min="1"
                :max="100"
                style="width: 100%"
                placeholder="请输入场地数量"
              />
            </a-form-item>

            <a-form-item label="营业时间" name="businessHours">
              <a-time-picker
                v-model:value="venueForm.openTime"
                format="HH:mm"
                placeholder="开始时间"
                style="width: 45%"
              />
              <span style="margin: 0 8px">至</span>
              <a-time-picker
                v-model:value="venueForm.closeTime"
                format="HH:mm"
                placeholder="结束时间"
                style="width: 45%"
              />
            </a-form-item>

            <div class="step-actions">
              <a-button @click="currentStep = 0">上一步</a-button>
              <a-button
                type="primary"
                :loading="submitting"
                @click="handleSubmit"
              >
                提交申请
              </a-button>
            </div>
          </a-form>
        </div>

        <!-- Step 3: 提交完成 -->
        <div v-else class="step-pane success-pane">
          <div class="success-icon">
            <check-circle-filled />
          </div>
          <h2>申请已提交</h2>
          <p class="success-desc">
            您的入驻申请已成功提交, 申请编号: <b>{{ applyNo }}</b>
          </p>
          <p class="success-desc">
            我们会在 1-3 个工作日内完成审核, 审核结果会通过短信通知您 ({{ companyForm.contactPhone }})。
          </p>
          <p class="success-desc">
            审核通过后, 系统将自动创建您的经营者账号, 届时可用联系人手机号登录管理后台。
          </p>
          <div class="step-actions">
            <a-button type="primary" @click="goLogin">返回登录</a-button>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="apply-footer">
        © {{ year }} 羽球管家 Badminton Venue Admin · 经营者入驻
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message, type FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import dayjs from 'dayjs'
import { UploadOutlined, CheckCircleFilled } from '@ant-design/icons-vue'
import { submitApplication } from '@/api/operator'

defineOptions({ name: 'OperatorApply' })

const router = useRouter()
const year = new Date().getFullYear()

const logoSvg =
  'data:image/svg+xml;base64,' +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fff"/><path d="M14 30c2-8 6-13 10-13s8 5 10 13" stroke="#059669" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="24" cy="14" r="3.5" fill="#059669"/></svg>`)

// ===== 步骤控制 =====
const currentStep = ref(0)
const submitting = ref(false)
const applyNo = ref('')

// ===== Step 1: 公司信息 =====
const companyFormRef = ref<FormInstance>()
const companyForm = reactive({
  companyName: '',
  licenseNo: '',
  licenseImage: '',
  contactName: '',
  contactPhone: '',
})

const companyRules: Record<string, Rule[]> = {
  companyName: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
  licenseNo: [
    { required: true, message: '请输入营业执照编号', trigger: 'blur' },
    { pattern: /^[A-Z0-9]{15,18}$/, message: '请输入正确的统一社会信用代码', trigger: 'blur' },
  ],
  contactName: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
  contactPhone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
}

// 营业执照上传: mock 不真实上传, 仅返回文件名
function handleLicenseUpload(file: File) {
  companyForm.licenseImage = `mock://license/${file.name}`
  message.success('上传成功')
  return false
}

async function goStep2() {
  await companyFormRef.value?.validate()
  currentStep.value = 1
}

// ===== Step 2: 球馆信息 =====
const venueFormRef = ref<FormInstance>()
const venueForm = reactive({
  venueName: '',
  venueAddress: '',
  venueCourtCount: 6,
  openTime: dayjs('08:00', 'HH:mm'),
  closeTime: dayjs('22:00', 'HH:mm'),
})

const venueRules: Record<string, Rule[]> = {
  venueName: [{ required: true, message: '请输入球馆名称', trigger: 'blur' }],
  venueAddress: [{ required: true, message: '请输入球馆地址', trigger: 'blur' }],
  venueCourtCount: [{ required: true, message: '请输入场地数量', trigger: 'blur' }],
}

// ===== 提交申请 =====
async function handleSubmit() {
  await venueFormRef.value?.validate()

  submitting.value = true
  try {
    await submitApplication({
      companyName: companyForm.companyName,
      licenseNo: companyForm.licenseNo,
      licenseImage: companyForm.licenseImage || undefined,
      contactName: companyForm.contactName,
      contactPhone: companyForm.contactPhone,
      venueName: venueForm.venueName,
      venueAddress: venueForm.venueAddress,
      venueCourtCount: venueForm.venueCourtCount,
      venueOpenTime: venueForm.openTime.format('HH:mm'),
      venueCloseTime: venueForm.closeTime.format('HH:mm'),
    })
    // 生成申请编号 (mock)
    applyNo.value = `OPS${Date.now().toString().slice(-8)}`
    currentStep.value = 2
    message.success('申请提交成功')
  } catch {
    // 错误已由拦截器提示 (如营业执照编号重复)
  } finally {
    submitting.value = false
  }
}

function goLogin() {
  router.push('/login')
}
</script>

<style scoped lang="scss">
.apply-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.apply-container {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.apply-header {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  padding: 32px 40px 24px;
  text-align: center;
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
  img {
    width: 40px;
    height: 40px;
  }
  h1 {
    font-size: 24px;
    margin: 0;
    font-weight: 700;
    color: #047857;
    letter-spacing: 1px;
  }
}

.brand-slogan {
  font-size: 16px;
  font-weight: 500;
  color: #059669;
  margin: 0 0 4px;
}

.brand-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.apply-steps {
  padding: 24px 40px 0;
}

.apply-form-area {
  padding: 24px 40px 32px;
}

.step-pane {
  min-height: 280px;
}

.upload-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}

.success-pane {
  text-align: center;
  padding: 40px 0;

  .success-icon {
    font-size: 64px;
    color: #16a34a;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 20px;
    color: #1f2937;
    margin: 0 0 12px;
  }

  .success-desc {
    color: #6b7280;
    font-size: 14px;
    line-height: 1.8;
    margin: 0;
  }

  .step-actions {
    justify-content: center;
    margin-top: 32px;
  }
}

.apply-footer {
  padding: 16px 40px;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  border-top: 1px solid #f1f5f9;
}
</style>
