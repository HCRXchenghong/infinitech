#!/bin/bash

# SQLite 迁移到 PostgreSQL 脚本

echo "🔄 SQLite 迁移到 PostgreSQL"

# 配置
SQLITE_DB=${SQLITE_DB:-data/yuexiang.db}
PG_HOST=${DB_HOST:-192.168.0.103}
PG_PORT=${DB_PORT:-5432}
PG_USER=${DB_USER:-postgres}
PG_PASSWORD=${DB_PASSWORD:-}
PG_DB=${DB_NAME:-yuexiang}

echo "源数据库: $SQLITE_DB"
echo "目标数据库: postgresql://$PG_USER@$PG_HOST:$PG_PORT/$PG_DB"

# 检查工具
if ! command -v pgloader &> /dev/null; then
    echo "⚠️  pgloader 未安装，使用手动迁移方式"
    echo "   安装: brew install pgloader (macOS) 或 apt-get install pgloader (Linux)"
    echo ""
    echo "手动迁移步骤："
    echo "1. 导出 SQLite 数据: sqlite3 $SQLITE_DB .dump > /tmp/export.sql"
    echo "2. 转换格式（需要手动调整）"
    echo "3. 导入 PostgreSQL: psql -h $PG_HOST -U $PG_USER -d $PG_DB < /tmp/export.sql"
    exit 1
fi

# 使用 pgloader 迁移
pgloader "$SQLITE_DB" "postgresql://$PG_USER:$PG_PASSWORD@$PG_HOST:$PG_PORT/$PG_DB"

if [ $? -eq 0 ]; then
    echo "✅ 迁移成功！"
    echo "📝 请更新 .env 文件："
    echo "   DB_DRIVER=postgres"
    echo "   DB_HOST=$PG_HOST"
    echo "   DB_PORT=$PG_PORT"
    echo "   DB_USER=$PG_USER"
    echo "   DB_NAME=$PG_DB"
else
    echo "❌ 迁移失败"
    exit 1
fi
