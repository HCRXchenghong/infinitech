<template>
  <div>
    <el-form-item label="店铺标签">
      <el-tag
        v-for="(tag, index) in formData.tags"
        :key="`${tag}-${index}`"
        closable
        class="shop-editor-tag"
        @close="removeTag(index)"
      >
        {{ tag }}
      </el-tag>
      <el-input
        v-if="tagInputVisible"
        ref="tagInputRef"
        v-model="tagInputValue"
        size="small"
        class="shop-editor-inline-input"
        @keyup.enter="handleTagInputConfirm"
        @blur="handleTagInputConfirm"
      />
      <el-button v-else size="small" @click="showTagInput">+ 添加标签</el-button>
    </el-form-item>

    <el-form-item label="满减优惠">
      <el-tag
        v-for="(discount, index) in formData.discounts"
        :key="`${discount}-${index}`"
        closable
        type="success"
        class="shop-editor-tag"
        @close="removeDiscount(index)"
      >
        {{ discount }}
      </el-tag>
      <el-input
        v-if="discountInputVisible"
        ref="discountInputRef"
        v-model="discountInputValue"
        size="small"
        class="shop-editor-inline-input"
        placeholder="如: 25减12"
        @keyup.enter="handleDiscountInputConfirm"
        @blur="handleDiscountInputConfirm"
      />
      <el-button v-else size="small" type="success" @click="showDiscountInput">
        + 添加优惠
      </el-button>
    </el-form-item>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue';

const props = defineProps({
  formData: {
    type: Object,
    required: true,
  },
});

const tagInputVisible = ref(false);
const tagInputValue = ref('');
const tagInputRef = ref(null);

const discountInputVisible = ref(false);
const discountInputValue = ref('');
const discountInputRef = ref(null);

function showTagInput() {
  tagInputVisible.value = true;
  nextTick(() => {
    tagInputRef.value?.focus();
  });
}

function handleTagInputConfirm() {
  if (tagInputValue.value) {
    props.formData.tags.push(tagInputValue.value);
    tagInputValue.value = '';
  }
  tagInputVisible.value = false;
}

function removeTag(index) {
  props.formData.tags.splice(index, 1);
}

function showDiscountInput() {
  discountInputVisible.value = true;
  nextTick(() => {
    discountInputRef.value?.focus();
  });
}

function handleDiscountInputConfirm() {
  if (discountInputValue.value) {
    props.formData.discounts.push(discountInputValue.value);
    discountInputValue.value = '';
  }
  discountInputVisible.value = false;
}

function removeDiscount(index) {
  props.formData.discounts.splice(index, 1);
}
</script>
