<template>
  <el-card shadow="never" v-loading="runtimeLoading">
    <template #header>
      <div class="card-title-row">
        <span>前台运行配置</span>
        <el-button type="primary" :loading="runtimeSaving" @click="saveRuntimeSettings">保存运行配置</el-button>
      </div>
    </template>

    <el-form label-width="140px">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-form-item label="总开关">
            <el-switch v-model="runtimeForm.enabled" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="日发布上限">
            <el-input-number v-model="runtimeForm.publish_limit_per_day" :min="1" :max="20" style="width: 100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="分钟发言限流">
            <el-input-number v-model="runtimeForm.message_rate_limit_per_minute" :min="1" :max="120" style="width: 100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="自动关组时长">
            <el-input-number v-model="runtimeForm.auto_close_expired_hours" :min="1" :max="168" style="width: 100%;" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="欢迎标题">
            <el-input v-model="runtimeForm.welcome_title" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="欢迎副标题">
            <el-input v-model="runtimeForm.welcome_subtitle" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="默认人数上限">
            <el-input-number v-model="runtimeForm.default_max_people" :min="2" :max="20" style="width: 100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最大人数上限">
            <el-input-number v-model="runtimeForm.max_max_people" :min="2" :max="20" style="width: 100%;" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <el-divider>分类配置</el-divider>
    <div v-for="category in sortedRuntimeCategories" :key="category.id" class="runtime-block">
      <el-row :gutter="12">
        <el-col :span="4">
          <el-form-item label="分类 ID">
            <el-input :model-value="category.id" disabled />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item label="名称">
            <el-input v-model="category.label" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item label="图标">
            <el-input v-model="category.icon" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="颜色">
            <el-input v-model="category.color" />
          </el-form-item>
        </el-col>
        <el-col :span="3">
          <el-form-item label="排序">
            <el-input-number v-model="category.sort_order" :min="0" :step="10" style="width: 100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="3">
          <el-form-item label="启用">
            <el-switch v-model="category.enabled" />
          </el-form-item>
        </el-col>
      </el-row>
    </div>

    <el-divider>欢迎问卷</el-divider>
    <div v-for="(question, index) in runtimeForm.questions" :key="question.localKey" class="runtime-block">
      <div class="block-toolbar">
        <strong>问题 {{ index + 1 }}</strong>
        <el-button size="small" text type="danger" @click="removeQuestion(index)">删除</el-button>
      </div>
      <el-form-item label="题干">
        <el-input v-model="question.question" />
      </el-form-item>
      <div v-for="(option, optionIndex) in question.options" :key="option.localKey" class="option-row">
        <el-input v-model="option.text" placeholder="选项文案" />
        <el-input v-model="option.icon" placeholder="图标/emoji" />
        <el-button text type="danger" @click="removeQuestionOption(index, optionIndex)">删除</el-button>
      </div>
      <el-button size="small" @click="addQuestionOption(index)">新增选项</el-button>
    </div>
    <el-button size="small" @click="addQuestion">新增问卷题目</el-button>
  </el-card>
</template>

<script setup>
defineProps({
  runtimeLoading: {
    type: Boolean,
    default: false,
  },
  runtimeSaving: {
    type: Boolean,
    default: false,
  },
  runtimeForm: {
    type: Object,
    required: true,
  },
  sortedRuntimeCategories: {
    type: Array,
    default: () => [],
  },
  saveRuntimeSettings: {
    type: Function,
    required: true,
  },
  addQuestion: {
    type: Function,
    required: true,
  },
  removeQuestion: {
    type: Function,
    required: true,
  },
  addQuestionOption: {
    type: Function,
    required: true,
  },
  removeQuestionOption: {
    type: Function,
    required: true,
  },
})
</script>
