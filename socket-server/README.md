# Socket.IO 服务器

## 安装依赖
```bash
npm install
```

## 启动服务器
```bash
npm start
```

## 端口
- 9898

## 命名空间
- `/monitor` - 平台监控聊天
- `/support` - 售后服务聊天

## 事件
### 客户端发送
- `load_messages` - 加载聊天记录
- `send_message` - 发送消息
- `clear_messages` - 清空聊天记录

### 服务器发送
- `messages_loaded` - 聊天记录加载完成
- `new_message` - 新消息
