# Polymarket BSC Frontend

Next.js 14 前端应用，用于去中心化预测市场平台。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.local.example .env.local
# 编辑 .env.local 文件
```

必填配置：
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_CHAIN_ID=97  # 56 = BSC Mainnet, 97 = BSC Testnet
NEXT_PUBLIC_CTF_ADDRESS=0x...
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_AMM_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 3. 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:3000`

## 📋 功能特性

### ✅ 已实现的功能

#### 页面
- **首页** (`/`) - 平台介绍和热门市场
- **市场列表** (`/markets`) - 浏览所有市场，支持搜索和筛选
- **市场详情** (`/markets/[id]`) - 查看市场详情和进行交易
- **用户中心** (`/portfolio`) - 查看持仓、订单和交易历史

#### 组件
- **MarketCard** - 市场卡片展示
- **MarketList** - 市场列表
- **PlatformStats** - 平台统计数据
- **OrderBook** - 实时订单簿
- **TradeForm** - 交易表单（买入/卖出）
- **ConnectButton** - 钱包连接按钮（RainbowKit）

#### Hooks
- **useMarkets** - 获取市场列表
- **useMarket** - 获取单个市场
- **useMarketStats** - 平台统计
- **useTrendingMarkets** - 热门市场
- **useUserOrders** - 用户订单
- **useUserTrades** - 用户交易历史
- **useUserPositions** - 用户持仓
- **useOrderBook** - 实时订单簿
- **useBestPrices** - 最佳买卖价

## 🏗️ 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   ├── providers.tsx      # 全局 Provider
│   ├── markets/
│   │   ├── page.tsx       # 市场列表页
│   │   └── [id]/
│   │       └── page.tsx   # 市场详情页
│   └── portfolio/
│       └── page.tsx       # 用户中心
│
├── components/
│   ├── market/
│   │   ├── MarketCard.tsx
│   │   ├── MarketList.tsx
│   │   └── PlatformStats.tsx
│   └── trading/
│       ├── OrderBook.tsx
│       └── TradeForm.tsx
│
├── hooks/
│   ├── useMarkets.ts      # 市场相关 Hooks
│   ├── useTrading.ts      # 交易相关 Hooks
│   └── useOrderBook.ts    # 订单簿相关 Hooks
│
├── lib/
│   ├── api/
│   │   └── client.ts      # API 客户端
│   └── web3/
│       ├── config.ts      # Web3 配置
│       └── contracts.ts   # 合约 ABI 和地址
│
├── styles/
│   └── globals.css        # 全局样式
│
└── types/
    └── index.ts           # TypeScript 类型定义
```

## 🎨 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **Web3**: wagmi + viem
- **钱包**: RainbowKit
- **状态管理**: TanStack Query (React Query)
- **日期处理**: date-fns

## 🔗 连接后端 API

前端通过 API 客户端连接后端：

```typescript
import { apiClient } from '@/lib/api/client';

// 获取市场列表
const markets = await apiClient.getMarkets({ category: 'Crypto' });

// 获取市场详情
const market = await apiClient.getMarket(marketId);

// 创建订单
await apiClient.createOrder({
  marketId,
  userAddress,
  side: 'BUY',
  outcome: 'YES',
  ...
});
```

## 🌐 钱包集成

使用 RainbowKit 连接钱包：

```typescript
import { ConnectButton } from '@rainbow-me/rainbowkit';

// 在组件中使用
<ConnectButton />

// 获取连接状态
import { useAccount } from 'wagmi';
const { address, isConnected } = useAccount();
```

支持的钱包：
- MetaMask
- Trust Wallet
- Binance Wallet
- WalletConnect

## 📊 数据获取

使用 TanStack Query 管理数据：

```typescript
import { useMarket } from '@/hooks/useMarkets';

function MarketDetail({ id }: { id: string }) {
  const { data: market, isLoading } = useMarket(id);

  if (isLoading) return <div>Loading...</div>;

  return <div>{market.title}</div>;
}
```

自动特性：
- 自动缓存
- 自动重新获取
- 加载和错误状态
- 乐观更新

## 🎯 关键功能说明

### 市场浏览
- 分类筛选（Crypto, Politics, Sports, etc.）
- 搜索功能
- 排序（交易量、最新、即将结束）
- 分页加载

### 市场交易
- 市价单交易
- 限价单交易
- 实时订单簿
- 滑点保护
- Gas 费预估

### 用户中心
- 持仓管理
- 订单管理
- 交易历史
- 盈亏统计

## 🔧 开发

### 添加新页面
```bash
# 创建新页面
mkdir src/app/my-page
touch src/app/my-page/page.tsx
```

### 添加新组件
```typescript
// src/components/my-component/MyComponent.tsx
export function MyComponent() {
  return <div>My Component</div>;
}
```

### 添加新 Hook
```typescript
// src/hooks/useMyData.ts
import { useQuery } from '@tanstack/react-query';

export function useMyData() {
  return useQuery({
    queryKey: ['my-data'],
    queryFn: () => apiClient.getMyData(),
  });
}
```

## 📦 构建

```bash
# 开发环境
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 类型检查
npm run type-check

# Lint
npm run lint
```

## 🚀 部署

### Vercel 部署（推荐）
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 手动部署
```bash
# 构建
npm run build

# 启动
npm start
```

环境变量设置：
- 在 Vercel Dashboard 或部署平台配置环境变量
- 确保所有 `NEXT_PUBLIC_*` 变量已设置

## ⚠️ 注意事项

1. **环境变量**
   - 不要提交 `.env.local` 文件
   - 确保所有必需的环境变量已配置

2. **钱包连接**
   - 需要有效的 WalletConnect Project ID
   - 确保网络配置正确（BSC Mainnet/Testnet）

3. **API 连接**
   - 确保后端 API 正在运行
   - 检查 CORS 配置

4. **合约地址**
   - 部署合约后更新合约地址
   - 确保使用正确的网络

## 🐛 故障排除

### 钱包无法连接
- 检查 MetaMask 是否切换到 BSC 网络
- 确认 `NEXT_PUBLIC_CHAIN_ID` 配置正确

### API 请求失败
- 检查 `NEXT_PUBLIC_API_URL` 是否正确
- 确认后端服务正在运行
- 查看浏览器控制台的错误信息

### 构建失败
- 运行 `npm install` 确保依赖已安装
- 检查 TypeScript 类型错误
- 确保环境变量已设置

## 📚 相关资源

- [Next.js 文档](https://nextjs.org/docs)
- [wagmi 文档](https://wagmi.sh)
- [RainbowKit 文档](https://www.rainbowkit.com)
- [TanStack Query 文档](https://tanstack.com/query)
- [Tailwind CSS 文档](https://tailwindcss.com)

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 开启 Pull Request
