<template>
  <el-dialog
    :model-value="visible"
    :title="getDiningBuddyRestrictionDialogTitle(restrictionForm)"
    width="560px"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form label-width="110px">
      <el-form-item label="目标用户 ID">
        <el-input v-model="restrictionForm.target_user_id" placeholder="支持数据库 ID / UID / TSID" />
      </el-form-item>
      <el-form-item label="限制类型">
        <el-select v-model="restrictionForm.restriction_type" style="width: 100%;">
          <el-option
            v-for="option in restrictionTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="限制原因">
        <el-input v-model="restrictionForm.reason" />
      </el-form-item>
      <el-form-item label="补充说明">
        <el-input v-model="restrictionForm.note" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="到期时间">
        <el-date-picker
          v-model="restrictionForm.expires_at"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss[Z]"
          placeholder="留空表示长期有效"
          style="width: 100%;"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="restrictionSaving" @click="saveRestriction">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  restrictionForm: {
    type: Object,
    required: true,
  },
  restrictionTypeOptions: {
    type: Array,
    default: () => [],
  },
  restrictionSaving: {
    type: Boolean,
    default: false,
  },
  getDiningBuddyRestrictionDialogTitle: {
    type: Function,
    required: true,
  },
  saveRestriction: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
</script>
