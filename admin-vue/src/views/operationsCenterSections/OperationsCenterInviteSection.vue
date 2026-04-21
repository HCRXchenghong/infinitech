<template>
  <div>
    <div class="operations-center-subsection">
      <div class="operations-center-subtitle">邀请码</div>
      <el-table :data="inviteCodes" size="small" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="user_id" label="用户ID" width="140" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column prop="code" label="邀请码" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <template #empty>
          <el-empty
            :description="loadError ? '加载失败，暂无可显示数据' : '暂无邀请码数据'"
            :image-size="90"
          />
        </template>
      </el-table>
    </div>

    <div class="operations-center-subsection">
      <div class="operations-center-subtitle">邀请记录</div>
      <el-table :data="inviteRecords" size="small" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="inviter_user_id" label="邀请人ID" width="140" />
        <el-table-column prop="inviter_phone" label="邀请人手机号" width="140" />
        <el-table-column prop="invite_code" label="邀请码" width="120" />
        <el-table-column prop="invitee_user_id" label="被邀请人ID" width="140" />
        <el-table-column prop="invitee_phone" label="被邀请人手机号" width="140" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="reward_points" label="奖励积分" width="100" />
        <el-table-column prop="created_at" label="时间" width="160" />
        <template #empty>
          <el-empty
            :description="loadError ? '加载失败，暂无可显示数据' : '暂无邀请记录数据'"
            :image-size="90"
          />
        </template>
      </el-table>
    </div>
  </div>
</template>

<script setup>
defineProps({
  inviteCodes: {
    type: Array,
    default: () => [],
  },
  inviteRecords: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadError: {
    type: String,
    default: '',
  },
});
</script>
