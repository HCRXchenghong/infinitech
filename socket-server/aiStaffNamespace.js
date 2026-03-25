import { logger } from './logger.js';

export function setupAiStaffNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser
}) {
  const aiStaffNamespace = io.of('/ai-staff');
  aiStaffNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const role = socket.handshake.auth.role;

    if (role === 'ai_staff' && token === (process.env.AI_STAFF_TOKEN || 'ai_staff_token')) {
      socket.userRole = 'ai_staff';
      socket.userId = 'suchpeople';
      return next();
    }

    return authMiddleware(socket, next);
  });

  aiStaffNamespace.on('connection', (socket) => {
    logger.info('🤖 AI Staff connected:', socket.userId, 'Role:', socket.userRole);
    addOnlineUser(socket.id, socket.userId, socket.userRole);

    if (socket.userRole === 'ai_staff') {
      logger.info('✅ SuchPeople (OpenClaw) 已连接');

      socket.on('task_status', (data) => {
        logger.info('📊 任务状态更新:', data);
        aiStaffNamespace.emit('task_status', data);
      });

      socket.on('task_completed', (data) => {
        logger.info('✅ 任务完成:', data);
        aiStaffNamespace.emit('task_completed', data);
      });

      socket.on('task_failed', (data) => {
        logger.info('❌ 任务失败:', data);
        aiStaffNamespace.emit('task_failed', data);
      });
    }

    socket.on('ai_task', (data) => {
      if (socket.userRole !== 'admin') {
        socket.emit('error', { message: '无权限发送任务' });
        return;
      }
      logger.info('📝 收到新任务:', data);

      let delivered = 0;
      for (const client of aiStaffNamespace.sockets.values()) {
        if (client.userRole === 'ai_staff') {
          client.emit('ai_task', data);
          delivered += 1;
        }
      }
      if (delivered === 0) {
        logger.warn('⚠️ 未检测到在线 SuchPeople，任务暂未被消费');
        socket.emit('task_failed', {
          taskId: data?.id,
          error: 'AI员工执行器未连接（SuchPeople offline）'
        });
      }
    });

    socket.on('config_update', () => {
      if (socket.userRole !== 'admin') {
        socket.emit('error', { message: '无权限更新配置' });
        return;
      }
      logger.info('🔄 配置更新通知');
      for (const client of aiStaffNamespace.sockets.values()) {
        if (client.userRole === 'ai_staff') {
          client.emit('config_update');
        }
      }
    });

    socket.on('disconnect', () => {
      removeOnlineUser(socket.id);
      logger.info('🤖 AI Staff disconnected:', socket.userId);
    });
  });

  return {
    aiStaffNamespace
  };
}
