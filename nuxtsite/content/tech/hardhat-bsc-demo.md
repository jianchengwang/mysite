---
title: hardhat-bsc-demo
createdAt: 2021-09-29
categories: 
- blockchain
- bsc
tags: 
- blockchain
- bsc


---

 币安智能链是一种创新的解决方案，为币安链带来可编程性和互操作性。币安智能链依赖于一个由21个验证者组成的系统，该系统具有权益证明(PoSA)共识，可以支持更短的区块时间和更低的费用。最具粘合性的验证器候选区块将成为验证器和生产区块。双符号检测和其他斩控逻辑保证了安全性、稳定性和链的终结性。以上来自复制于官网，感兴趣的可以自行查阅，[binance-smart-chain](https://docs.binance.org/smart-chain/guides/bsc-intro.html)

本文只简单介绍一下，通过`hardhat`创建一个智能合约代币，然后部署到币安智能链的流程。

<!--more-->

## MetaMask

首先安装一下以太坊钱包，这里，可以到[谷歌商店安装插件](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn)，然后创建账号，注意保存好助记符`mnemonic`

新增一个币安的测试链网络，参考官方开发文档，[rpc配置](https://docs.binance.org/smart-chain/developer/rpc.html)

1. 网络名称： BSC Testnet  (自定义)
2. PRC URL： https://data-seed-prebsc-1-s1.binance.org:8545
3.  链ID：97
4. 代币符号： BNB
5. 区块链浏览器：https://testnet.bscscan.com/

然后可以到这个网站24小时领取一个BNB，[https://testnet.binance.org/faucet-smart ](https://testnet.binance.org/faucet-smart)，用于支付`gas`，

如果是`ETH`可以到这个网站免费领取，https://faucet.ropsten.be/

## Develop Enviroment

因为币安链是基于以太坊的，所以智能合约的开发语言是[solidity](https://docs.soliditylang.org/en/v0.8.8/)，你可以使用[remix](https://remix.ethereum.org/)在线编辑，

我这里在本地进行开发，基于[hardhat](https://hardhat.org/)框架开发，合约类型为[ERC20](https://eips.ethereum.org/EIPS/eip-20)，为了简便开发，可以到[openzeppelin](https://docs.openzeppelin.com/openzeppelin/)根据需要生成对应的智能合约模板，

下面根据[官方文档](https://docs.binance.org/smart-chain/developer/deploy/hardhat.html)，设置下基础环境，

```shell
# install node.js
# install hardhat
npm install --save-dev hardhat
# install recommand dependencies
npm install --save-dev @nomiclabs/hardhat-waffle ethereum-waffle chai @nomiclabs/hardhat-ethers ethers
# mkdir project
mkdir hardhat-demo
cd hardhat-demo
# init
npx hardhat
Once this project is initialized, you'll now have a project structure with the following items:
contracts/: Directory for Solidity contracts
scripts/: Directory for scriptable deployment files
test/: Directory for test files for testing your application and contracts
hardhat-config.js: Hardhat configuration file
```

这里本地使用`vscode`进行开发，搜索下solidity相关插件安装支持语法高亮，自此开发环境搭建完成。

## Smart Contract

代币合约代码，这个根据业务需要自行编辑，这里不多赘述

### compile

```shell
npx hardhat compile
```

### test

```shell
npx hardhat test
```

### localhost

hardhat内置了eth的节点网络，方便本地开发，

```shell
# kill 8545
lsof -i :8545
# or window
netstat -aon|findstr "8545"
tasklist|findstr "23292"
taskkill /f /t /im "23292"

# 启动localhost网络
npx hardhat node
# 复制初始的钱包密钥，导入metamask

# 部署到测试网络
npx hardhat run --network localhost scripts/deploy.js

# 编译合约生成java封装类
solc <smart-contract>.sol –bin –abi –optimize -o <output-dir>/
web3j solidity generate -b /path/to/<smart-contract>.bin \
        -a /path/to/<smart-contract>.abi \
        -o /path/to/src/main/java \
        -p com.your.organisation.name
```

### deploying

首先在`hardhat.config.js`配置下网络信息，

```js
require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
const { mnemonic } = require('./secrets.json');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "mainnet",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: {mnemonic: mnemonic}
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: {mnemonic: mnemonic}
    }
  },
  solidity: {
  version: "0.5.16",
  settings: {
    optimizer: {
      enabled: true
    }
   }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  }
};
```

这里的`mnemonic`就是我们之前创建的以太坊的钱包助记符，

然后我们可以部署到测试网络，

```shell
npx hardhat run --network testnet scripts/deploy.js
```

部署成功的话，我们就可以通过代币合约地址，在metamask上面添加代币信息了，

### verify

如果代币智能合约没校验的话，是不能进行`read`，`write`操作的，

需要安装插件

```shell
npm install --save-dev @nomiclabs/hardhat-etherscan
```

然后配置文件，`hardhat.config.js`引入，并添加[Bscscan API key](https://bscscan.com/myapikey)

```js
require("@nomiclabs/hardhat-etherscan");

module.exports = {
  // ...
  etherscan: {
    apiKey: apiKey
  }
}
```

执行校验命令，

```shell
npx hardhat  verify --network testnet 0x25F547DeE6A315dc841830B7bB72fC9CE6EbF420
```

`0x25F547DeE6A315dc841830B7bB72fC9CE6EbF420`为代币合约地址

执行后，可以看到如下输出，

```shell
Nothing to compile
Compiling 1 file with 0.8.2
Successfully submitted source code for contract
contracts/PerformanceToken.sol:Token at 0x25F547DeE6A315dc841830B7bB72fC9CE6EbF420
for verification on Etherscan. Waiting for verification result...

Successfully verified contract Token on Etherscan.
https://testnet.bscscan.com/address/0x25F547DeE6A315dc841830B7bB72fC9CE6EbF420#code
```

我们可以到地址[https://testnet.bscscan.com/address/0x25F547DeE6A315dc841830B7bB72fC9CE6EbF420#code](https://testnet.bscscan.com/address/0x25F547DeE6A315dc841830B7bB72fC9CE6EbF420#code)

就可以对代币合约进行，`read`，`write`操作了，

## 本地开发

### localhost network

hardhat内置了eth的节点网络，方便本地开发，

```shell
# kill 8545
lsof -i :8545
# or window
netstat -aon|findstr "8545"
tasklist|findstr "23292"
taskkill /f /t /im "23292"

# 启动localhost网络
npx hardhat node
# 复制初始的钱包密钥，导入metamask

# 部署到测试网络
npx hardhat run --network localhost scripts/deploy.js
```

### build java

首先要编译输出abi，

```shell
 npm install -g solc
 solcjs <smart-contract>.sol –bin –abi –optimize -o <output-dir>
```

我们这边应该使用hardhat框架的插件

```shell
# 这里使用hardhat插件
yarn add --dev hardhat-abi-exporter
```

 编辑`harthat.config.js`

```js
require('hardhat-abi-exporter');

```

我们这边后端使用java调用，

这里用到https://github.com/web3j/web3j这个类库，

然后从[这里](https://github.com/web3j/web3j/releases)下载web3j命令行工具，解压并设置PATH环境变量，以便可以在任何目录调用。

```shell
Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/web3j/web3j-installer/master/installer.ps1'))
```

所以我们需要把智能合约编译，并生成java的封装类，

```shell
web3j solidity generate -b /path/to/<smart-contract>.bin \
        -a /path/to/<smart-contract>.abi \
        -o /path/to/src/main/java \
        -p com.your.organisation.name
```

```shell

 
```



## 相关链接

[MetaMask](https://metamask.io/)

[docs.binance.org](https://docs.binance.org/smart-chain/developer)

[hardhat](https://hardhat.org/)

[openzeppelin](https://docs.openzeppelin.com/openzeppelin/)

[oneclickdapp](https://oneclickdapp.com/)

