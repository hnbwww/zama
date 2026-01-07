# 🎯 Polymarket BSC - 去中心化预测市场平台

基于 BSC（币安智能链）的完整预测市场平台，包含 P0 + P1 所有功能。

## 📋 项目概述

这是一个 Polymarket 的完整复刻版本，运行在 BSC 链上，包含：
- ✅ 智能合约系统（Solidity）
- ✅ 后端 API（NestJS）
- ✅ 前端应用（Next.js 14）
- ✅ 实时数据推送（WebSocket）
- ✅ 订单簿 + AMM 双交易模式

## 🏗️ 项目结构

```
polymarket-bsc/
├── contracts/          # 智能合约
│   ├── core/          # 核心合约
│   │   ├── ConditionalTokens.sol    # YES/NO 代币
│   │   └── MarketFactory.sol        # 市场工厂
│   ├── trading/       # 交易合约
│   │   ├── AMM.sol                  # 自动做市商
│   │   └── OrderBook.sol            # 订单簿
│   ├── scripts/       # 部署脚本
│   └── test/          # 测试文件
│
├── backend/           # 后端 API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── markets/        # 市场管理
│   │   │   ├── trading/        # 交易逻辑
│   │   │   ├── orderbook/      # 订单簿引擎
│   │   │   └── blockchain/     # 区块链交互
│   │   ├── database/           # 数据库模型
│   │   └── websocket/          # WebSocket 服务
│   └── prisma/                 # 数据库 Schema
│
├── frontend/          # 前端应用
│   ├── src/
│   │   ├── app/              # Next.js 页面
│   │   ├── components/       # React 组件
│   │   ├── hooks/            # 自定义 Hooks
│   │   └── lib/              # 工具库
│   └── public/               # 静态资源
│
└── docs/              # 文档
```

## 🎯 核心功能

### P0 - 核心功能
- ✅ 钱包连接（MetaMask, Trust Wallet, Binance Wallet）
- ✅ 市场浏览与搜索
- ✅ AMM 快速交易
- ✅ 订单簿市价单交易
- ✅ 用户持仓管理
- ✅ 自动结算系统
- ✅ USDC 充值/提现

### P1 - 增强功能
- ✅ 限价单交易
- ✅ 市场创建功能
- ✅ 流动性提供（LP）
- ✅ TradingView 价格图表
- ✅ 实时数据推送
- ✅ 高级搜索与筛选

## 🚀 快速开始

### 前置要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14
- Redis >= 6.0

### 1. 智能合约部署

```bash
cd contracts

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入您的私钥和配置

# 编译合约
npm run compile

# 运行测试
npm test

# 部署到 BSC 测试网
npm run deploy:testnet

# 部署到 BSC 主网
npm run deploy:mainnet
```

### 2. 后端部署

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 运行数据库迁移
npm run migrate

# 启动开发服务器
npm run start:dev

# 启动生产服务器
npm run start:prod
```

### 3. 前端部署

```bash
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 文件

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 🔧 技术栈

### 智能合约
- Solidity 0.8.20
- Hardhat
- OpenZeppelin Contracts
- Ethers.js

### 后端
- NestJS
- PostgreSQL + Prisma
- Redis
- Socket.io
- Bull Queue

### 前端
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- wagmi + viem
- TradingView Lightweight Charts

## 📊 智能合约架构

### ConditionalTokens.sol
条件代币合约，负责铸造和管理 YES/NO 代币。

**核心功能：**
- `prepareCondition()` - 创建新条件
- `splitPosition()` - 分割 USDC 为 YES/NO 代币
- `mergePositions()` - 合并 YES/NO 代币为 USDC
- `resolveCondition()` - 结算市场
- `redeemPositions()` - 赎回获胜代币

### MarketFactory.sol
市场工厂合约，负责创建和管理预测市场。

**核心功能：**
- `createMarket()` - 创建新市场
- `resolveMarket()` - 结算市场
- `disputeMarket()` - 提出争议
- `updateVolume()` - 更新交易量

### AMM.sol
自动做市商合约，使用恒定乘积公式。

**核心功能：**
- `createPool()` - 创建流动性池
- `addLiquidity()` - 添加流动性
- `removeLiquidity()` - 移除流动性
- `swap()` - 执行交易
- `getCurrentPrice()` - 获取当前价格

### OrderBook.sol
订单簿合约，支持链下签名、链上结算。

**核心功能：**
- `fillOrder()` - 执行订单
- `cancelOrder()` - 取消订单
- `getOrderStatus()` - 查询订单状态
- `validateOrderSignature()` - 验证订单签名

## 🗄️ 数据库设计

### 主要表结构

**markets** - 市场信息
- id, title, description, category
- creator_address, contract_address
- settlement_time, resolution_result
- total_volume, liquidity, yes_price, no_price

**orders** - 订单记录
- id, market_id, user_address
- side (BUY/SELL), outcome (YES/NO)
- order_type (MARKET/LIMIT), price, size
- status, tx_hash, signature

**trades** - 交易记录
- id, market_id
- buyer_address, seller_address
- price, size, tx_hash

**positions** - 用户持仓
- market_id, user_address
- yes_balance, no_balance
- cost_basis, realized_pnl

## 🔐 安全考虑

- ✅ 使用 OpenZeppelin 安全合约库
- ✅ 所有外部调用使用 ReentrancyGuard
- ✅ 订单使用 ECDSA 签名验证
- ✅ 价格滑点保护
- ✅ 交易手续费保护平台收益
- ⚠️ 建议部署前进行专业安全审计

## 📝 配置说明

### 智能合约配置 (.env)
```bash
PRIVATE_KEY=your_private_key
BSCSCAN_API_KEY=your_api_key
USDC_ADDRESS=0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
PLATFORM_FEE=150  # 1.5%
MARKET_CREATION_STAKE=100  # 100 USDC
MIN_INITIAL_LIQUIDITY=500  # 500 USDC
```

### 后端配置 (.env)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/polymarket
REDIS_URL=redis://localhost:6379
BSC_RPC_URL=https://bsc-dataseed.binance.org/
CONTRACT_ADDRESS=0x...
```

### 前端配置 (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_CTF_ADDRESS=0x...
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_AMM_ADDRESS=0x...
NEXT_PUBLIC_ORDERBOOK_ADDRESS=0x...
```

## 🧪 测试

### 合约测试
```bash
cd contracts
npm test
npm run coverage
```

### 后端测试
```bash
cd backend
npm test
npm run test:e2e
```

### 前端测试
```bash
cd frontend
npm test
npm run test:e2e
```

## 📈 部署检查清单

- [ ] 智能合约已通过测试（覆盖率 > 90%）
- [ ] 合约已部署到测试网并验证
- [ ] 后端 API 已配置并运行
- [ ] 数据库迁移已完成
- [ ] Redis 缓存已配置
- [ ] 前端环境变量已配置
- [ ] WebSocket 服务正常运行
- [ ] 已配置监控和日志
- [ ] 已备份数据库
- [ ] 已设置 SSL 证书

## 🛠️ 开发路线图

### ✅ 已完成
- [x] 智能合约开发
- [x] Hardhat 配置
- [x] 部署脚本
- [x] 基础测试

### 🚧 进行中
- [ ] 后端 API 开发
- [ ] 前端应用开发
- [ ] WebSocket 实时数据
- [ ] 数据库优化

### 📅 计划中
- [ ] 移动端适配
- [ ] 多语言支持
- [ ] 高级图表分析
- [ ] 社交功能
- [ ] 通知系统

## 🤝 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- BSC 主网: https://bscscan.com
- BSC 测试网: https://testnet.bscscan.com
- Hardhat 文档: https://hardhat.org
- NestJS 文档: https://nestjs.com
- Next.js 文档: https://nextjs.org

## 💬 联系方式

- GitHub Issues: [提交问题](https://github.com/your-repo/issues)
- Discord: [加入社区](https://discord.gg/your-server)
- Twitter: [@YourProject](https://twitter.com/yourproject)

## ⚠️ 免责声明

本项目仅供学习和研究使用。使用本项目进行真实交易需要：
1. 完整的安全审计
2. 法律合规咨询
3. 充分的风险评估
4. 用户资金保护措施

作者不对因使用本项目造成的任何损失负责。

---

**🎉 祝您开发愉快！**
