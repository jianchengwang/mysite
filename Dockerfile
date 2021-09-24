FROM alpine:latest

RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN echo 'Asia/Shanghai' >/etc/timezone

# install git - apt-get replace with apk
RUN apk update && \
    apk upgrade && \
    apk add --no-cache bash git openssh

RUN mkdir -p /etc/mysite/nuxtsite
WORKDIR /etc/mysite

# 添加go二进制文件
ADD mysite /etc/mysite

# 添加静态文件dist目录
COPY ./nuxtsite/dist /etc/mysite/nuxtsite/dist

RUN chmod 655 /etc/mysite/mysite

ENTRYPOINT ["/etc/mysite/mysite"]
EXPOSE 8081
