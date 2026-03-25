<template>
	<view class="page-container">
		<view class="header">
			<text class="title">协作</text>
			<text class="subtitle">管理工具与快捷操作</text>
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view class="entry-card" @click="goDetail('/pages/work-password/work-password')">
				<view class="icon-wrap icon-lock">🔒</view>
				<view class="text-wrap">
					<text class="card-title">密码找回</text>
					<text class="card-desc">通过手机号查询并重置</text>
				</view>
				<text class="arrow">›</text>
			</view>

			<view class="entry-card" @click="goDetail('/pages/work-invite/work-invite')">
				<view class="icon-wrap icon-user">👥</view>
				<view class="text-wrap">
					<text class="card-title">用户邀请</text>
					<text class="card-desc">生成专属推广与注册链接</text>
				</view>
				<text class="arrow">›</text>
			</view>

			<view class="entry-card" @click="goDetail('/pages/work-orders/work-orders')">
				<view class="icon-wrap icon-order">📄</view>
				<view class="text-wrap">
					<text class="card-title">订单查询</text>
					<text class="card-desc">查询订单状态与配送详情</text>
				</view>
				<text class="arrow">›</text>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { THEMES } from '@/common/data.js';
import { ensureAuthenticated } from '@/utils/auth.js';

const theme = ref(THEMES.nebula);
const authed = ref(false);

onLoad(async () => {
	authed.value = await ensureAuthenticated({ verifyRemote: true });
});

onShow(async () => {
	if (!authed.value) {
		authed.value = await ensureAuthenticated({ verifyRemote: true });
	}
});

function goDetail(path) {
	uni.navigateTo({
		url: path,
		fail: () => {
			uni.showToast({
				title: '页面打开失败',
				icon: 'none'
			});
		}
	});
}
</script>

<style>
.page-container {
	height: 100vh;
	background: #f3f4f6;
	display: flex;
	flex-direction: column;
}

.header {
	padding: 120rpx 30rpx 24rpx;
	background: #ffffff;
	border-bottom-left-radius: 34rpx;
	border-bottom-right-radius: 34rpx;
	box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.05);
}

.title {
	font-size: 44rpx;
	font-weight: 700;
	color: #111827;
}

.subtitle {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #6b7280;
}

.content-scroll {
	flex: 1;
	height: 0;
	padding: 18rpx 20rpx 26rpx;
}

.entry-card {
	height: 170rpx;
	background: #ffffff;
	border-radius: 24rpx;
	padding: 0 24rpx;
	margin-bottom: 14rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 10rpx 26rpx rgba(15, 23, 42, 0.05);
}

.icon-wrap {
	width: 86rpx;
	height: 86rpx;
	border-radius: 999rpx;
	margin-right: 18rpx;
	font-size: 36rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.icon-lock {
	background: #e0e7ff;
}

.icon-user {
	background: #dcfce7;
}

.icon-order {
	background: #ffedd5;
}

.text-wrap {
	flex: 1;
	min-width: 0;
}

.card-title {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
	color: #111827;
}

.card-desc {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #6b7280;
}

.arrow {
	font-size: 46rpx;
	color: #d1d5db;
}
</style>
