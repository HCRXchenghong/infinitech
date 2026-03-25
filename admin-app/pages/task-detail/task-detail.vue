<template>
	<view class="page-container" :style="{ background: theme.bgGradient }">
		<view class="nav-bar glass-nav">
			<text class="back-btn" :style="{ color: theme.text }" @click="goBack">←</text>
			<text class="title" :style="{ color: theme.text }">任务详情</text>
			<text class="more" :style="{ color: theme.text }">···</text>
		</view>

		<view class="content">
			<view class="card glass-panel">
				<view class="tags">
					<text class="tag red">P0 紧急</text>
					<text class="tag blue">进行中</text>
				</view>
				<text class="task-title" :style="{ color: theme.text }">Q4 品牌升级战略书</text>
				<text class="desc" :style="{ color: theme.textSub }">根据董事会要求，针对Q4季度的高端市场进行品牌定位升级。包含视觉识别系统(VI)更新和核心传播话术(Key Message)的制定。</text>
			</view>

			<view class="card glass-panel info-list">
				<view class="row">
					<text class="label" :style="{ color: theme.textSub }">截止日期</text>
					<text class="val" :style="{ color: theme.text }">Today</text>
				</view>
				<view class="row">
					<text class="label" :style="{ color: theme.textSub }">负责人</text>
					<text class="val" :style="{ color: theme.text }">Sarah</text>
				</view>
				<view class="row">
					<text class="label" :style="{ color: theme.textSub }">当前进度</text>
					<text class="val" :style="{ color: theme.accent }">100%</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { THEMES } from '@/common/data.js';

const theme = ref(THEMES.nebula);
const goBack = () => uni.navigateBack();
</script>

<style>
.page-container {
	height: 100vh;
	display: flex;
	flex-direction: column;
}
.nav-bar {
	height: 160rpx;
	padding-top: 60rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 60rpx 30rpx 0;
}
.back-btn { font-size: 50rpx; }
.title { font-size: 36rpx; font-weight: bold; }
.more { font-size: 50rpx; line-height: 0.5; }

.content {
	padding: 40rpx;
	display: flex;
	flex-direction: column;
	gap: 40rpx;
}
.card {
	padding: 40rpx;
}
.tags {
	display: flex;
	gap: 20rpx;
	margin-bottom: 30rpx;
}
.tag {
	font-size: 20rpx;
	padding: 6rpx 16rpx;
	border-radius: 10rpx;
	font-weight: bold;
}
.red { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

.task-title {
	font-size: 40rpx;
	font-weight: bold;
	margin-bottom: 20rpx;
	display: block;
}
.desc {
	font-size: 28rpx;
	line-height: 1.6;
}
.info-list {
	display: flex;
	flex-direction: column;
	gap: 30rpx;
}
.row {
	display: flex;
	justify-content: space-between;
}
.label { font-size: 28rpx; }
.val { font-weight: bold; font-size: 28rpx; }
</style>
