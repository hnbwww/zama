# 🏗️ Polymarket BSC - 架构设计文档

## 系统架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                                │
│  (MetaMask, Trust Wallet, Binance Wallet)                   │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                      前端应用层                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Next.js 14  │  │    wagmi     │  │ Socket.io    │      │
│  │  React 18    │  │    viem      │  │   Client     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────┬───────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼─────────┐   ┌───────▼─────────┐  ┌──────▼─────────┐
│   后端 API      │   │  BSC 区块链     │  │  WebSocket     │
│   (NestJS)      │   │   节点 RPC      │  │     服务       │
│                 │   │                 │  │                │
│  ┌───────────┐  │   │  ┌──────────┐  │  │  ┌──────────┐  │
│  │  REST API │  │   │  │  智能合约 │  │  │  │ 实时推送  │  │
│  ├───────────┤  │   │  ├──────────┤  │  │  ├──────────┤  │
│  │订单簿引擎 │  │   │  │   CTF    │  │  │  │价格更新   │  │
│  ├───────────┤  │   │  ├──────────┤  │  │  ├──────────┤  │
│  │事件监听器 │  │   │  │  Factory │  │  │  │订单簿更新 │  │
│  └───────────┘  │   │  ├──────────┤  │  │  └──────────┘  │
│                 │   │  │   AMM    │  │  │                │
└────────┬────────┘   │  ├──────────┤  │  └────────────────┘
         │            │  │OrderBook │  │
         │            │  └──────────┘  │
         │            └─────────────────┘
         │
┌────────▼────────────────────────────────┐
│          数据存储层                      │
│  ┌──────────────┐    ┌──────────────┐  │
│  │ PostgreSQL   │    │    Redis     │  │
│  │ (主数据库)    │    │  (缓存/队列)  │  │
│  └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────┘
```

## 核心模块设计

### 1. 智能合约层

#### ConditionalTokens (CTF)
**职责：** 管理条件代币（YES/NO 代币）

**核心功能：**
- `prepareCondition()` - 创建新市场条件
- `splitPosition()` - 分割 USDC → YES + NO 代币
- `mergePositions()` - 合并 YES + NO → USDC
- `resolveCondition()` - 结算市场
- `redeemPositions()` - 赎回获胜代币

**存储：**
```solidity
struct Condition {
    bytes32 questionId;
    uint256 outcomeSlotCount;  // 固定为 2
    address oracle;
    uint256 payoutNumerator;    // 0=NO, 1=YES, 2=未定
    bool resolved;
}

mapping(bytes32 => Condition) conditions;
mapping(bytes32 => mapping(uint256 => uint256)) positionIds;
```

#### MarketFactory
**职责：** 创建和管理预测市场

**核心功能：**
- `createMarket()` - 创建新市场
- `resolveMarket()` - 结算市场
- `disputeMarket()` - 提出争议
- `updateVolume()` - 更新交易量

**市场状态流转：**
```
ACTIVE → RESOLVED
   ↓
DISPUTED → RESOLVED/CANCELLED
```

#### AMM (自动做市商)
**职责：** 提供即时流动性和价格发现

**定价公式：**
```
恒定乘积：x * y = k
价格 = y / (x + y)

其中：
x = YES 代币储备
y = NO 代币储备
k = 常数
```

**核心功能：**
- `swap()` - 执行交易
- `addLiquidity()` - 添加流动性
- `removeLiquidity()` - 移除流动性
- `getCurrentPrice()` - 获取当前价格

**手续费：**
- Swap 手续费：0.3% (可调整)
- LP 收益：100% 手续费归 LP

#### OrderBook
**职责：** 处理限价单交易

**订单结构：**
```solidity
struct Order {
    bytes32 conditionId;
    address maker;
    bool buyYes;
    uint256 price;     // 1e18 精度
    uint256 size;
    uint256 filled;
    uint256 nonce;
    uint256 expiry;
    bytes signature;   // EIP-712 签名
}
```

**订单匹配流程：**
```
1. 用户链下签名订单
2. 订单提交到后端
3. 后端维护订单簿
4. Taker 调用 fillOrder()
5. 链上验证签名并执行
```

---

### 2. 后端架构

#### 技术栈
- **框架：** NestJS
- **数据库：** PostgreSQL + Prisma ORM
- **缓存：** Redis
- **队列：** Bull
- **WebSocket：** Socket.io

#### 模块划分

```
backend/src/
├── modules/
│   ├── markets/              # 市场管理
│   │   ├── markets.controller.ts
│   │   ├── markets.service.ts
│   │   └── markets.module.ts
│   │
│   ├── trading/              # 交易逻辑
│   │   ├── trading.controller.ts
│   │   ├── trading.service.ts
│   │   └── trading.module.ts
│   │
│   ├── orderbook/            # 订单簿引擎
│   │   ├── orderbook.service.ts
│   │   ├── matching-engine.ts
│   │   └── orderbook.module.ts
│   │
│   ├── blockchain/           # 区块链交互
│   │   ├── blockchain.service.ts
│   │   ├── event-listener.ts
│   │   └── blockchain.module.ts
│   │
│   └── websocket/            # WebSocket
│       ├── websocket.gateway.ts
│       └── websocket.module.ts
│
├── database/
│   ├── prisma.service.ts
│   └── models/
│
└── config/
    ├── database.config.ts
    ├── redis.config.ts
    └── blockchain.config.ts
```

#### 订单簿引擎设计

**数据结构：**
```typescript
interface OrderBookState {
  marketId: string;
  bids: PriceLevel[];  // 买单（降序）
  asks: PriceLevel[];  // 卖单（升序）
}

interface PriceLevel {
  price: number;
  orders: Order[];
  totalSize: number;
}
```

**撮合算法：**
```
1. 接收新订单
2. 检查对手盘是否有可匹配订单
3. 按价格优先、时间优先原则匹配
4. 生成链上交易
5. 更新订单簿状态
6. 广播更新（WebSocket）
```

#### 事件监听器

**监听的链上事件：**
- `ConditionPrepared` - 新市场创建
- `PositionSplit` - 用户铸造代币
- `PositionMerged` - 用户销毁代币
- `Swap` - AMM 交易
- `OrderFilled` - 订单成交
- `ConditionResolved` - 市场结算

**处理流程：**
```typescript
async function handleEvent(event: Event) {
  // 1. 解析事件数据
  const data = parseEvent(event);

  // 2. 更新数据库
  await updateDatabase(data);

  // 3. 更新缓存
  await updateCache(data);

  // 4. 推送到前端
  websocket.emit('event', data);
}
```

---

### 3. 前端架构

#### 技术栈
- **框架：** Next.js 14 (App Router)
- **UI：** Tailwind CSS + shadcn/ui
- **Web3：** wagmi + viem
- **状态管理：** Zustand
- **图表：** TradingView Lightweight Charts

#### 页面结构

```
app/
├── page.tsx                 # 首页
├── markets/
│   ├── page.tsx            # 市场列表
│   ├── [id]/
│   │   └── page.tsx        # 市场详情 + 交易
│   └── create/
│       └── page.tsx        # 创建市场
├── portfolio/
│   └── page.tsx            # 用户中心
└── layout.tsx              # 根布局
```

#### 组件设计

**原子组件（Atomic）：**
- Button, Input, Card, Badge...

**复合组件（Composite）：**
- `MarketCard` - 市场卡片
- `OrderBook` - 订单簿
- `TradeForm` - 交易表单
- `PriceChart` - 价格图表

**页面组件（Page）：**
- `MarketList` - 市场列表页
- `MarketDetail` - 市场详情页
- `Portfolio` - 用户中心

#### 状态管理

```typescript
// 市场状态
interface MarketStore {
  markets: Market[];
  selectedMarket: Market | null;
  setMarkets: (markets: Market[]) => void;
  selectMarket: (id: string) => void;
}

// 交易状态
interface TradingStore {
  orderbook: OrderBook;
  userOrders: Order[];
  updateOrderbook: (data: OrderBook) => void;
}

// 用户状态
interface UserStore {
  address: string | null;
  balance: bigint;
  positions: Position[];
}
```

#### Web3 集成

**Hooks 封装：**
```typescript
// useMarket.ts
export function useMarket(marketId: string) {
  const { data: market } = useContractRead({
    address: CONTRACTS.MarketFactory,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getMarket',
    args: [marketId],
  });

  return { market };
}

// useTrading.ts
export function useTrading(marketId: string) {
  const { writeAsync } = useContractWrite({
    address: CONTRACTS.AMM,
    abi: AMM_ABI,
    functionName: 'swap',
  });

  const buyYes = async (amount: string) => {
    const tx = await writeAsync({
      args: [marketId, true, parseEther(amount), 0],
    });
    return tx;
  };

  return { buyYes };
}
```

---

## 数据流

### 创建市场流程

```
用户 → 前端 → MarketFactory.createMarket()
                    ↓
              合约创建市场
                    ↓
              触发 MarketCreated 事件
                    ↓
          后端监听事件 → 写入数据库
                    ↓
             WebSocket 推送更新
                    ↓
              前端刷新市场列表
```

### AMM 交易流程

```
用户输入交易金额
        ↓
前端调用 getAmountOut() 计算输出
        ↓
用户确认交易
        ↓
1. approve USDC
2. 调用 AMM.swap()
        ↓
合约执行：
  - 收取 USDC
  - splitPosition (铸造 YES+NO)
  - 交换代币
  - 更新储备量
        ↓
触发 Swap 事件
        ↓
后端处理：
  - 记录交易
  - 更新市场数据
  - 推送价格更新
        ↓
前端显示交易成功
```

### 限价单交易流程

```
1. 用户创建订单
        ↓
2. 前端生成 EIP-712 签名
        ↓
3. 提交订单到后端
        ↓
4. 后端验证并存储
        ↓
5. 更新订单簿
        ↓
6. WebSocket 广播
        ↓
7. Taker 看到订单
        ↓
8. 调用 OrderBook.fillOrder()
        ↓
9. 链上验证签名
        ↓
10. 执行交易
        ↓
11. 触发 OrderFilled 事件
        ↓
12. 后端更新订单状态
        ↓
13. 通知双方交易成功
```

---

## 性能优化

### 智能合约
- ✅ 使用 `immutable` 减少 gas
- ✅ 批量操作减少交易次数
- ✅ 事件索引优化查询
- ✅ 使用 `unchecked` 优化数学运算

### 后端
- ✅ Redis 缓存热门市场数据
- ✅ 数据库查询索引优化
- ✅ Bull 队列处理异步任务
- ✅ 连接池管理
- ✅ 分页查询

### 前端
- ✅ Next.js ISR 静态生成
- ✅ 图片懒加载
- ✅ React.memo 避免重渲染
- ✅ WebSocket 批量更新
- ✅ 虚拟滚动长列表

---

## 安全考虑

### 智能合约
- ✅ ReentrancyGuard 防重入
- ✅ SafeERC20 安全转账
- ✅ Ownable 权限控制
- ✅ 价格滑点保护
- ⚠️ 建议专业审计

### 后端
- ✅ JWT 认证
- ✅ Rate limiting
- ✅ SQL 注入防护（Prisma）
- ✅ CORS 配置
- ✅ 输入验证

### 前端
- ✅ XSS 防护
- ✅ HTTPS only
- ✅ 钱包签名验证
- ✅ 敏感数据不存储本地

---

## 扩展性设计

### 水平扩展
- 后端无状态，可多实例部署
- Redis 集群支持
- 数据库读写分离
- CDN 加速静态资源

### 功能扩展
- 插件化订单类型
- 多链部署（Polygon, Arbitrum）
- 预言机集成（Chainlink）
- 高级图表分析

---

**架构持续演进中...** 🚀
