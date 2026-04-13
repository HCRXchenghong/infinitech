const SEO_MANAGED_ATTR = 'data-official-site-seo';
const DEFAULT_SITE_NAME = '悦享e食';
const DEFAULT_SITE_TITLE = '悦享e食 | 烟台城市科技职业学院官方支持平台';
const DEFAULT_SITE_DESCRIPTION = '悦享e食是烟台城市科技职业学院官方支持平台，由燧石创想工作室提供技术驱动，联合烟台英菲尼信息科技有限公司与泓策融鑫科贸（烟台）有限公司服务校园曝光维权、新闻资讯、商务合作入驻与校园生态治理。';
const DEFAULT_ROBOTS = 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1';
const DEFAULT_IMAGE_PATH = '/logo.png';
const DEFAULT_KEYWORDS = [
  '悦享e食',
  '烟台城市科技职业学院',
  '官方支持平台',
  '校园生态服务',
  '校园曝光维权',
  '新闻资讯',
  '商务合作入驻',
  '燧石创想工作室',
  '烟台英菲尼信息科技有限公司',
  '泓策融鑫科贸（烟台）有限公司',
  '万蕾',
  '魏可信'
];

const ROUTE_SEO_MAP = {
  'site-home': {
    title: '悦享e食 | 烟台城市科技职业学院官方支持平台与校园生态服务入口',
    description: '悦享e食官网聚合烟台城市科技职业学院校园曝光维权、新闻资讯、商务合作入驻与校园生态服务能力，由燧石创想工作室提供技术驱动，联合烟台英菲尼信息科技有限公司与泓策融鑫科贸（烟台）有限公司共建。',
    keywords: [
      '校园曝光维权',
      '校园新闻资讯',
      '校园生态治理',
      '高校商务合作',
      '校园服务平台'
    ],
    path: '/'
  },
  'site-news': {
    title: '新闻资讯 | 悦享e食官方支持平台',
    description: '浏览悦享e食官方支持平台发布的校园新闻资讯、系统动态、官方公告与服务通知，掌握烟台城市科技职业学院校园生态服务的最新进展。',
    keywords: [
      '新闻资讯',
      '官方公告',
      '校园资讯',
      '系统动态'
    ],
    path: '/news'
  },
  'site-news-detail': {
    title: '新闻详情 | 悦享e食官方支持平台',
    description: '查看悦享e食官方支持平台的新闻详情、系统更新与校园资讯内容。',
    keywords: [
      '新闻详情',
      '校园资讯',
      '官方支持平台'
    ]
  },
  'site-download': {
    title: '平台下载 | 悦享e食官方支持平台',
    description: '进入悦享e食平台下载页，获取安卓与 iOS 客户端下载地址，并查看官网管理端发布的小程序二维码入口。',
    keywords: [
      '平台下载',
      '客户端下载',
      '小程序二维码',
      '安卓下载',
      'iOS 下载'
    ],
    path: '/download'
  },
  'site-about': {
    title: '关于我们 | 悦享e食官方支持平台',
    description: '了解悦享e食官方支持平台、燧石创想工作室、创始人万蕾与魏可信，以及联合运营主体共同推动校园生态服务数字化建设的背景。',
    keywords: [
      '关于我们',
      '燧石创想工作室',
      '万蕾',
      '魏可信',
      '联合运营主体'
    ],
    path: '/about'
  },
  'site-expose': {
    title: '校园维权曝光板 | 悦享e食官方支持平台',
    description: '悦享e食校园维权曝光板提供面向烟台城市科技职业学院师生的曝光维权、进度跟踪与平台审核协助能力，帮助建设透明可靠的校园商业生态。',
    keywords: [
      '校园维权',
      '曝光店铺',
      '曝光维权',
      '校园治理'
    ],
    path: '/expose'
  },
  'site-expose-submit': {
    title: '提交曝光 | 悦享e食校园维权曝光板',
    description: '通过悦享e食校园维权曝光板提交曝光材料、维权诉求与证据图片，平台专员将进行审核和跟进。',
    keywords: [
      '提交曝光',
      '维权曝光',
      '校园投诉'
    ],
    path: '/expose/submit',
    robots: 'noindex,nofollow'
  },
  'site-expose-detail': {
    title: '曝光详情 | 悦享e食校园维权曝光板',
    description: '查看悦享e食校园维权曝光板的曝光详情、处理状态与平台跟进进度。',
    keywords: [
      '曝光详情',
      '处理进度',
      '校园维权'
    ]
  },
  'site-coop': {
    title: '商务合作与入驻 | 悦享e食官方支持平台',
    description: '悦享e食提供面向烟台城市科技职业学院的商务合作、品牌入驻、校内流量扶持与履约协同服务，帮助优质商户高效连接校园市场。',
    keywords: [
      '商务合作',
      '品牌入驻',
      '商户合作',
      '高校流量'
    ],
    path: '/coop'
  },
  'site-privacy-policy': {
    title: '隐私政策 | 悦享e食官网',
    description: '查看悦享e食官网隐私政策，了解官网在新闻浏览、曝光提交、商务合作申请与在线客服场景中的 Cookie 和信息处理规则。',
    keywords: [
      '隐私政策',
      'Cookie 说明',
      '信息处理规则'
    ],
    path: '/privacy-policy'
  },
  'site-disclaimer': {
    title: '免责声明 | 悦享e食官网',
    description: '查看悦享e食官网免责声明与服务说明，了解官网公开信息展示、曝光提交、合作申请与在线客服等服务的边界和规则。',
    keywords: [
      '免责声明',
      '服务说明',
      '官网规则'
    ],
    path: '/disclaimer'
  },
  'site-cookie-required': {
    title: 'Cookie 说明 | 悦享e食官网',
    description: '查看悦享e食官网 Cookie 使用说明与隐私提示。',
    keywords: [
      'Cookie 说明',
      '隐私提示'
    ],
    path: '/cookie-required',
    robots: 'noindex,nofollow'
  }
};

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniqueKeywords(values = []) {
  const dedup = new Set();
  const result = [];
  values.forEach((item) => {
    const keyword = normalizeText(item);
    if (!keyword) return;
    const dedupKey = keyword.toLowerCase();
    if (dedup.has(dedupKey)) return;
    dedup.add(dedupKey);
    result.push(keyword);
  });
  return result;
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function getEnvSiteOrigin() {
  if (typeof window !== 'undefined') {
    const config = window.__INFINITECH_RUNTIME_CONFIG__;
    const siteOrigin = normalizeText(config?.siteOrigin);
    if (siteOrigin) {
      return siteOrigin;
    }
  }
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return '';
  }
  return normalizeText(import.meta.env.VITE_PUBLIC_SITE_ORIGIN);
}

export function resolveOfficialSiteOrigin() {
  const envOrigin = getEnvSiteOrigin();
  if (envOrigin) {
    return envOrigin.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return String(window.location.origin).replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:1888';
}

export function buildOfficialSiteUrl(pathname = '/') {
  const path = String(pathname || '/').startsWith('/')
    ? String(pathname || '/')
    : `/${String(pathname || '')}`;
  return new URL(path, `${resolveOfficialSiteOrigin()}/`).toString();
}

function resolveSeoImage(imagePath) {
  const image = normalizeText(imagePath);
  if (!image) {
    return buildOfficialSiteUrl(DEFAULT_IMAGE_PATH);
  }
  return isAbsoluteUrl(image) ? image : buildOfficialSiteUrl(image);
}

function ensureMetaTag(identity) {
  const selector = identity.name
    ? `meta[name="${identity.name}"]`
    : `meta[property="${identity.property}"]`;
  let element = document.head.querySelector(selector);
  if (!(element instanceof HTMLMetaElement)) {
    element = document.createElement('meta');
    if (identity.name) {
      element.setAttribute('name', identity.name);
    }
    if (identity.property) {
      element.setAttribute('property', identity.property);
    }
    document.head.appendChild(element);
  }
  element.setAttribute(SEO_MANAGED_ATTR, 'true');
  return element;
}

function ensureLinkTag(rel) {
  const selector = `link[rel="${rel}"]`;
  let element = document.head.querySelector(selector);
  if (!(element instanceof HTMLLinkElement)) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute(SEO_MANAGED_ATTR, 'true');
  return element;
}

function setMetaContent(identity, content) {
  const normalized = normalizeText(content);
  if (!normalized) {
    return;
  }
  ensureMetaTag(identity).setAttribute('content', normalized);
}

function setLinkHref(rel, href) {
  const normalized = normalizeText(href);
  if (!normalized) {
    return;
  }
  ensureLinkTag(rel).setAttribute('href', normalized);
}

function removeManagedTags() {
  if (typeof document === 'undefined') {
    return;
  }
  document.head
    .querySelectorAll(`[${SEO_MANAGED_ATTR}="true"]`)
    .forEach((element) => element.remove());
}

export function clearOfficialSiteSeo() {
  removeManagedTags();
}

export function getOfficialSiteOrganizationId() {
  return `${resolveOfficialSiteOrigin()}/#organization`;
}

export function getOfficialSiteWebsiteId() {
  return `${resolveOfficialSiteOrigin()}/#website`;
}

export function createOfficialSiteOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': getOfficialSiteOrganizationId(),
    name: '悦享e食官方支持平台',
    alternateName: [
      '烟台城市科技职业学院官方支持平台',
      '燧石创想工作室'
    ],
    url: buildOfficialSiteUrl('/'),
    logo: resolveSeoImage(DEFAULT_IMAGE_PATH),
    description: DEFAULT_SITE_DESCRIPTION,
    founder: [
      {
        '@type': 'Person',
        name: '万蕾',
        jobTitle: '创始人 / 高级工程师'
      },
      {
        '@type': 'Person',
        name: '魏可信',
        jobTitle: '创始人 / 新领人才'
      }
    ],
    subOrganization: [
      {
        '@type': 'Organization',
        name: '烟台英菲尼信息科技有限公司',
        description: '负责平台整体合规化运营、走账审核与资金流转。'
      },
      {
        '@type': 'Organization',
        name: '泓策融鑫科贸（烟台）有限公司',
        description: '负责线下资源整合、系统技术支持与运力调度。'
      },
      {
        '@type': 'Organization',
        name: '燧石创想工作室',
        description: '悦享e食官方支持平台的核心技术团队与体验驱动力。'
      }
    ],
    knowsAbout: DEFAULT_KEYWORDS
  };
}

export function createOfficialSiteWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': getOfficialSiteWebsiteId(),
    url: buildOfficialSiteUrl('/'),
    name: DEFAULT_SITE_NAME,
    alternateName: '烟台城市科技职业学院官方支持平台',
    description: DEFAULT_SITE_DESCRIPTION,
    inLanguage: 'zh-CN',
    publisher: {
      '@id': getOfficialSiteOrganizationId()
    }
  };
}

export function createOfficialSiteWebPageJsonLd({ name, description, path = '/', type = 'WebPage' }) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${buildOfficialSiteUrl(path)}#webpage`,
    url: buildOfficialSiteUrl(path),
    name: normalizeText(name) || DEFAULT_SITE_TITLE,
    description: normalizeText(description) || DEFAULT_SITE_DESCRIPTION,
    inLanguage: 'zh-CN',
    isPartOf: {
      '@id': getOfficialSiteWebsiteId()
    },
    about: {
      '@id': getOfficialSiteOrganizationId()
    }
  };
}

export function createOfficialSiteBreadcrumbJsonLd(items = []) {
  const itemListElement = items
    .map((item, index) => {
      const name = normalizeText(item?.name);
      const path = normalizeText(item?.path || '/');
      if (!name) {
        return null;
      }
      return {
        '@type': 'ListItem',
        position: index + 1,
        name,
        item: buildOfficialSiteUrl(path || '/')
      };
    })
    .filter(Boolean);

  if (itemListElement.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement
  };
}

export function toIsoDateString(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString();
}

export function resolveOfficialSiteSeoConfig(route) {
  const baseConfig = ROUTE_SEO_MAP[route?.name] || {
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    path: route?.path || '/'
  };
  const path = normalizeText(route?.fullPath || baseConfig.path || route?.path || '/');
  const title = normalizeText(baseConfig.title) || DEFAULT_SITE_TITLE;
  const description = normalizeText(baseConfig.description) || DEFAULT_SITE_DESCRIPTION;

  return {
    ...baseConfig,
    title,
    description,
    path,
    keywords: uniqueKeywords([...(baseConfig.keywords || []), ...DEFAULT_KEYWORDS]),
    jsonLd: [
      createOfficialSiteWebsiteJsonLd(),
      createOfficialSiteOrganizationJsonLd(),
      createOfficialSiteWebPageJsonLd({
        name: title,
        description,
        path,
        type: route?.name === 'site-about' ? 'AboutPage' : 'WebPage'
      }),
      createOfficialSiteBreadcrumbJsonLd([
        { name: '首页', path: '/' },
        route?.name === 'site-home'
          ? null
          : { name: normalizeText(route?.meta?.title || title), path }
      ].filter(Boolean))
    ].filter(Boolean)
  };
}

export function applyOfficialSiteSeo(config = {}) {
  if (typeof document === 'undefined') {
    return;
  }

  const title = normalizeText(config.title) || DEFAULT_SITE_TITLE;
  const description = normalizeText(config.description) || DEFAULT_SITE_DESCRIPTION;
  const robots = normalizeText(config.robots) || DEFAULT_ROBOTS;
  const path = normalizeText(config.path || (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/')) || '/';
  const canonicalUrl = normalizeText(config.canonicalUrl) || buildOfficialSiteUrl(path);
  const imageUrl = resolveSeoImage(config.image || DEFAULT_IMAGE_PATH);
  const keywords = uniqueKeywords([...(config.keywords || []), ...DEFAULT_KEYWORDS]);
  const jsonLd = Array.isArray(config.jsonLd) ? config.jsonLd.filter(Boolean) : [];
  const ogType = normalizeText(config.ogType) || 'website';

  document.title = title;

  setMetaContent({ name: 'description' }, description);
  setMetaContent({ name: 'keywords' }, keywords.join(', '));
  setMetaContent({ name: 'robots' }, robots);
  setMetaContent({ name: 'author' }, '燧石创想工作室');
  setMetaContent({ name: 'referrer' }, 'strict-origin-when-cross-origin');
  setMetaContent({ property: 'og:type' }, ogType);
  setMetaContent({ property: 'og:site_name' }, DEFAULT_SITE_NAME);
  setMetaContent({ property: 'og:locale' }, 'zh_CN');
  setMetaContent({ property: 'og:title' }, title);
  setMetaContent({ property: 'og:description' }, description);
  setMetaContent({ property: 'og:url' }, canonicalUrl);
  setMetaContent({ property: 'og:image' }, imageUrl);
  setMetaContent({ property: 'og:image:alt' }, title);
  setMetaContent({ name: 'twitter:card' }, 'summary_large_image');
  setMetaContent({ name: 'twitter:title' }, title);
  setMetaContent({ name: 'twitter:description' }, description);
  setMetaContent({ name: 'twitter:image' }, imageUrl);
  setLinkHref('canonical', canonicalUrl);

  document.head
    .querySelectorAll(`script[type="application/ld+json"][${SEO_MANAGED_ATTR}="true"]`)
    .forEach((element) => element.remove());

  jsonLd.forEach((payload) => {
    const script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute(SEO_MANAGED_ATTR, 'true');
    script.textContent = JSON.stringify(payload);
    document.head.appendChild(script);
  });
}
