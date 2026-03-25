<template>
	<view class="page-container" :style="{ background: theme.bgGradient }">
		<view class="header">
			<text class="back-btn" :style="{ color: theme.text }" @click="goBack">‹</text>
			<text class="page-title" :style="{ color: theme.text }">{{ articleTitle }}</text>
			<view class="header-gap" />
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view class="article-wrap glass-panel" :style="{ borderColor: theme.border }">
				<view v-if="loading" class="state-text" :style="{ color: theme.textSub }">加载中...</view>
				<view v-else-if="loadError" class="state-text error-text">
					<text>{{ loadError }}</text>
					<text class="retry-btn" @click="loadArticle">点击重试</text>
				</view>
				<view v-else>
					<text class="article-meta" :style="{ color: theme.textSub }">更新日期：{{ updatedDate }}</text>
					<text
						v-for="(line, idx) in articleLines"
						:key="idx"
						class="article-line"
						:style="{ color: theme.text }"
					>
						{{ line }}
					</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { THEMES } from '@/common/data.js';
import { API_CONFIG } from '@/utils/config.js';
import { http } from '@/utils/request.js';
import { ensureAuthenticated } from '@/utils/auth.js';

const theme = ref(THEMES.nebula);
const articleType = ref('agreement');
const articleContent = ref('');
const updatedDate = ref(new Date().toISOString().slice(0, 10));
const loading = ref(false);
const loadError = ref('');

const titleMap = {
	agreement: '用户协议',
	privacy: '隐私政策',
	about: '关于悦享e食'
};

const defaultContentMap = {
	agreement: [
		'欢迎使用悦享e食管理端。',
		'您需妥善保管账号和密码，不得将账号借予他人使用。',
		'您应在合法合规范围内使用平台功能，不得进行未授权的数据操作或接口调用。',
		'因违规操作造成的影响，平台有权采取限制功能、冻结账号等措施。'
	].join('\n\n'),
	privacy: [
		'我们仅在提供服务所必需的范围内处理您的账号信息与业务数据。',
		'系统会记录必要的访问日志与操作日志用于安全审计。',
		'未经授权不会向无关第三方披露您的敏感信息。',
		'如需删除或导出相关数据，请联系平台管理员处理。'
	].join('\n\n'),
	about: [
		'悦享e食管理端用于订单运营、客服协同、财务查看和系统配置。',
		'当前版本持续迭代中，欢迎在管理端提交优化建议。',
		'技术支持：平台运维团队'
	].join('\n\n')
};

const articleTitle = computed(() => {
	return titleMap[articleType.value] || titleMap.agreement;
});

const articleLines = computed(() => {
	const text = String(articleContent.value || '').trim();
	if (!text) return [];
	return text.split('\n').filter((item) => String(item || '').trim() !== '');
});

onLoad(async (options) => {
	const type = String(options?.type || '').trim().toLowerCase();
	if (type && titleMap[type]) {
		articleType.value = type;
	}
	const authed = await ensureAuthenticated({ verifyRemote: true });
	if (!authed) return;
	await loadArticle();
});

async function loadArticle() {
	if (loading.value) return;
	loading.value = true;
	loadError.value = '';

	try {
		const settings = await http.get(API_CONFIG.API.SERVICE_SETTINGS || '/api/service-settings');
		const payload = settings && typeof settings === 'object' ? settings : {};
		updatedDate.value = String(payload.updated_at || payload.updatedAt || '').trim() || updatedDate.value;

		articleContent.value = resolveContent(payload, articleType.value);
	} catch (err) {
		articleContent.value = defaultContentMap[articleType.value] || defaultContentMap.agreement;
		loadError.value = '';
	} finally {
		loading.value = false;
	}
}

function resolveContent(payload, type) {
	const candidateKeys = {
		agreement: ['user_agreement', 'user_agreement_text', 'agreement', 'terms'],
		privacy: ['privacy_policy', 'privacy_policy_text', 'privacy'],
		about: ['about', 'about_us', 'about_text']
	};
	const keys = candidateKeys[type] || candidateKeys.agreement;
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(payload, key)) {
			const text = String(payload[key] || '').trim();
			if (text) return text;
		}
	}
	return defaultContentMap[type] || defaultContentMap.agreement;
}

function goBack() {
	uni.navigateBack({ delta: 1 });
}
</script>

<style>
.page-container {
	height: 100vh;
	display: flex;
	flex-direction: column;
}

.header {
	height: 100rpx;
	padding: 0 24rpx;
	margin-top: 80rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.back-btn {
	width: 64rpx;
	height: 64rpx;
	font-size: 56rpx;
	line-height: 52rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.page-title {
	font-size: 34rpx;
	font-weight: 700;
}

.header-gap {
	width: 64rpx;
	height: 64rpx;
}

.content-scroll {
	flex: 1;
	height: 0;
	padding: 0 24rpx 24rpx;
}

.article-wrap {
	border-radius: 20rpx;
	border-width: 1px;
	border-style: solid;
	padding: 22rpx 20rpx;
}

.state-text {
	font-size: 24rpx;
	line-height: 1.6;
}

.error-text {
	color: #fca5a5;
}

.retry-btn {
	margin-top: 14rpx;
	display: block;
	color: #93c5fd;
}

.article-meta {
	font-size: 22rpx;
	margin-bottom: 16rpx;
	display: block;
}

.article-line {
	font-size: 26rpx;
	line-height: 1.72;
	display: block;
	margin-bottom: 12rpx;
}
</style>
