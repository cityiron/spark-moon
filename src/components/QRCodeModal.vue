<template>
  <a-modal
    :open="open"
    :title="title"
    :width="360"
    :footer="null"
    @update:open="(v: boolean) => emit('update:open', v)"
  >
    <div class="qrcode-wrap">
      <div class="qrcode-box">
        <img v-if="qrUrl" :src="qrDataUrl" :alt="title" class="qrcode-img" />
        <div v-else class="qrcode-placeholder">
          <loading-outlined v-if="loading" />
          <qrcode-outlined v-else />
        </div>
      </div>
      <p class="qrcode-tip">{{ tip }}</p>
      <a-button v-if="qrUrl" type="primary" block @click="handleDownload">
        <download-outlined />
        下载二维码
      </a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { LoadingOutlined, QrcodeOutlined, DownloadOutlined } from '@ant-design/icons-vue'

interface Props {
  open: boolean
  /** 二维码内容 URL */
  qrUrl?: string
  title?: string
  tip?: string
}

const props = withDefaults(defineProps<Props>(), {
  qrUrl: '',
  title: '二维码',
  tip: '请使用手机扫码',
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const loading = ref(false)
const qrDataUrl = ref('')

// 使用在线 API 生成二维码图片(纯前端兜底方案, 无需额外依赖)
async function generateQrCode(url: string) {
  if (!url) {
    qrDataUrl.value = ''
    return
  }
  loading.value = true
  try {
    // 使用 chart.googleapis 公开接口生成 PNG 二维码
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      url,
    )}`
    qrDataUrl.value = src
  } finally {
    loading.value = false
  }
}

watch(
  () => props.qrUrl,
  (url) => generateQrCode(url),
  { immediate: true },
)

function handleDownload() {
  if (!qrDataUrl.value) return
  const a = document.createElement('a')
  a.href = qrDataUrl.value
  a.download = `${props.title}.png`
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  message.success('已开始下载')
}
</script>

<style scoped lang="scss">
.qrcode-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 16px;
  gap: 16px;
}
.qrcode-box {
  width: 240px;
  height: 240px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #fff;
  .qrcode-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .qrcode-placeholder {
    font-size: 48px;
    color: #d9d9d9;
  }
}
.qrcode-tip {
  color: #666;
  font-size: 14px;
  margin: 0;
}
</style>
