<template>
  <el-card class="card full-width">
    <div class="card-title">会员中心配置</div>
    <el-form :model="vipSettings" label-width="120px" size="small">
      <el-form-item label="启用会员页">
        <el-switch v-model="vipSettings.enabled" />
        <span class="form-tip-inline">关闭后双端会员中心将显示未开放提示，不再展示占位权益。</span>
      </el-form-item>
      <el-form-item label="页面标题">
        <el-input v-model="vipSettings.page_title" placeholder="如：会员中心" />
      </el-form-item>
      <el-form-item label="规则标题">
        <el-input v-model="vipSettings.rules_title" placeholder="如：会员权益规则" />
      </el-form-item>
      <el-form-item label="权益区标题">
        <el-input v-model="vipSettings.benefit_section_title" placeholder="如：权益全景" />
      </el-form-item>
      <el-form-item label="权益区标签">
        <el-input v-model="vipSettings.benefit_section_tag" placeholder="如：VIP 专享" />
      </el-form-item>
      <el-form-item label="权益区提示">
        <el-input v-model="vipSettings.benefit_section_tip" placeholder="如：点击查看详情" />
      </el-form-item>
      <el-form-item label="任务区标题">
        <el-input v-model="vipSettings.tasks_section_title" placeholder="如：成长任务" />
      </el-form-item>
      <el-form-item label="任务区说明">
        <el-input v-model="vipSettings.tasks_section_tip" type="textarea" :rows="2" placeholder="如：完成任务，逐步解锁更多等级权益" />
      </el-form-item>
      <el-form-item label="积分区标题">
        <el-input v-model="vipSettings.points_section_title" placeholder="如：积分好礼" />
      </el-form-item>
      <el-form-item label="积分区说明">
        <el-input v-model="vipSettings.points_section_tip" type="textarea" :rows="2" placeholder="如：积分商品由积分商城实时维护" />
      </el-form-item>
      <el-form-item label="客服按钮">
        <el-input v-model="vipSettings.service_button_text" placeholder="如：联系客服" />
      </el-form-item>
      <el-form-item label="普通行动按钮">
        <el-input v-model="vipSettings.standard_action_text" placeholder="如：立即去下单" />
      </el-form-item>
      <el-form-item label="高阶行动按钮">
        <el-input v-model="vipSettings.premium_action_text" placeholder="如：联系专属客服" />
      </el-form-item>

      <el-divider content-position="left">积分规则</el-divider>
      <div style="display:grid;gap:12px;margin-bottom:18px;">
        <div style="display:flex;justify-content:flex-end;">
          <el-button size="small" @click="addVIPPointRule">新增规则</el-button>
        </div>
        <div v-if="!vipSettings.point_rules.length" class="form-tip">当前未配置积分规则，将回退到系统默认规则。</div>
        <div
          v-for="(rule, index) in vipSettings.point_rules"
          :key="`vip-rule-${index}`"
          style="display:grid;grid-template-columns:1fr auto;gap:12px;"
        >
          <el-input v-model="vipSettings.point_rules[index]" type="textarea" :rows="2" placeholder="输入积分规则说明" />
          <el-button type="danger" plain @click="removeVIPPointRule(index)">删除</el-button>
        </div>
      </div>

      <el-divider content-position="left">会员等级</el-divider>
      <div style="display:grid;gap:16px;margin-bottom:18px;">
        <div style="display:flex;justify-content:flex-end;">
          <el-button size="small" @click="addVIPLevel">新增等级</el-button>
        </div>
        <div v-if="!vipSettings.levels.length" class="form-tip">当前未配置等级信息，前台将回退到系统默认等级。</div>
        <div
          v-for="(level, levelIndex) in vipSettings.levels"
          :key="`vip-level-${levelIndex}`"
          style="display:grid;gap:12px;padding:16px;border:1px solid #ebeef5;border-radius:10px;"
        >
          <div style="display:grid;grid-template-columns:1fr 160px 160px auto;gap:12px;">
            <el-input v-model="level.name" placeholder="等级名称，如：黄金 VIP" />
            <el-input-number v-model="level.threshold_value" :min="1" :max="999999" style="width:100%;" />
            <el-input v-model="level.threshold_label" placeholder="如：成长值 3000" />
            <el-button type="danger" plain @click="removeVIPLevel(levelIndex)">删除等级</el-button>
          </div>
          <div style="display:grid;grid-template-columns:200px 160px 160px;gap:12px;">
            <el-input v-model="level.style_class" placeholder="样式类，如：level-gold" />
            <el-input-number v-model="level.multiplier" :min="1" :max="10" style="width:100%;" />
            <el-switch v-model="level.is_black_gold" active-text="黑金等级" />
          </div>
          <el-input v-model="level.tagline" type="textarea" :rows="2" placeholder="等级副标题" />

          <div style="display:grid;gap:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="form-tip-inline">等级权益</span>
              <el-button size="small" @click="addVIPBenefit(levelIndex)">新增权益</el-button>
            </div>
            <div v-if="!level.benefits?.length" class="form-tip">当前等级还没有配置权益项。</div>
            <div
              v-for="(benefit, benefitIndex) in level.benefits"
              :key="`vip-benefit-${levelIndex}-${benefitIndex}`"
              style="display:grid;gap:12px;padding:12px;border:1px solid #f0f2f5;border-radius:8px;"
            >
              <div style="display:grid;grid-template-columns:220px 180px 220px auto;gap:12px;">
                <el-input v-model="benefit.icon" placeholder="/static/icons/star.svg" />
                <el-input v-model="benefit.title" placeholder="权益标题" />
                <el-input v-model="benefit.desc" placeholder="权益短描述" />
                <el-button type="danger" plain @click="removeVIPBenefit(levelIndex, benefitIndex)">删除权益</el-button>
              </div>
              <el-input v-model="benefit.detail" type="textarea" :rows="2" placeholder="权益详细说明" />
            </div>
          </div>
        </div>
      </div>

      <el-divider content-position="left">成长任务</el-divider>
      <div style="display:grid;gap:12px;margin-bottom:18px;">
        <div style="display:flex;justify-content:flex-end;">
          <el-button size="small" @click="addVIPTask">新增任务</el-button>
        </div>
        <div v-if="!vipSettings.growth_tasks.length" class="form-tip">当前未配置成长任务，前台将显示空状态。</div>
        <div
          v-for="(task, index) in vipSettings.growth_tasks"
          :key="`vip-task-${index}`"
          style="display:grid;grid-template-columns:1fr 220px 180px 140px auto;gap:12px;align-items:start;"
        >
          <el-input v-model="task.title" placeholder="任务标题" />
          <el-input v-model="task.description" placeholder="任务说明" />
          <el-input v-model="task.reward_text" placeholder="如：+80 成长值" />
          <el-input v-model="task.action_label" placeholder="如：去下单" />
          <el-button type="danger" plain @click="removeVIPTask(index)">删除</el-button>
        </div>
      </div>

      <el-form-item>
        <el-button type="primary" :loading="savingVipSettings" @click="saveVIPSettings">保存会员中心配置</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-card class="card full-width">
    <div class="card-title">公益配置</div>
    <el-form :model="charitySettings" label-width="120px" size="small">
      <el-form-item label="启用公益页">
        <el-switch v-model="charitySettings.enabled" />
        <span class="form-tip-inline">关闭后前台只显示未开放提示，不再展示占位内容。</span>
      </el-form-item>
      <el-form-item label="页面标题">
        <el-input v-model="charitySettings.page_title" placeholder="如：悦享公益" />
      </el-form-item>
      <el-form-item label="页面副标题">
        <el-input v-model="charitySettings.page_subtitle" placeholder="如：让每一份善意都被看见" />
      </el-form-item>
      <el-form-item label="头图地址">
        <el-input v-model="charitySettings.hero_image_url" placeholder="https://..." />
      </el-form-item>
      <el-form-item label="头图文案">
        <el-input v-model="charitySettings.hero_tagline" type="textarea" :rows="2" placeholder="公益头图说明文案" />
      </el-form-item>
      <el-form-item label="运行天数">
        <el-input-number v-model="charitySettings.hero_days_running" :min="0" :max="100000" />
      </el-form-item>
      <el-form-item label="资金池金额">
        <el-input-number v-model="charitySettings.fund_pool_amount" :min="0" :max="9999999999" :step="100" />
      </el-form-item>
      <el-form-item label="今日参与数">
        <el-input-number v-model="charitySettings.today_donation_count" :min="0" :max="9999999" />
      </el-form-item>
      <el-form-item label="项目状态">
        <el-input v-model="charitySettings.project_status_text" placeholder="如：筹备中 / 进行中 / 已完成" />
      </el-form-item>
      <el-form-item label="榜单标题">
        <el-input v-model="charitySettings.leaderboard_title" placeholder="如：善行榜单" />
      </el-form-item>
      <el-form-item label="资讯标题">
        <el-input v-model="charitySettings.news_title" placeholder="如：公益资讯" />
      </el-form-item>
      <el-form-item label="使命标题">
        <el-input v-model="charitySettings.mission_title" placeholder="如：初心" />
      </el-form-item>
      <el-form-item label="使命文案一">
        <el-input v-model="charitySettings.mission_paragraph_one" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="使命文案二">
        <el-input v-model="charitySettings.mission_paragraph_two" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="计划标题">
        <el-input v-model="charitySettings.matching_plan_title" placeholder="如：公益参与计划" />
      </el-form-item>
      <el-form-item label="计划说明">
        <el-input v-model="charitySettings.matching_plan_description" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="行动按钮">
        <el-input v-model="charitySettings.action_label" placeholder="如：了解参与方式" />
      </el-form-item>
      <el-form-item label="按钮备注">
        <el-input v-model="charitySettings.action_note" placeholder="如：OPERATED BY CHARITY OPS" />
      </el-form-item>
      <el-form-item label="参与链接">
        <el-input v-model="charitySettings.join_url" placeholder="https://..." />
        <span class="form-tip-inline">配置后前台将直接打开该链接；留空则展示参与说明。</span>
      </el-form-item>
      <el-form-item label="参与说明">
        <el-input v-model="charitySettings.participation_notice" type="textarea" :rows="3" />
      </el-form-item>

      <el-divider content-position="left">善行榜单</el-divider>
      <div style="display:grid;gap:12px;margin-bottom:18px;">
        <div style="display:flex;justify-content:flex-end;">
          <el-button size="small" @click="addCharityLeaderboardItem">新增榜单项</el-button>
        </div>
        <div v-if="!charitySettings.leaderboard.length" class="form-tip">当前未配置榜单数据，前台将显示空状态。</div>
        <div
          v-for="(item, index) in charitySettings.leaderboard"
          :key="`leaderboard-${index}`"
          style="display:grid;grid-template-columns:1fr 180px 180px auto;gap:12px;align-items:start;"
        >
          <el-input v-model="item.name" placeholder="姓名或匿名名称" />
          <el-input-number v-model="item.amount" :min="0" :max="9999999999" :step="10" style="width:100%;" />
          <el-input v-model="item.time_label" placeholder="如：今天 / 刚刚" />
          <el-button type="danger" plain @click="removeCharityLeaderboardItem(index)">删除</el-button>
        </div>
      </div>

      <el-divider content-position="left">公益资讯</el-divider>
      <div style="display:grid;gap:12px;">
        <div style="display:flex;justify-content:flex-end;">
          <el-button size="small" @click="addCharityNewsItem">新增资讯项</el-button>
        </div>
        <div v-if="!charitySettings.news_list.length" class="form-tip">当前未配置资讯数据，前台将显示空状态。</div>
        <div
          v-for="(item, index) in charitySettings.news_list"
          :key="`charity-news-${index}`"
          style="display:grid;gap:12px;padding:12px;border:1px solid #ebeef5;border-radius:8px;"
        >
          <div style="display:grid;grid-template-columns:1fr 220px auto;gap:12px;">
            <el-input v-model="item.title" placeholder="资讯标题" />
            <el-input v-model="item.time_label" placeholder="如：今天 / 3月活动" />
            <el-button type="danger" plain @click="removeCharityNewsItem(index)">删除</el-button>
          </div>
          <div style="display:grid;grid-template-columns:220px 1fr;gap:12px;">
            <el-input v-model="item.source" placeholder="来源，如：运营中心" />
            <el-input v-model="item.image_url" placeholder="封面图地址 https://..." />
          </div>
          <el-input v-model="item.summary" type="textarea" :rows="3" placeholder="资讯摘要" />
        </div>
      </div>

      <el-form-item style="margin-top: 18px;">
        <el-button type="primary" :loading="savingCharitySettings" @click="saveCharitySettings">保存公益配置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
defineProps({
  vipSettings: {
    type: Object,
    required: true,
  },
  savingVipSettings: {
    type: Boolean,
    default: false,
  },
  saveVIPSettings: {
    type: Function,
    required: true,
  },
  addVIPLevel: {
    type: Function,
    required: true,
  },
  removeVIPLevel: {
    type: Function,
    required: true,
  },
  addVIPBenefit: {
    type: Function,
    required: true,
  },
  removeVIPBenefit: {
    type: Function,
    required: true,
  },
  addVIPTask: {
    type: Function,
    required: true,
  },
  removeVIPTask: {
    type: Function,
    required: true,
  },
  addVIPPointRule: {
    type: Function,
    required: true,
  },
  removeVIPPointRule: {
    type: Function,
    required: true,
  },
  charitySettings: {
    type: Object,
    required: true,
  },
  savingCharitySettings: {
    type: Boolean,
    default: false,
  },
  saveCharitySettings: {
    type: Function,
    required: true,
  },
  addCharityLeaderboardItem: {
    type: Function,
    required: true,
  },
  removeCharityLeaderboardItem: {
    type: Function,
    required: true,
  },
  addCharityNewsItem: {
    type: Function,
    required: true,
  },
  removeCharityNewsItem: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped lang="css" src="../Settings.css"></style>
