<script>
	export default {
		onLaunch: function() {
		},
		onShow: function() {
		},
		onHide: function() {
		}
	}
</script>

<style>
	:root {
		--app-bg: #f3f4f6;
		--app-text: #111827;
		--app-text-sub: #6b7280;
		--app-panel: #ffffff;
		--app-nav: #ffffff;
		--app-border: #e5e7eb;
		--app-accent: #2563eb;
		--app-accent-text: #ffffff;
		--app-radius: 24rpx;
	}

	page {
		background-color: var(--app-bg);
		color: var(--app-text);
		font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
		height: 100%;
	}

	view,
	text,
	image,
	input,
	button,
	scroll-view,
	textarea {
		box-sizing: border-box;
	}

	.glass-panel {
		background: var(--app-panel);
		border: 1px solid var(--app-border);
		border-radius: var(--app-radius);
		box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.06);
	}

	.glass-nav {
		background: var(--app-nav);
		border-top: 1px solid var(--app-border);
	}

	.fade-enter {
		animation: fadeIn 0.24s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10rpx);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
