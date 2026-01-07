# 🛠️ Polymarket BSC 开发指南

完整的开发指南，帮助您快速上手和扩展项目。

## 📚 目录

1. [环境搭建](#环境搭建)
2. [智能合约开发](#智能合约开发)
3. [后端开发](#后端开发)
4. [前端开发](#前端开发)
5. [测试与部署](#测试与部署)
6. [常见问题](#常见问题)

---

## 环境搭建

### 系统要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14
- Redis >= 6.0
- Git

### 克隆项目
```bash
git clone <your-repo-url>
cd polymarket-bsc
```

### 安装全局依赖
```bash
npm install -g hardhat
npm install -g @nestjs/cli
npm install -g prisma
```

---

## 智能合约开发

### 初始化

```bash
cd contracts
npm install
```

### 配置环境变量

创建 `.env` 文件：
```bash
cp .env.example .env
```

编辑 `.env`：
```bash
# BSC 测试网私钥（请勿提交到 Git！）
PRIVATE_KEY=your_private_key_here

# BscScan API Key（用于合约验证）
BSCSCAN_API_KEY=your_bscscan_api_key

# 合约配置
ADMIN_ADDRESS=0xYourAdminAddress
FEE_RECIPIENT=0xYourFeeRecipient
PLATFORM_FEE=150  # 1.5%
MARKET_CREATION_STAKE=100000000000000000000  # 100 USDC
MIN_INITIAL_LIQUIDITY=500000000000000000000  # 500 USDC

# USDC 合约地址（BSC 主网）
USDC_ADDRESS=0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
```

### 编译合约

```bash
npm run compile
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npx hardhat test test/ConditionalTokens.test.js

# 生成测试覆盖率报告
npm run coverage
```

### 部署合约

**部署到本地网络（测试）：**
```bash
# 启动本地节点
npx hardhat node

# 在另一个终端部署
npx hardhat run scripts/deploy.js --network localhost
```

**部署到 BSC 测试网：**
```bash
npm run deploy:testnet
```

**部署到 BSC 主网：**
```bash
npm run deploy:mainnet
```

### 验证合约

部署后，使用以下命令验证合约：
```bash
npx hardhat verify --network bscMainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 合约交互示例

```javascript
const { ethers } = require("hardhat");

async function main() {
  const ctf = await ethers.getContractAt(
    "ConditionalTokens",
    "0xYourContractAddress"
  );

  // 准备一个新条件
  const questionId = ethers.id("Will Bitcoin reach $100k?");
  const oracleAddress = "0xYourOracleAddress";

  const tx = await ctf.prepareCondition(questionId, oracleAddress);
  await tx.wait();

  console.log("Condition prepared!");
}

main();
```

---

## 后端开发

### 初始化

```bash
cd backend
npm install
```

### 配置数据库

创建 PostgreSQL 数据库：
```bash
createdb polymarket_bsc
```

配置 `.env`：
```bash
cp .env.example .env
```

编辑 `.env`：
```bash
# 数据库连接
DATABASE_URL="postgresql://username:password@localhost:5432/polymarket_bsc"

# Redis
REDIS_URL="redis://localhost:6379"

# BSC RPC
BSC_RPC_URL="https://bsc-dataseed.binance.org/"

# 合约地址（从部署结果中获取）
CTF_CONTRACT_ADDRESS=0x...
FACTORY_CONTRACT_ADDRESS=0x...
AMM_CONTRACT_ADDRESS=0x...
ORDERBOOK_CONTRACT_ADDRESS=0x...

# API 配置
PORT=3001
NODE_ENV=development

# JWT 密钥
JWT_SECRET=your_jwt_secret_here
```

### 运行数据库迁移

```bash
# 生成 Prisma Client
npm run prisma:generate

# 运行迁移
npm run migrate

# 打开 Prisma Studio（数据库 GUI）
npm run prisma:studio
```

### 启动开发服务器

```bash
npm run start:dev
```

服务器将运行在 `http://localhost:3001`

### API 端点

#### Markets API
```
GET    /api/markets              - 获取市场列表
GET    /api/markets/:id          - 获取市场详情
POST   /api/markets              - 创建新市场
GET    /api/markets/:id/orderbook - 获取订单簿
GET    /api/markets/:id/chart    - 获取价格图表数据
```

#### Trading API
```
POST   /api/orders               - 创建订单
DELETE /api/orders/:id           - 取消订单
GET    /api/orders/my            - 获取我的订单
POST   /api/trades               - 执行交易
```

#### User API
```
GET    /api/users/:address/portfolio - 获取用户持仓
GET    /api/users/:address/trades    - 获取交易历史
GET    /api/users/:address/pnl       - 获取盈亏统计
```

### WebSocket 事件

连接到 WebSocket：
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

// 订阅市场价格更新
socket.emit('subscribe', { marketId: '0x...' });

// 监听价格更新
socket.on('price_update', (data) => {
  console.log('New price:', data);
});

// 监听订单簿更新
socket.on('orderbook_update', (data) => {
  console.log('Orderbook:', data);
});
```

### 添加新的 API 端点

1. 创建模块：
```bash
nest generate module markets
nest generate controller markets
nest generate service markets
```

2. 实现服务逻辑：
```typescript
// src/modules/markets/markets.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MarketsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.market.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { totalVolume: 'desc' },
    });
  }
}
```

3. 创建控制器：
```typescript
// src/modules/markets/markets.controller.ts
import { Controller, Get } from '@nestjs/common';
import { MarketsService } from './markets.service';

@Controller('api/markets')
export class MarketsController {
  constructor(private marketsService: MarketsService) {}

  @Get()
  async getMarkets() {
    return this.marketsService.findAll();
  }
}
```

---

## 前端开发

### 初始化

```bash
cd frontend
npm install
```

### 配置环境变量

创建 `.env.local`：
```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：
```bash
# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# BSC 网络
NEXT_PUBLIC_CHAIN_ID=56  # 56 = BSC Mainnet, 97 = BSC Testnet

# 合约地址
NEXT_PUBLIC_CTF_ADDRESS=0x...
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_AMM_ADDRESS=0x...
NEXT_PUBLIC_ORDERBOOK_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 启动开发服务器

```bash
npm run dev
```

应用将运行在 `http://localhost:3000`

### 项目结构

```
frontend/src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 首页
│   ├── markets/
│   │   ├── page.tsx       # 市场列表
│   │   └── [id]/
│   │       └── page.tsx   # 市场详情
│   └── portfolio/
│       └── page.tsx       # 用户中心
│
├── components/
│   ├── market/
│   │   ├── MarketCard.tsx       # 市场卡片
│   │   ├── MarketList.tsx       # 市场列表
│   │   └── PriceChart.tsx       # 价格图表
│   ├── trading/
│   │   ├── OrderBook.tsx        # 订单簿
│   │   ├── TradeForm.tsx        # 交易表单
│   │   └── OrderHistory.tsx     # 订单历史
│   └── wallet/
│       └── ConnectButton.tsx    # 连接钱包按钮
│
├── hooks/
│   ├── useMarket.ts       # 市场数据 Hook
│   ├── useTrading.ts      # 交易 Hook
│   └── useWallet.ts       # 钱包 Hook
│
└── lib/
    ├── web3/              # Web3 配置和工具
    ├── api/               # API 客户端
    └── utils/             # 工具函数
```

### 使用 Web3 Hooks

```typescript
// app/markets/[id]/page.tsx
'use client';

import { useMarket } from '@/hooks/useMarket';
import { useTrading } from '@/hooks/useTrading';
import { useAccount } from 'wagmi';

export default function MarketPage({ params }: { params: { id: string } }) {
  const { address } = useAccount();
  const { market, loading } = useMarket(params.id);
  const { buyYes, buyNo } = useTrading(params.id);

  const handleBuy = async (amount: string) => {
    try {
      const tx = await buyYes(amount);
      console.log('Transaction:', tx);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{market.question}</h1>
      <button onClick={() => handleBuy('10')}>Buy 10 YES</button>
    </div>
  );
}
```

### 创建新组件

使用 shadcn/ui 创建组件：
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
```

自定义组件示例：
```typescript
// components/market/MarketCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MarketCardProps {
  market: {
    id: string;
    question: string;
    category: string;
    yesPrice: number;
    volume: number;
  };
}

export function MarketCard({ market }: MarketCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{market.question}</CardTitle>
        <Badge>{market.category}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-muted-foreground">YES</p>
            <p className="text-2xl font-bold text-yes">
              {(market.yesPrice * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Volume</p>
            <p className="text-lg">${market.volume.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 状态管理（Zustand）

```typescript
// store/marketStore.ts
import { create } from 'zustand';

interface MarketState {
  selectedMarket: string | null;
  setSelectedMarket: (id: string) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  selectedMarket: null,
  setSelectedMarket: (id) => set({ selectedMarket: id }),
}));
```

---

## 测试与部署

### 运行测试

**合约测试：**
```bash
cd contracts
npm test
```

**后端测试：**
```bash
cd backend
npm test
```

**前端测试：**
```bash
cd frontend
npm test
```

### 部署检查清单

#### 智能合约
- [ ] 测试覆盖率 > 90%
- [ ] Gas 优化完成
- [ ] 安全审计通过
- [ ] 部署到测试网并验证
- [ ] 测试网功能测试完成

#### 后端
- [ ] 数据库迁移已执行
- [ ] 环境变量已配置
- [ ] API 端点测试通过
- [ ] WebSocket 连接正常
- [ ] 日志和监控已配置

#### 前端
- [ ] 环境变量已配置
- [ ] 构建成功（无错误）
- [ ] 钱包连接测试通过
- [ ] 交易流程测试通过
- [ ] 响应式布局检查

### 生产部署

**后端部署（Railway/Render）：**
```bash
# 构建
npm run build

# 启动
npm run start:prod
```

**前端部署（Vercel）：**
```bash
# 构建
npm run build

# 预览
npm start
```

---

## 常见问题

### Q: 如何切换到 BSC 测试网？
A: 在前端 `.env.local` 中设置：
```bash
NEXT_PUBLIC_CHAIN_ID=97
```

### Q: 合约部署失败？
A: 检查：
1. 私钥是否正确
2. 账户是否有足够的 BNB
3. RPC URL 是否可用
4. Gas 价格是否合理

### Q: 数据库连接失败？
A: 检查：
1. PostgreSQL 是否运行
2. DATABASE_URL 是否正确
3. 数据库是否已创建
4. 防火墙设置

### Q: 前端无法连接钱包？
A: 检查：
1. MetaMask 是否安装
2. 网络是否切换到 BSC
3. WalletConnect Project ID 是否配置

### Q: 如何调试智能合约？
A: 使用 Hardhat console：
```bash
npx hardhat console --network bscTestnet
```

### Q: 如何查看合约事件？
A: 使用 ethers.js：
```javascript
const ctf = await ethers.getContractAt("ConditionalTokens", address);
const filter = ctf.filters.ConditionPrepared();
const events = await ctf.queryFilter(filter);
console.log(events);
```

---

## 下一步

1. 阅读 [API 文档](./API.md)
2. 查看 [架构设计](./ARCHITECTURE.md)
3. 加入 [开发者社区](https://discord.gg/yourserver)

---

**祝开发顺利！** 🚀
