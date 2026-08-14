<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import { theme } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

// 品牌主题色 #059669 (emerald green)
const themeConfig = {
  token: {
    colorPrimary: '#059669',
    borderRadius: 6,
    fontSize: 14,
  },
  algorithm: theme.defaultAlgorithm,
}
</script>
