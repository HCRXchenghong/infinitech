export const MIRROR_PROFILES = {
  official: {
    label: '官方源（默认）',
    npmRegistry: 'https://registry.npmjs.org/',
    goProxy: 'https://proxy.golang.org,direct',
    alpineMirror: '',
    dockerImageMirror: '',
    notes: '使用官方 Docker Hub、npm 和 Go Proxy。',
  },
  aliyun: {
    label: '阿里云镜像',
    npmRegistry: 'https://registry.npmmirror.com',
    goProxy: 'https://mirrors.aliyun.com/goproxy/,direct',
    alpineMirror: 'https://mirrors.aliyun.com/alpine',
    dockerImageMirror: 'docker.m.daocloud.io',
    notes: 'npm 使用 npmmirror，Go/Alpine 使用阿里云，Docker 镜像走 DaoCloud 加速。',
  },
  tencent: {
    label: '腾讯云镜像',
    npmRegistry: 'https://mirrors.cloud.tencent.com/npm/',
    goProxy: 'https://mirrors.tencent.com/go/,direct',
    alpineMirror: 'https://mirrors.tencent.com/alpine',
    dockerImageMirror: 'docker.m.daocloud.io',
    notes: 'Go、npm、Alpine 走腾讯云，Docker 镜像走 DaoCloud 加速。',
  },
  huawei: {
    label: '华为云镜像',
    npmRegistry: 'https://repo.huaweicloud.com/repository/npm/',
    goProxy: 'https://repo.huaweicloud.com/repository/goproxy/,direct',
    alpineMirror: 'https://repo.huaweicloud.com/alpine',
    dockerImageMirror: 'docker.m.daocloud.io',
    notes: 'Go、npm、Alpine 走华为云，Docker 镜像走 DaoCloud 加速。',
  },
  tsinghua: {
    label: '清华 / goproxy.cn 组合镜像',
    npmRegistry: 'https://mirrors.tuna.tsinghua.edu.cn/npm/',
    goProxy: 'https://goproxy.cn,direct',
    alpineMirror: 'https://mirrors.tuna.tsinghua.edu.cn/alpine',
    dockerImageMirror: 'docker.m.daocloud.io',
    notes: 'npm 和 Alpine 走清华，Go 走 goproxy.cn，Docker 镜像走 DaoCloud 加速。',
  },
}

export function dockerHubImageWithMirror(prefix, image) {
  if (!prefix) {
    return image
  }
  if (image.includes('/') && image.split('/')[0].includes('.')) {
    return image
  }
  if (image.includes('/')) {
    return `${prefix}/${image}`
  }
  return `${prefix}/library/${image}`
}

export function buildMirrorEnv(profileKey = 'official') {
  const profile = MIRROR_PROFILES[profileKey] || MIRROR_PROFILES.official
  const prefix = profile.dockerImageMirror

  return {
    MIRROR_PROFILE: profileKey,
    NPM_REGISTRY: profile.npmRegistry,
    GOPROXY: profile.goProxy,
    ALPINE_MIRROR: profile.alpineMirror,
    NODE_BASE_IMAGE: dockerHubImageWithMirror(prefix, 'node:20-alpine'),
    GO_BUILDER_BASE_IMAGE: dockerHubImageWithMirror(prefix, 'golang:1.24-alpine'),
    GO_RUNTIME_BASE_IMAGE: dockerHubImageWithMirror(prefix, 'alpine:3.20'),
    NGINX_BASE_IMAGE: dockerHubImageWithMirror(prefix, 'nginx:1.27-alpine'),
    POSTGRES_IMAGE: dockerHubImageWithMirror(prefix, 'postgres:14-alpine'),
    REDIS_IMAGE: dockerHubImageWithMirror(prefix, 'redis:7-alpine'),
    CADDY_IMAGE: dockerHubImageWithMirror(prefix, 'caddy:2-alpine'),
    MYSQL_IMAGE: dockerHubImageWithMirror(prefix, 'mysql:8.0'),
    RABBITMQ_IMAGE: dockerHubImageWithMirror(prefix, 'rabbitmq:3-management-alpine'),
    COMPOSE_DOCKER_CLI_BUILD: '1',
    DOCKER_BUILDKIT: '1',
  }
}

