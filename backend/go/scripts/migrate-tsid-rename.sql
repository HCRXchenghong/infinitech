-- Compatibility migration: rename legacy ts_id column to tsid.
-- Run on MySQL 8+ in the target schema.

SET @target_schema = DATABASE();

-- 1) Rename ts_id -> tsid for every table that still has ts_id but not tsid.
SET SESSION group_concat_max_len = 1048576;
SELECT GROUP_CONCAT(
         CONCAT(
           'ALTER TABLE `', c.TABLE_NAME, '` ',
           'CHANGE COLUMN `ts_id` `tsid` ', c.COLUMN_TYPE, ' ',
           IF(c.IS_NULLABLE = 'YES', 'NULL', 'NOT NULL'),
           CASE
             WHEN c.COLUMN_DEFAULT IS NULL THEN ''
             WHEN c.COLUMN_DEFAULT = 'CURRENT_TIMESTAMP' THEN ' DEFAULT CURRENT_TIMESTAMP'
             ELSE CONCAT(' DEFAULT ', QUOTE(c.COLUMN_DEFAULT))
           END,
           CASE
             WHEN c.EXTRA IS NULL OR c.EXTRA = '' THEN ''
             ELSE CONCAT(' ', c.EXTRA)
           END
         )
         SEPARATOR '; '
       )
INTO @rename_sql
FROM information_schema.COLUMNS c
LEFT JOIN information_schema.COLUMNS c2
  ON c2.TABLE_SCHEMA = c.TABLE_SCHEMA
 AND c2.TABLE_NAME = c.TABLE_NAME
 AND c2.COLUMN_NAME = 'tsid'
WHERE c.TABLE_SCHEMA = @target_schema
  AND c.COLUMN_NAME = 'ts_id'
  AND c2.COLUMN_NAME IS NULL;

SET @rename_sql = COALESCE(@rename_sql, 'SELECT 1');
PREPARE rename_stmt FROM @rename_sql;
EXECUTE rename_stmt;
DEALLOCATE PREPARE rename_stmt;

-- 2) If both columns exist (historical partial migration), backfill tsid from ts_id.
SELECT GROUP_CONCAT(
         CONCAT(
           'UPDATE `', c.TABLE_NAME, '` ',
           'SET `tsid` = `ts_id` ',
           'WHERE (`tsid` IS NULL OR `tsid` = '''') ',
           'AND `ts_id` IS NOT NULL AND `ts_id` <> '''''
         )
         SEPARATOR '; '
       )
INTO @backfill_sql
FROM information_schema.COLUMNS c
JOIN information_schema.COLUMNS c2
  ON c2.TABLE_SCHEMA = c.TABLE_SCHEMA
 AND c2.TABLE_NAME = c.TABLE_NAME
 AND c2.COLUMN_NAME = 'tsid'
WHERE c.TABLE_SCHEMA = @target_schema
  AND c.COLUMN_NAME = 'ts_id';

SET @backfill_sql = COALESCE(@backfill_sql, 'SELECT 1');
PREPARE backfill_stmt FROM @backfill_sql;
EXECUTE backfill_stmt;
DEALLOCATE PREPARE backfill_stmt;

-- 3) Drop ts_id once backfill is done where both columns exist.
SELECT GROUP_CONCAT(
         CONCAT('ALTER TABLE `', c.TABLE_NAME, '` DROP COLUMN `ts_id`')
         SEPARATOR '; '
       )
INTO @drop_sql
FROM information_schema.COLUMNS c
JOIN information_schema.COLUMNS c2
  ON c2.TABLE_SCHEMA = c.TABLE_SCHEMA
 AND c2.TABLE_NAME = c.TABLE_NAME
 AND c2.COLUMN_NAME = 'tsid'
WHERE c.TABLE_SCHEMA = @target_schema
  AND c.COLUMN_NAME = 'ts_id';

SET @drop_sql = COALESCE(@drop_sql, 'SELECT 1');
PREPARE drop_stmt FROM @drop_sql;
EXECUTE drop_stmt;
DEALLOCATE PREPARE drop_stmt;
