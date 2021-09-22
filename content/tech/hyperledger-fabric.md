---
title: hyperledger-fabric
createdAt: 2021-06-27
categories: 
- blockchain
- fabric
tags: 
- blockchain
- fabric

---

[hyperledger-fabric](https://github.com/hyperledger/fabric) 是一个企业级的分布式账本框架，提供了基于java,go,nodejs等通用编程语言的sdk开发智能合约(**smart contract**)，本文主要介绍如何搭建要给超级账本的网络，并且基于go语言开发简单的智能合约。

<!--more-->

## 基础概念

hyperledger fabric符合上面说过的区块链的所有特性。我们必须先了解它的一些概念，才能进一步理解其架构设计。由于英文资料居多，所以这些概念我都以英文描述为准：

- chaincode：智能合约，上文已提到。每个chaincode可提供多个不同的调用命令。
- transaction：交易，每条指令都是一次交易。
- world state：对同一个key的多次交易形成的最终value，就是世界状态。
- endorse：背书。金融上的意义为：指持票人为将票据权利转让给他人或者将一定的票据权利授予他人行使，而在票据背面或者粘单上记载有关事项并签章的行为。通常我们引申为对某个事情负责。在我们的共识机制的投票环节里，背书意味着参与投票。
- endorsement policy：背书策略。由智能合约chaincode选择哪些peer节点参与到背书环节来。
- peer：存放区块链数据的结点，同时还有endorse和commit功能。
- channel：私有的子网络，事实上是为了隔离不同的应用，一个channel可含有一批chaincode。
- PKI：Public Key Infrastructure，一种遵循标准的利用公钥加密技术为电子商务的开展提供一套安全基础平台的技术和规范。
- MSP：Membership Service Provider，联盟链成员的证书管理，它定义了哪些RCA以及ICA在链里是可信任的，包括定义了channel上的合作者。
- org：orginazation，管理一系列合作企业的组织。

更多介绍可以参照 https://hyperledger-fabric.readthedocs.io/en/latest/key_concepts.html

## install & test-network

### install

参照 https://hyperledger-fabric.readthedocs.io/en/latest/getting_started.html

```shell
# 安装前置软件，这里不多赘述，自行参考https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html
wget https://golang.org/dl/go1.16.5.linux-amd64.tar.gz
rm -rf /usr/local/go && tar -C /usr/local -xzf go1.16.5.linux-amd64.tar.gz
# 测试目录
mkdir fabric-test
cd fabric-test
# 如果可以使用代理
curl -sSL https://bit.ly/2ysbOFE | bash -s
# 否则自行下载，其实就是一个shell脚本
wget https://raw.githubusercontent.com/hyperledger/fabric/master/scripts/bootstrap.sh
bash ./bootstrap.sh
# 如果你二进制文件也下载不下来，可以用可以代理的机器先下载，然后把脚本里的downlaod方法注释掉即可，然后把下载的二进制文件解压得到bin,config文件夹，复制到官方的示例项目fabric-simples即可
bash ./bootstrap.sh
wget https://github.com/hyperledger/fabric/releases/download/v2.3.2/hyperledger-fabric-linux-amd64-2.3.2.tar.gz
wget https://github.com/hyperledger/fabric-ca/releases/download/v1.5.0/hyperledger-fabric-ca-linux-amd64-1.5.0.tar.gz
tar -zxvf https://github.com/hyperledger/fabric/releases/download/v2.3.2/hyperledger-fabric-linux-amd64-2.3.2.tar.gz
tar -zxvf https://github.com/hyperledger/fabric-ca/releases/download/v1.5.0/hyperledger-fabric-ca-linux-amd64-1.5.0.tar.gz
mv bin ./fabric-samples
mv config ./fabric-samples
# 配置环境变量
sudo vim /etc/profile
# config go
export GOROOT=/usr/local/go
export GOPATH=/home/wjc/gopath
export GOPROXY=https://goproxy.cn,direct
export GO111MODULE=on
# config fabric
export FABRICBIN=/mnt/d/workspace/blockchain/todo-blockchain/fabric-test/fabric-samples/bin
# config path
PATH=$PATH:${GOROOT}/bin:${FABRICBIN}
export PATH
source /etc/profile
```

### test-network

参照 https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html

```shell
cd fabric-samples/test-network
# up network
./network.sh up

# create channel
./network.sh createChannel # 默认创建mychannel
./network.sh createChannel -c channel1

# starting a chaincode on the channel
cd ./asset-transfer-basic/chaincode-go
go mod vendor
cd ../test-network/
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-go -ccl go
```

`-cnn`: 指定通道名称，默认`basic` 表示`mychannel`

`-ccp`: 指定链码路径

`-ccl`: 指定链码语言

```shell
# point to the core.yaml file core.yml
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
# Environment variables for Org1
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# initialize the ledger
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"InitLedger","Args":[]}'
# get list of aseets
peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}'
# transferAsset，将资产asset6转移给Christopher
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"TransferAsset","Args":["asset6","Christopher"]}'

# query Org2
# Environment variables for Org2
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
# query asserts，发现资产asset6已经转移给Christopher
peer chaincode query -C mychannel -n basic -c '{"Args":["ReadAsset","asset6"]}'

# down network
cd $PWD # fix sometime win10 wls2 docker-compose cant work
./network.sh down
```

## 部署一个生产网络

```shell
mkdir fabirc-test/twonodes
cd twonodes
```

### cryptogen命令生成证书文件

```shell
cryptogen template > cryto-config.yaml
cryptogen generate --config=crypto-config.yaml
```

### configtx.yaml来创建通道配置

```shell
cp ../fabric-samples/test-network/configtx/configtx.yaml .
# 更改配置文件的证书路径跟profilefs
vim configtx.yaml
```
```yaml
MSPDir: ./crypto-config/peerOrganizations/org1.example.com/msp

AnchorPeers:
    - Host: 127.0.0.1
    Port: 7051

Profiles:
    TwoOrgsOrdererGenesis:
        <<: *ChannelDefaults
        Orderer:
            <<: *OrdererDefaults
            Organizations:
                - *OrdererOrg
            Capabilities:
                <<: *OrdererCapabilities
        Consortiums:
            SampleConsortium:
                Organizations:
                    - *Org1
                    - *Org2

    TwoOrgsChannel:
        Consortium: SampleConsortium
        <<: *ChannelDefaults
        Application:
            <<: *ApplicationDefaults
            Organizations:
                - *Org1
                - *Org2
            Capabilities:
                <<: *ApplicationCapabilities
```

```shell
# 配置FABRIC_CFG_PATH为当前目录
export FABRIC_CFG_PATH=$PWD
# 创建
mkdir channel-artifacts
# 生成创世块文件
configtxgen -profile TwoOrgsOrdererGenesis -outputBlock ./channel-artifacts/genesis.block -channelID fabric-channel
# 生成通道文件
configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID mychannel
# 生成Org1的锚节点文件
configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP
# 生成Org2的锚节点文件
configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID mychannel -asOrg Org2MSP
```

### docker-compose 创建peer节点

```shell
cp ../fabric-samples/test-network/docker/docker-compose-test-net.yaml ./docker-compose.yaml
vim docker-compose.yaml
docker system prune -af
docker-compose down
docker volumn prune
docker-compose up -d
```

### peer channel

#### 创建通道

```shell
docker exec -it cli1 bash
# 创建通道
peer channel create -o orderer.example.com:7050 -c mychannel -f ./channel-artifacts/channel.tx --tls true --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/msp/tlscacerts/tlsca.example.com-cert.pem
# 退出容器
exit
# 复制cli1生成的mychannel.block到cli2
docker cp cli1:/opt/gopath/src/github.com/hyperledger/fabric/peer/mychannel.block ./
docker cp ./mychannel.block cli2:/opt/gopath/src/github.com/hyperledger/fabric/peer
rm -rf mychannel.block
```

#### 加入通道

```shell
# Org1 join
docker exec -it cli1 bash
peer channel join -b mychannel.block
exit
# Org2 join
docker exec -it cli2 bash
peer channel join -b mychannel.block
exit
```

