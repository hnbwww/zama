# Polymarket BSC Backend API

NestJS 后端 API，提供市场管理、交易、订单簿等功能。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，填入数据库连接和合约地址
```

### 3. 运行数据库迁移
```bash
npm run prisma:generate
npm run migrate
```

### 4. 启动开发服务器
```bash
npm run start:dev
```

服务器将运行在 `http://localhost:3001`

## 📋 API 端点

### Markets API

```
GET    /api/markets              # 获取市场列表
GET    /api/markets/stats         # 获取平台统计
GET    /api/markets/trending      # 获取热门市场
GET    /api/markets/categories    # 获取分类列表
GET    /api/markets/:id           # 获取市场详情
```

**示例请求：**
```bash
# 获取所有市场
curl http://localhost:3001/api/markets

# 获取特定分类市场
curl http://localhost:3001/api/markets?category=Crypto&limit=10

# 搜索市场
curl http://localhost:3001/api/markets?search=Bitcoin

# 获取市场详情
curl http://localhost:3001/api/markets/{marketId}
```

### Trading API

```
POST   /api/trading/orders                    # 创建订单
GET    /api/trading/orders/:id                # 获取订单详情
DELETE /api/trading/orders/:id                # 取消订单
GET    /api/trading/users/:address/orders     # 获取用户订单
GET    /api/trading/markets/:id/orders        # 获取市场订单
POST   /api/trading/trades                    # 记录交易
GET    /api/trading/users/:address/trades     # 获取用户交易历史
GET    /api/trading/markets/:id/trades        # 获取市场交易历史
GET    /api/trading/users/:address/positions  # 获取用户持仓
GET    /api/trading/users/:address/stats      # 获取用户统计
```

**示例请求：**
```bash
# 创建订单
curl -X POST http://localhost:3001/api/trading/orders \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "uuid",
    "userAddress": "0x...",
    "side": "BUY",
    "outcome": "YES",
    "orderType": "LIMIT",
    "price": 0.65,
    "size": 100,
    "signature": "0x...",
    "nonce": 1
  }'

# 获取用户持仓
curl http://localhost:3001/api/trading/users/0x.../positions
```

### OrderBook API

```
GET /api/orderbook/:marketId              # 获取订单簿
GET /api/orderbook/:marketId/best-prices  # 获取最佳买卖价
GET /api/orderbook/:marketId/depth        # 获取市场深度
```

**示例请求：**
```bash
# 获取订单簿
curl http://localhost:3001/api/orderbook/{marketId}

# 获取 NO 代币的订单簿
curl http://localhost:3001/api/orderbook/{marketId}?outcome=NO

# 获取市场深度
curl http://localhost:3001/api/orderbook/{marketId}/depth?levels=20
```

## 🔌 WebSocket 事件

### 连接
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
```

### 订阅市场更新
```javascript
// 订阅市场
socket.emit('subscribe:market', { marketId: 'xxx' });

// 监听价格更新
socket.on('price:update', (data) => {
  console.log('Price update:', data);
});

// 监听订单簿更新
socket.on('orderbook:update', (data) => {
  console.log('OrderBook update:', data);
});

// 监听新交易
socket.on('trade:new', (data) => {
  console.log('New trade:', data);
});

// 取消订阅
socket.emit('unsubscribe:market', { marketId: 'xxx' });
```

## 🗄️ 数据库

### Prisma 命令

```bash
# 生成 Prisma Client
npm run prisma:generate

# 运行迁移
npm run migrate

# 创建新迁移
npx prisma migrate dev --name add_new_feature

# 打开 Prisma Studio（数据库 GUI）
npm run prisma:studio

# 重置数据库（开发环境）
npx prisma migrate reset
```

### 数据库结构

主要表：
- `Market` - 市场信息
- `Order` - 订单记录
- `Trade` - 交易记录
- `Position` - 用户持仓
- `LiquidityPosition` - LP 持仓
- `User` - 用户统计
- `PriceHistory` - 价格历史

## 🧪 测试

```bash
# 单元测试
npm test

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

## 📦 构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm run start:prod
```

## 🔧 开发

### 项目结构

```
src/
├── main.ts                 # 应用入口
├── app.module.ts           # 根模块
├── database/               # 数据库
│   ├── prisma.service.ts
│   └── prisma.module.ts
└── modules/
    ├── markets/            # 市场管理
    │   ├── markets.controller.ts
    │   ├── markets.service.ts
    │   ├── markets.module.ts
    │   └── dto/
    ├── trading/            # 交易
    │   ├── trading.controller.ts
    │   ├── trading.service.ts
    │   ├── trading.module.ts
    │   └── dto/
    ├── orderbook/          # 订单簿
    │   ├── orderbook.controller.ts
    │   ├── orderbook.service.ts
    │   └── orderbook.module.ts
    ├── blockchain/         # 区块链集成
    │   ├── blockchain.service.ts
    │   └── blockchain.module.ts
    └── websocket/          # WebSocket
        ├── websocket.gateway.ts
        └── websocket.module.ts
```

### 添加新的 API

1. 创建模块：
```bash
nest generate module mymodule
nest generate controller mymodule
nest generate service mymodule
```

2. 实现服务逻辑
3. 创建 DTO
4. 在 app.module.ts 中导入

## 🐛 调试

### 启动调试模式
```bash
npm run start:debug
```

### 查看日志
日志级别可在 `.env` 中配置：
```
LOG_LEVEL=debug  # debug | info | warn | error
```

## 🚀 部署

### Railway 部署
```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up
```

### Docker 部署
```bash
# 构建镜像
docker build -t polymarket-backend .

# 运行容器
docker run -p 3001:3001 --env-file .env polymarket-backend
```

## ⚠️ 注意事项

1. **数据库**
   - 确保 PostgreSQL 正在运行
   - 运行迁移前备份数据库

2. **环境变量**
   - 不要提交 .env 文件
   - 生产环境使用强密码

3. **区块链连接**
   - 确保 RPC URL 可用
   - 合约地址必须正确

4. **WebSocket**
   - 注意连接数限制
   - 生产环境配置 Redis 适配器

## 📚 相关资源

- [NestJS 文档](https://docs.nestjs.com)
- [Prisma 文档](https://www.prisma.io/docs)
- [Socket.io 文档](https://socket.io/docs)
- [ethers.js 文档](https://docs.ethers.org)

## 🆘 常见问题

### Q: 数据库连接失败？
A: 检查 `DATABASE_URL` 是否正确，PostgreSQL 是否运行。

### Q: 无法连接到 BSC？
A: 检查 `BSC_RPC_URL` 是否可用，尝试使用备用 RPC。

### Q: WebSocket 无法连接？
A: 检查 CORS 配置，确保前端 URL 在白名单中。

### Q: Prisma 迁移失败？
A: 先运行 `npm run prisma:generate`，然后重试迁移。
