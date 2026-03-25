#!/bin/bash

# 数据库初始化脚本

echo "🔧 初始化数据库..."

# 从环境变量读取配置，或使用默认值
DB_HOST=${DB_HOST:-192.168.0.103}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-yuexiang}

echo "数据库配置:"
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"

# 创建数据库
if [ -z "$DB_PASSWORD" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
fi

if [ $? -eq 0 ]; then
    echo "✅ 数据库 '$DB_NAME' 创建成功！"
else
    echo "❌ 数据库创建失败，请检查："
    echo "   1. MySQL 服务是否运行"
    echo "   2. 用户名和密码是否正确"
    echo "   3. 用户是否有创建数据库的权限"
    exit 1
fi
