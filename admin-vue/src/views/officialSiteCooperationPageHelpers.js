import { reactive, ref } from 'vue'
import {
  createOfficialSiteCooperation,
  extractErrorMessage,
} from '@/utils/officialSiteApi'

function createOfficialSiteCooperationForm() {
  return {
    nickname: '',
    contact: '',
    direction: '',
  }
}

function normalizeOfficialSiteCooperationForm(form = {}) {
  return {
    nickname: String(form.nickname || '').trim(),
    contact: String(form.contact || '').trim(),
    direction: String(form.direction || '').trim(),
  }
}

function resetOfficialSiteCooperationForm(form) {
  form.nickname = ''
  form.contact = ''
  form.direction = ''
}

function validateOfficialSiteCooperationForm(form = {}) {
  const normalized = normalizeOfficialSiteCooperationForm(form)

  if (!normalized.nickname) {
    return { valid: false, message: '请填写称呼', normalized }
  }
  if (!normalized.contact) {
    return { valid: false, message: '请填写联系方式', normalized }
  }
  if (!normalized.direction) {
    return { valid: false, message: '请填写合作方向', normalized }
  }

  return { valid: true, message: '', normalized }
}

export function useOfficialSiteCooperationPage({ ElMessage }) {
  const submitting = ref(false)
  const pageError = ref('')
  const form = reactive(createOfficialSiteCooperationForm())

  const heroBadges = [
    '校内场景运营协同',
    '品牌曝光与活动策划',
    '履约与配送能力接入',
  ]

  const heroStats = [
    { value: '7+', label: '多端统一交付形态' },
    { value: '1 套', label: '校园商业合作主线平台' },
    { value: '24h', label: '合作申请响应目标' },
  ]

  const featureIntro =
    '燧石创想聚焦校园综合服务生态，围绕品牌曝光、履约配送、用户增长和活动运营建立长期合作机制，让商家、服务团队与平台能力形成更稳定的增长闭环。'

  const benefits = [
    '官方多渠道认证背书，快速提升品牌在校内的信任度与曝光效率。',
    '覆盖线下履约、配送协同、营销活动落地的整套支持，减少独立投入成本。',
    '提供入驻辅导、内容包装、上架节奏和活动节拍建议，帮助合作方更快起量。',
  ]

  async function submitCooperation() {
    const validation = validateOfficialSiteCooperationForm(form)
    pageError.value = ''

    if (!validation.valid) {
      ElMessage.warning(validation.message)
      return
    }

    submitting.value = true
    try {
      await createOfficialSiteCooperation(validation.normalized)
      ElMessage.success('提交成功！平台招商专员已收到您的信息。')
      resetOfficialSiteCooperationForm(form)
    } catch (error) {
      const message = extractErrorMessage(error, '提交失败')
      pageError.value = message
      ElMessage.error(message)
    } finally {
      submitting.value = false
    }
  }

  return {
    benefits,
    featureIntro,
    form,
    heroBadges,
    heroStats,
    pageError,
    submitCooperation,
    submitting,
  }
}
