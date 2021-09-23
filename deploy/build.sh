# Log Location on Server.
LOG_LOCATION=${BASEDIR}
exec > >(tee -i $LOG_LOCATION/build.`date +%Y%m%d%H%M%S`.log)
exec 2>&1

cd ../
# 拉取代码
git pull origin main

# 打包nuxt-site
cd ./nuxt-site
yarn install
yarn generate

# 编译go
cd ../
set GOARCH=amd64
set GOOS=linux
go build -o mysite main.go

# 打包docker镜像
docker build -t mysite:v0.0.1 .
docker tag mysite:v0.0.1 jianchengwang/mysite
docker login
docker push jianchengwang/mysite

# 部署
docker pull jianchengwang/mysite:latest
docker-compose up -d

