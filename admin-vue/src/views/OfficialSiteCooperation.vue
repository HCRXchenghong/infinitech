<template>
  <div class="bg-white min-h-screen">
    <section class="site-screen-section site-screen-center px-6 py-12">
      <div class="max-w-5xl mx-auto w-full">
        <h2 class="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">商务合作与入驻</h2>
        <p class="text-slate-500 text-lg mb-10">打通高校商业生态，提供全方位流量与运力支持</p>

        <div class="flex flex-col md:flex-row gap-12">
          <div class="flex-1">
            <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=500&fit=crop" class="w-full h-56 object-cover rounded-lg mb-8 shadow-sm" alt="商务合作">
            <h3 class="text-2xl font-bold text-slate-900 mb-4">为什么选择入驻燧石创想平台？</h3>
            <p class="text-slate-600 leading-relaxed mb-6">
              燧石创想致力于打造烟台城市科技职业学院优质的校园综合服务圈。我们不仅拥有官方支持的合规信誉背书，也掌握真实的校内流量与长期运营能力。
            </p>
            <ul class="space-y-4 text-slate-700 font-medium">
              <li v-for="item in benefits" :key="item" class="flex items-start gap-3">
                <div class="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">✓</div>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <div class="w-full md:w-[420px]">
            <div class="biz-card p-8 border-t-4 border-t-[#1976d2] shadow-lg">
              <h3 class="text-xl font-bold text-slate-900 mb-6">提交您的合作申请</h3>
              <el-form label-position="top">
                <el-form-item label="企业/团队或个人称呼">
                  <el-input v-model="form.nickname" placeholder="例如：某某餐饮 / 张总" class="!h-10" />
                </el-form-item>
                <el-form-item label="联系方式">
                  <el-input v-model="form.contact" placeholder="请填写手机号码或微信号" class="!h-10" />
                </el-form-item>
                <el-form-item label="合作意向简述">
                  <el-input v-model="form.direction" type="textarea" :rows="4" placeholder="请简要描述合作方向或您现有的资源优势..." />
                </el-form-item>
                <el-form-item class="mt-8 mb-0">
                  <el-button type="primary" class="w-full !h-12 text-base font-bold !rounded shadow-md" :loading="submitting" @click="submit">
                    立即提交意向
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createOfficialSiteCooperation, extractErrorMessage } from '@/utils/officialSiteApi';

const submitting = ref(false);
const form = reactive({
  nickname: '',
  contact: '',
  direction: ''
});

const benefits = [
  '官方多渠道认证背书，迅速提升品牌在校内的公信力与曝光度。',
  '专属线下配送与履约协同支持，解决校园最后一公里问题。',
  '提供零门槛入驻指导流程，专业运营人员协助店铺搭建与活动策划。'
];

async function submit() {
  if (!form.nickname.trim()) {
    ElMessage.warning('请填写称呼');
    return;
  }
  if (!form.contact.trim()) {
    ElMessage.warning('请填写联系方式');
    return;
  }
  if (!form.direction.trim()) {
    ElMessage.warning('请填写合作方向');
    return;
  }

  submitting.value = true;
  try {
    await createOfficialSiteCooperation({
      nickname: form.nickname,
      contact: form.contact,
      direction: form.direction
    });
    ElMessage.success('提交成功！平台招商专员已收到您的信息。');
    form.nickname = '';
    form.contact = '';
    form.direction = '';
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '提交失败'));
  } finally {
    submitting.value = false;
  }
}
</script>
