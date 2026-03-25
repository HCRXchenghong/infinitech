# settingsHelpers 重构进度

## 已完成的模块

### 1. SMS 配置模块 ✅
文件: `settingsHelpers/sms.js`

功能:
- 加载短信配置
- 保存短信配置
- 错误处理

导出:
```javascript
const { sms, saving, loading, error, loadSmsConfig, saveSmsConfig } = useSmsSettings();
```

### 2. 天气配置模块 ✅
文件: `settingsHelpers/weather.js`

功能:
- 加载天气配置
- 保存天气配置
- 配置合并和默认值处理
- 错误处理

导出:
```javascript
const { weather, saving, loading, error, loadWeatherConfig, saveWeatherConfig } = useWeatherSettings();
```

---

## 待完成的模块

### 3. 支付配置模块 ⏳
文件: `settingsHelpers/payment.js`

需要包含:
- 微信支付配置
- 支付宝配置
- 支付模式(生产/测试)
- 调试模式

### 4. 应用下载配置模块 ⏳
文件: `settingsHelpers/appDownload.js`

需要包含:
- iOS/Android 下载链接
- 版本信息
- 安装包上传

### 5. 数据管理模块 ⏳
文件: `settingsHelpers/dataManagement.js`

需要包含:
- 用户数据导入导出
- 骑手数据导入导出
- 订单数据导入导出
- 商户数据导入导出
- 全部数据导入导出

### 6. API 管理模块 ⏳
文件: `settingsHelpers/api.js`

需要包含:
- API 列表加载
- API 创建/编辑/删除
- API 文档下载

### 7. 清空数据模块 ⏳
文件: `settingsHelpers/clearData.js`

需要包含:
- 清空所有数据
- 验证机制

### 8. 主入口文件 ⏳
文件: `settingsHelpers/index.js`

整合所有模块,提供统一的 `useSettingsPage()` 接口。

---

## 使用示例

### 当前使用方式 (旧)
```javascript
import { useSettingsPage } from './settingsHelpers';

const {
  sms,
  saving,
  saveSms,
  // ... 其他 100+ 个导出
} = useSettingsPage();
```

### 重构后使用方式 (新)
```javascript
// 方式 1: 使用主入口 (推荐)
import { useSettingsPage } from './settingsHelpers';
const settings = useSettingsPage();

// 方式 2: 按需导入模块
import { useSmsSettings } from './settingsHelpers/sms';
import { useWeatherSettings } from './settingsHelpers/weather';

const smsSettings = useSmsSettings();
const weatherSettings = useWeatherSettings();
```

---

## 重构收益

1. **可维护性**: 每个模块独立,易于理解和修改
2. **可测试性**: 小模块更容易编写单元测试
3. **可复用性**: 其他页面也可以使用这些模块
4. **性能**: 可以按需加载,减少初始加载时间
5. **团队协作**: 多人可以同时修改不同模块

---

## 下一步

1. 继续完成剩余模块的拆分
2. 创建主入口文件整合所有模块
3. 更新 Settings.vue 使用新的模块
4. 添加单元测试
5. 删除旧的 settingsHelpers.js
