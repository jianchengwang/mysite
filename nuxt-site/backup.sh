#!/bin/bash
# Get real path
BASEDIR=$(cd `dirname $0` && pwd)
cd ${BASEDIR}
# delete log
rm -rf *.log
# Log Location on Server.
LOG_LOCATION=${BASEDIR}
exec > >(tee -i $LOG_LOCATION/backup.`date +%Y%m%d%H%M%S`.log)
exec 2>&1

commit_() {
  echo 'commit begin..'
  info=$1
  if ["$info" = ""]; then
   info=":pencil: update content"
  fi
  git add -A
  git commit -m "$info"
  git push origin main
  echo 'commit done..'
}

update_() {
  echo 'update begin'
  git checkout main
  git pull origin main
  deploy_
  echo 'update done'
}

deploy_() {
  # yarn &&  yarn generate
  # rm -rf /root/www/blog/* && cp -rf ./dist/. /root/www/blog
  kill -9 `netstat -nlp | grep :8081 | awk '{print $7}' | awk -F"/" '{ print $1 }'`
  yarn && yarn build 
  nohup yarn start &!
  echo 'done'
}

type=$1
commit_msg=$2
shift

case $type in
c)
  commit_ "$commit_msg"
  ;;
u)
  update_
  ;;
d)
  deploy_
  ;;
*) echo '
  打包脚本说明

  Usage:
    sh ./backup.sh type
    ./backup.sh type

  type:
    c 提交git
    u 更新博客
  '
  ;;
esac

exit 0
