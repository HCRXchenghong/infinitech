#!/bin/bash

# SQLite 迁移到 MySQL 脚本
# 使用 sqlite3 和 mysql 命令行工具

echo "🔄 SQLite 迁移到 MySQL"

# 配置
SQLITE_DB=${SQLITE_DB:-data/yuexiang.db}
MYSQL_HOST=${DB_HOST:-192.168.0.103}
MYSQL_PORT=${DB_PORT:-3306}
MYSQL_USER=${DB_USER:-root}
MYSQL_PASSWORD=${DB_PASSWORD:-}
MYSQL_DB=${DB_NAME:-yuexiang}

echo "源数据库: $SQLITE_DB"
echo "目标数据库: mysql://$MYSQL_USER@$MYSQL_HOST:$MYSQL_PORT/$MYSQL_DB"

# 检查 SQLite 文件是否存在
if [ ! -f "$SQLITE_DB" ]; then
    echo "❌ SQLite 数据库文件不存在: $SQLITE_DB"
    exit 1
fi

# 创建 MySQL 数据库
echo "📦 创建 MySQL 数据库..."
if [ -z "$MYSQL_PASSWORD" ]; then
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DB\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
else
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DB\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
fi

if [ $? -ne 0 ]; then
    echo "❌ 创建 MySQL 数据库失败"
    exit 1
fi

# 导出 SQLite 数据为 SQL
echo "📤 导出 SQLite 数据..."
SQL_FILE="/tmp/sqlite_export_$(date +%s).sql"
sqlite3 "$SQLITE_DB" .dump > "$SQL_FILE"

if [ $? -ne 0 ]; then
    echo "❌ 导出 SQLite 数据失败"
    exit 1
fi

# 转换 SQL 格式（SQLite 到 MySQL）
echo "🔄 转换 SQL 格式..."
# 移除 SQLite 特定语法
sed -i '' 's/INTEGER PRIMARY KEY AUTOINCREMENT/INT AUTO_INCREMENT PRIMARY KEY/g' "$SQL_FILE"
sed -i '' 's/INTEGER PRIMARY KEY/INT AUTO_INCREMENT PRIMARY KEY/g' "$SQL_FILE"
sed -i '' 's/INTEGER/INT/g' "$SQL_FILE"
sed -i '' 's/TEXT/VARCHAR(255)/g' "$SQL_FILE"

# 导入到 MySQL
echo "📥 导入到 MySQL..."
if [ -z "$MYSQL_PASSWORD" ]; then
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" "$MYSQL_DB" < "$SQL_FILE"
else
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DB" < "$SQL_FILE"
fi

if [ $? -eq 0 ]; then
    echo "✅ 迁移成功！"
    echo "📝 请更新 .env 文件："
    echo "   DB_DRIVER=mysql"
    echo "   DB_HOST=$MYSQL_HOST"
    echo "   DB_PORT=$MYSQL_PORT"
    echo "   DB_USER=$MYSQL_USER"
    echo "   DB_NAME=$MYSQL_DB"
    rm -f "$SQL_FILE"
else
    echo "❌ 迁移失败，请检查错误信息"
    echo "临时 SQL 文件: $SQL_FILE"
    exit 1
fi
