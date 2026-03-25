# user-vue 微信小程序使用说明

## 1. 编译小程序产物
在项目根目录执行：

```bash
cd user-vue
npm run build:mp-weixin
```

编译输出目录：

`user-vue/unpackage/dist/dev/mp-weixin`

## 2. 使用微信开发者工具打开
1. 打开微信开发者工具
2. 选择“导入项目”
3. 项目目录选择 `user-vue/unpackage/dist/dev/mp-weixin`
4. AppID 可先使用测试号，仓库默认配置为 `touristappid`

## 3. 接口配置
配置位置：

`user-vue/manifest.json`

当前默认开发地址：
- BFF: `http://127.0.0.1:25500`
- Socket: `http://127.0.0.1:9898`

如果后端不在本机：
- 优先通过显式配置修改 `API_BASE_URL` / `SOCKET_URL`
- 或在本地开发环境里设置你自己的调试地址
- 不要把个人局域网 IP 提交回仓库默认值
