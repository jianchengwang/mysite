#!/bin/bash
# 用法: ./deploy.sh 用户名@远程IP

LOCAL_DIST_DIR="../web/dist/"
REMOTE_USER_HOST="$1"
REMOTE_DIR="/data/mysite/"

if [ -z "$REMOTE_USER_HOST" ]; then
  echo "用法: $0 用户名@远程IP"
  exit 1
fi

# 使用 rsync 同步并自动清空远程目录中多余文件
rsync -avz --delete ${LOCAL_DIST_DIR} ${REMOTE_USER_HOST}:${REMOTE_DIR}

echo "部署完成：${LOCAL_DIST_DIR} -> ${REMOTE_USER_HOST}:${REMOTE_DIR}" 