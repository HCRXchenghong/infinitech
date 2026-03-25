import { API_CONFIG } from './config.js';
import {
	clearAuthSession,
	getAuthToken,
	isAuthSessionValid,
	redirectToLogin
} from './auth.js';

const PUBLIC_ENDPOINTS = new Set([
	API_CONFIG.API.LOGIN,
	API_CONFIG.API.SEND_SMS,
	'/api/health',
	'/health'
]);

function normalizeRequestPath(url) {
	const raw = String(url || '').trim();
	if (!raw) {
		return '/';
	}
	const noQuery = raw.split('?')[0];
	if (noQuery.startsWith('http://') || noQuery.startsWith('https://')) {
		try {
			const parser = noQuery.startsWith('https://')
				? noQuery.replace('https://', '')
				: noQuery.replace('http://', '');
			const slashIdx = parser.indexOf('/');
			if (slashIdx >= 0) {
				return parser.slice(slashIdx);
			}
			return '/';
		} catch (err) {
			return '/';
		}
	}
	return noQuery.startsWith('/') ? noQuery : `/${noQuery}`;
}

function isPublicEndpoint(url) {
	return PUBLIC_ENDPOINTS.has(normalizeRequestPath(url));
}

// 请求拦截器
function requestInterceptor(config) {
	const publicRequest = isPublicEndpoint(config.url);
	if (!publicRequest && !isAuthSessionValid()) {
		clearAuthSession({ keepBiometric: true });
		redirectToLogin('登录已过期，请重新登录');
		throw new Error('登录已过期，请重新登录');
	}

	const token = getAuthToken();
	const headers = { ...(config.header || {}) };
	if (token && !publicRequest) {
		headers.Authorization = `Bearer ${token}`;
	}
	headers['X-Requested-With'] = headers['X-Requested-With'] || 'XMLHttpRequest';

	return {
		...config,
		header: headers
	};
}

// 响应拦截器
function responseInterceptor(response) {
	const { statusCode, data } = response;

	if (statusCode === 401) {
		clearAuthSession({ keepBiometric: true });
		redirectToLogin(data && data.error ? data.error : '未授权，请重新登录');
		throw new Error(data && data.error ? data.error : '未授权，请重新登录');
	}

	if (statusCode === 403) {
		throw new Error(data && data.error ? data.error : '权限不足');
	}

	if (statusCode === 404) {
		throw new Error(data && data.error ? data.error : '资源不存在');
	}

	if (statusCode === 429) {
		throw new Error(data && data.error ? data.error : '操作过于频繁，请稍后重试');
	}

	if (statusCode >= 200 && statusCode < 300) {
		if (data && typeof data === 'object' && data.success === false) {
			throw new Error(data.error || data.message || '请求失败');
		}
		return data;
	}

	throw new Error((data && data.error) ? data.error : `请求失败 (${statusCode})`);
}

// 封装请求方法
export function request(options) {
	let config;
	try {
		config = requestInterceptor({
			url: API_CONFIG.BFF_BASE_URL + options.url,
			method: options.method || 'GET',
			data: options.data,
			header: options.header || {},
			timeout: options.timeout || API_CONFIG.TIMEOUT
		});
	} catch (err) {
		return Promise.reject(err);
	}

	return new Promise((resolve, reject) => {
		uni.request({
			...config,
			success: (res) => {
				try {
					const result = responseInterceptor(res);
					resolve(result);
				} catch (err) {
					reject(err);
				}
			},
			fail: (err) => {
				reject(new Error(err && err.errMsg ? err.errMsg : '网络错误'));
			}
		});
	});
}

// 快捷方法
export const http = {
	get(url, data) {
		return request({ url, method: 'GET', data });
	},
	post(url, data) {
		return request({ url, method: 'POST', data });
	},
	put(url, data) {
		return request({ url, method: 'PUT', data });
	},
	delete(url, data) {
		return request({ url, method: 'DELETE', data });
	}
};

export default http;
