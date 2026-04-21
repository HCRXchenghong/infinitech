<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="760px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="form" label-width="110px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="对象类型">
            <el-select v-model="form.objectType" style="width: 100%" @change="handleObjectTypeChange">
              <el-option label="商户" value="shop" />
              <el-option label="商品" value="product" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="目标位次">
            <el-input-number v-model="form.slotPosition" :min="1" :max="99" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="投放对象">
        <el-select
          v-model="form.targetId"
          filterable
          clearable
          style="width: 100%"
          placeholder="请选择投放对象"
        >
          <el-option
            v-for="item in targetOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="城市">
            <el-input v-model.trim="form.city" placeholder="留空表示全局" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="业务分类">
            <el-input v-model.trim="form.businessCategory" placeholder="留空表示全部分类" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="投放状态">
            <el-select v-model="form.status" style="width: 100%">
              <el-option label="草稿" value="draft" />
              <el-option label="已审核" value="approved" />
              <el-option label="已暂停" value="paused" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="推广标识">
            <el-input v-model.trim="form.promoteLabel" placeholder="默认显示“推广”" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="开始时间">
            <el-date-picker
              v-model="form.startAt"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结束时间">
            <el-date-picker
              v-model="form.endAt"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="合同编号">
            <el-input v-model.trim="form.contractNo" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="客服记录号">
            <el-input v-model.trim="form.serviceRecordNo" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="锁定位次">
        <el-switch v-model="form.isPositionLocked" />
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model.trim="form.remark" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  dialogTitle: {
    type: String,
    default: '',
  },
  form: {
    type: Object,
    required: true,
  },
  targetOptions: {
    type: Array,
    default: () => [],
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  handleObjectTypeChange: {
    type: Function,
    required: true,
  },
  submitForm: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>
