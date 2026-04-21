<template>
  <el-card class="card carousel-card">
    <div class="card-title">轮播图设置</div>

    <div class="carousel-config-section">
      <el-form
        :model="carouselSettings"
        :label-width="isMobile ? '0' : '140px'"
        size="small"
        :inline="true"
      >
        <el-form-item :label="isMobile ? '' : '自动播放间隔(秒)'">
          <el-input-number
            v-model="carouselSettings.auto_play_seconds"
            :min="1"
            :max="60"
            controls-position="right"
            :class="{ 'content-settings-full-width': isMobile }"
          />
          <span v-if="isMobile" class="mobile-label">自动播放间隔(秒)</span>
        </el-form-item>
        <el-form-item>
          <el-button
            size="small"
            type="primary"
            :loading="saving"
            :class="{ 'content-settings-full-width': isMobile }"
            @click="saveCarouselSettings"
          >
            保存配置
          </el-button>
        </el-form-item>
      </el-form>
      <div class="form-tip">设置轮播图自动切换的时间间隔</div>
    </div>

    <div class="carousel-management-section">
      <div v-if="!isMobile" class="carousel-actions">
        <el-button size="small" type="primary" @click="showAddCarouselDialog">添加轮播图</el-button>
        <el-button size="small" :loading="carouselLoading" @click="loadCarouselList">刷新</el-button>
      </div>

      <div v-else class="carousel-actions mobile-actions">
        <el-button size="small" type="primary" class="action-grow" @click="showAddCarouselDialog">
          添加轮播图
        </el-button>
        <el-dropdown trigger="click">
          <el-button size="small">
            <el-icon><More /></el-icon>
            <span>更多</span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="loadCarouselList">
                <el-icon><Refresh /></el-icon>
                <span>刷新</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <el-table
        v-if="!isMobile"
        :data="carouselList"
        stripe
        size="small"
        row-key="id"
        class="carousel-table"
        v-loading="carouselLoading"
      >
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="image_url" label="图片" width="120">
          <template #default="{ row }">
            <el-image
              :src="row.image_url"
              fit="cover"
              class="carousel-table-image"
              :preview-src-list="[row.image_url]"
              @click="showCarouselDetail(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="120">
          <template #default="{ row }">
            <span v-if="!row.editing">{{ row.title || '无标题' }}</span>
            <el-input
              v-else
              v-model="row.editTitle"
              size="small"
              placeholder="请输入标题"
              @blur="finishEdit(row)"
              @keyup.enter="finishEdit(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="link_url" label="跳转链接" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="!row.editing">{{ row.link_url || '无链接' }}</span>
            <el-input
              v-else
              v-model="row.editLinkUrl"
              size="small"
              placeholder="请输入跳转链接"
            />
          </template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="90">
          <template #default="{ row }">
            <span v-if="!row.editing">{{ row.sort_order }}</span>
            <el-input-number
              v-else
              v-model="row.editSortOrder"
              :min="0"
              :max="999"
              size="small"
              controls-position="right"
            />
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.editing"
              size="small"
              type="primary"
              @click="startEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-else
              size="small"
              type="success"
              @click="finishEdit(row)"
            >
              保存
            </el-button>
            <el-button v-if="row.editing" size="small" @click="cancelEdit(row)">取消</el-button>
            <el-button size="small" type="danger" @click="deleteCarousel(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="carouselError ? '加载失败，暂无可显示数据' : '暂无轮播图数据'"
            :image-size="90"
          />
        </template>
      </el-table>

      <div v-else v-loading="carouselLoading" class="mobile-carousel-list">
        <div v-if="carouselList.length === 0" class="empty-state">
          <p>暂无轮播图</p>
        </div>

        <div
          v-for="item in carouselList"
          :key="item.id"
          class="carousel-card-item"
        >
          <div class="card-item-header">
            <div class="card-item-image" @click="showCarouselDetail(item)">
              <el-image
                :src="item.image_url"
                fit="cover"
                class="carousel-image"
                :preview-src-list="[item.image_url]"
              />
            </div>
            <div class="card-item-info">
              <div class="card-item-title">
                <span class="info-label">ID:</span>
                <span class="info-value">{{ item.id }}</span>
              </div>
              <div class="card-item-title">
                <span class="info-label">标题:</span>
                <span class="info-value">{{ item.title || '无标题' }}</span>
              </div>
              <div class="card-item-meta">
                <el-tag :type="item.is_active ? 'success' : 'danger'" size="small">
                  {{ item.is_active ? '启用' : '禁用' }}
                </el-tag>
                <span class="sort-info">排序: {{ item.sort_order }}</span>
              </div>
            </div>
          </div>

          <div class="card-item-content">
            <div class="content-row">
              <span class="content-label">跳转链接:</span>
              <span class="content-value">{{ item.link_url || '无链接' }}</span>
            </div>
          </div>

          <div class="card-item-actions">
            <el-button
              v-if="!item.editing"
              size="small"
              type="primary"
              @click="startEdit(item)"
            >
              编辑
            </el-button>
            <el-button
              v-else
              size="small"
              type="success"
              @click="finishEdit(item)"
            >
              保存
            </el-button>
            <el-button v-if="item.editing" size="small" @click="cancelEdit(item)">取消</el-button>
            <el-button size="small" type="danger" @click="deleteCarousel(item)">删除</el-button>
          </div>

          <div v-if="item.editing" class="card-item-edit">
            <div class="edit-row">
              <span class="edit-label">标题:</span>
              <el-input v-model="item.editTitle" size="small" placeholder="请输入标题" class="action-grow" />
            </div>
            <div class="edit-row">
              <span class="edit-label">跳转链接:</span>
              <el-input v-model="item.editLinkUrl" size="small" placeholder="请输入跳转链接" class="action-grow" />
            </div>
            <div class="edit-row">
              <span class="edit-label">排序:</span>
              <el-input-number
                v-model="item.editSortOrder"
                :min="0"
                :max="999"
                size="small"
                controls-position="right"
                class="action-grow"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { More, Refresh } from '@element-plus/icons-vue';

defineProps({
  isMobile: {
    type: Boolean,
    default: false,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  carouselSettings: {
    type: Object,
    required: true,
  },
  saveCarouselSettings: {
    type: Function,
    required: true,
  },
  showAddCarouselDialog: {
    type: Function,
    required: true,
  },
  loadCarouselList: {
    type: Function,
    required: true,
  },
  carouselLoading: {
    type: Boolean,
    default: false,
  },
  carouselList: {
    type: Array,
    default: () => [],
  },
  carouselError: {
    type: String,
    default: '',
  },
  startEdit: {
    type: Function,
    required: true,
  },
  finishEdit: {
    type: Function,
    required: true,
  },
  cancelEdit: {
    type: Function,
    required: true,
  },
  deleteCarousel: {
    type: Function,
    required: true,
  },
  showCarouselDetail: {
    type: Function,
    required: true,
  },
});
</script>
