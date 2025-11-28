-- Ensure database user has all necessary privileges
-- Note: MySQL automatically creates the user when MYSQL_USER and MYSQL_PASSWORD are set in docker-compose
-- This script ensures the user has proper privileges from all hosts
GRANT ALL PRIVILEGES ON tgbot.* TO 'tgbot_user'@'%';
FLUSH PRIVILEGES;

