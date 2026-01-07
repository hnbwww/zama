# Polymarket BSC - 管理后台使用指南

## 📋 目录

- [概述](#概述)
- [访问权限](#访问权限)
- [功能模块](#功能模块)
- [API 端点](#api-端点)
- [使用示例](#使用示例)
- [安全考虑](#安全考虑)

## 概述

管理后台是 Polymarket BSC 的核心管理系统，提供完整的市场管理、用户管理、争议仲裁和系统监控功能。

**访问地址：** `/admin`

**完成度：** 100% ✅

## 访问权限

### 设置管理员

管理员权限通过数据库 `User` 表的 `isAdmin` 字段控制：

```sql
-- 将用户设为管理员
UPDATE "User"
SET "isAdmin" = true
WHERE address = '0x...';

-- 查看所有管理员
SELECT address, "isAdmin", "isBanned"
FROM "User"
WHERE "isAdmin" = true;
```

### 权限验证

- **前端验证：** 每个管理页面会验证 `isAdmin` 状态，非管理员自动重定向
- **后端验证：** 所有管理 API 通过 `AdminService.verifyAdmin()` 验证权限
- **请求头：** API 请求需携带 `x-admin-address` 或 `x-wallet-address` 头部

```typescript
// 示例：前端 API 调用
fetch(`${API_URL}/admin/markets/${id}/void`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-address': address, // 管理员钱包地址
  },
  body: JSON.stringify({ reason: 'Invalid data source' }),
});
```

## 功能模块

### 1. 管理仪表板 (`/admin`)

**功能：**
- 系统概览（市场、用户、交易量、争议数量）
- 快速导航到各管理模块
- 最近 10 条管理员操作记录

**数据刷新：** 每 30 秒自动刷新

**关键指标：**
- 总市场数 / 活跃市场数
- 总用户数 / 7 天活跃用户数
- 总交易量 / 总交易笔数
- 待处理争议数

### 2. 市场管理 (`/admin/markets`)

**功能：**
- ✅ 查看所有市场（分页、筛选）
- ✅ 按状态筛选（All, OPEN, CLOSED, RESOLVING, RESOLVED, VOIDED）
- ✅ 关闭市场（Close Market）
- ✅ 作废市场（Void Market）

**关闭市场 (Close Market)：**
- 条件：市场状态必须为 `OPEN`
- 效果：停止交易，状态变为 `CLOSED`
- 用途：到达结算时间或需要提前关闭

**作废市场 (Void Market)：**
- 条件：市场状态为 `OPEN`, `CLOSED`, 或 `RESOLVING`
- 效果：
  - 状态变为 `VOIDED`
  - 设置 `outcome = 2` (INVALID)
  - 记录作废原因
  - 用户可按比例退款
- 用途：数据源不可用、市场定义有误等

**示例场景：**
```
场景：数据源 API 永久下线

1. Admin → Markets → 找到相关市场
2. 点击 "Void"
3. 输入原因："Data source API permanently offline"
4. 确认作废
5. 系统记录操作日志
6. 用户可通过 BatchRedeem 申请退款
```

### 3. 用户管理 (`/admin/users`)

**功能：**
- ✅ 查看所有用户（分页、排序）
- ✅ 按字段排序（Volume, PnL, Trades）
- ✅ 筛选用户（All, Active, Banned）
- ✅ 查看用户详情
- ✅ 封禁用户（Ban User）
- ✅ 解封用户（Unban User）

**封禁用户 (Ban User)：**
- 字段更新：
  - `isBanned = true`
  - `banReason = "..."`
  - `bannedAt = now()`
- 效果：用户无法创建订单或参与交易
- 注意：管理员账户不能被封禁

**解封用户 (Unban User)：**
- 字段更新：
  - `isBanned = false`
  - `banReason = null`
  - `bannedAt = null`

**示例场景：**
```
场景：发现恶意刷量用户

1. Admin → Users → 按 Volume 排序
2. 找到异常用户（如：短时间大量交易）
3. 点击 "Ban"
4. 输入原因："Volume manipulation detected"
5. 确认封禁
6. 用户立即无法交易
```

### 4. 争议仲裁 (`/admin/disputes`)

**功能：**
- ✅ 查看所有 DISPUTED 状态的 Oracle 请求
- ✅ 查看提议和争议详情
- ✅ 管理员裁决（选择最终结果）
- ✅ 自动分配 Bond 奖励

**裁决流程：**
1. 查看原始提议（Proposer + Proposed Outcome）
2. 查看争议理由（Disputer + Dispute Reason）
3. 管理员选择最终结果（YES / NO / INVALID）
4. 确认裁决
5. 系统自动：
   - 更新 OracleRequest 状态为 `RESOLVED`
   - 设置 `finalOutcome`
   - 分配 Bond（赢的一方获得两份 bond）
   - 记录操作日志

**Bond 分配规则：**
- **裁决 = 提议：** Proposer 获得 proposeBond + disputeBond
- **裁决 ≠ 提议：** Disputer 获得 proposeBond + disputeBond

**示例场景：**
```
场景：选举结果争议

原始提议：YES (Proposer: 0x123...)
争议理由："Official results show NO, not YES"

管理员审查：
1. 查看官方数据源 → 确认结果为 NO
2. Admin → Disputes → 找到该市场
3. 点击 "Resolve Dispute"
4. 选择 "NO"
5. 确认裁决
6. Disputer 获得 200 USDC (100 + 100)
7. 市场状态 → RESOLVED
```

### 5. 系统监控 (`/admin/monitoring`)

**功能：**
- ✅ 系统健康检查（Health Check）
- ✅ 服务状态监控（Database, Cache）
- ✅ 管理员活动日志（Admin Activity Logs）
- ✅ 按操作类型筛选日志

**健康检查：**
- **Database (PostgreSQL)：**
  - 状态：healthy / unhealthy
  - 延迟：响应时间（ms）
- **Cache (Redis)：**
  - 状态：healthy / unhealthy

**刷新频率：** 每 5 秒自动刷新

**日志类型：**
- `MARKET_UPDATE` - 更新市场
- `MARKET_VOID` - 作废市场
- `MARKET_CLOSE` - 关闭市场
- `USER_BAN` - 封禁用户
- `USER_UNBAN` - 解封用户
- `ORACLE_RESOLVE` - 解决争议
- `ORACLE_DISPUTE` - 提交争议
- `SYSTEM_CONFIG` - 系统配置

**日志内容：**
- 时间戳
- 管理员地址
- 操作类型
- 详细描述

## API 端点

### 市场管理

```typescript
GET    /admin/markets              // 获取所有市场
       ?status=OPEN                // 按状态筛选
       &category=politics          // 按分类筛选
       &page=1&limit=20            // 分页

PUT    /admin/markets/:id          // 更新市场
       Body: { title?, description?, status? }

POST   /admin/markets/:id/close    // 关闭市场

POST   /admin/markets/:id/void     // 作废市场
       Body: { reason: string }
```

### 用户管理

```typescript
GET    /admin/users                // 获取所有用户
       ?isBanned=false             // 筛选封禁状态
       &sortBy=volume              // 排序字段
       &page=1&limit=20            // 分页

GET    /admin/users/:address       // 获取用户详情

POST   /admin/users/ban            // 封禁用户
       Body: { userAddress: string, reason: string }

POST   /admin/users/unban          // 解封用户
       Body: { userAddress: string }
```

### 争议仲裁

```typescript
GET    /admin/disputes             // 获取所有争议

POST   /admin/disputes/resolve     // 解决争议
       Body: { conditionId: string, finalOutcome: 0 | 1 | 2 }
```

### 系统监控

```typescript
GET    /admin/stats                // 系统统计

GET    /admin/logs                 // 管理员日志
       ?adminAddress=0x...         // 按管理员筛选
       &actionType=MARKET_VOID     // 按操作类型筛选
       &page=1&limit=20            // 分页

GET    /admin/health               // 健康检查

GET    /admin/verify/:address      // 验证管理员权限
```

## 使用示例

### 示例 1：处理有问题的市场

```typescript
// 场景：发现市场描述有误，需要作废

// 1. 前端操作
// Admin → Markets → 找到问题市场 → Void

// 2. API 调用
const response = await fetch(`${API_URL}/admin/markets/${marketId}/void`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-address': adminAddress,
  },
  body: JSON.stringify({
    reason: 'Market description contains misleading information',
  }),
});

// 3. 结果
// - Market status → VOIDED
// - voidReason → "Market description contains misleading information"
// - AdminAction 日志记录
// - 缓存清除
```

### 示例 2：裁决 Oracle 争议

```typescript
// 场景：管理员审查后确定正确结果

// 1. 获取争议列表
const disputes = await fetch(`${API_URL}/admin/disputes`).then(r => r.json());

// 2. 选择争议并裁决
const response = await fetch(`${API_URL}/admin/disputes/resolve`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-address': adminAddress,
  },
  body: JSON.stringify({
    conditionId: '0x123...',
    finalOutcome: 1, // YES
  }),
});

// 3. 结果
// - OracleRequest status → RESOLVED
// - finalOutcome → 1
// - Bond 自动分配
// - Market 可以 finalize
```

### 示例 3：监控系统健康

```typescript
// 定期检查系统状态

const checkHealth = async () => {
  const health = await fetch(`${API_URL}/admin/health`).then(r => r.json());

  if (health.status !== 'healthy') {
    console.error('System unhealthy:', health);
    // 发送告警通知
    sendAlert({
      type: 'system_health',
      status: health.status,
      services: health.services,
    });
  }

  return health;
};

// 每分钟检查一次
setInterval(checkHealth, 60000);
```

## 安全考虑

### 1. 权限控制

✅ **已实现：**
- 数据库层面的 `isAdmin` 字段
- 前端路由保护（非管理员重定向）
- 后端 API 权限验证（`verifyAdmin`）

🔶 **生产环境建议：**
- 使用多签钱包管理管理员权限
- 实现 Timelock 合约延迟敏感操作
- 添加二次确认机制

### 2. 操作审计

✅ **已实现：**
- 所有管理员操作记录到 `AdminAction` 表
- 记录内容：操作类型、目标对象、描述、时间戳
- 可按管理员地址、操作类型查询

🔶 **建议：**
- 定期导出审计日志
- 异常操作告警
- 日志不可篡改（区块链存证）

### 3. 关键操作

**作废市场：**
- ✅ 需要输入原因
- ✅ 不可撤销
- 🔶 建议：超过一定金额的市场需要多签确认

**封禁用户：**
- ✅ 需要输入原因
- ✅ 可以解封
- 🔶 建议：封禁前发送通知，给用户申诉机会

**争议裁决：**
- ✅ 显示提议和争议详情
- ✅ 需要管理员主动选择结果
- 🔶 建议：引入争议委员会，多人投票决定

### 4. API 安全

✅ **已实现：**
- 请求头验证（`x-admin-address`）
- 后端权限检查

🔶 **生产环境建议：**
- 添加 JWT 或签名验证
- IP 白名单
- Rate limiting
- CORS 配置

### 5. 前端安全

✅ **已实现：**
- 敏感操作二次确认模态框
- 操作警告提示
- 自动重定向非管理员用户

🔶 **建议：**
- 使用 Web3 签名验证身份
- 敏感页面添加 CSP 头
- 定期更新依赖

## 部署清单

### 数据库迁移

```bash
# 1. 运行 Prisma 迁移
cd backend
npx prisma migrate deploy

# 2. 生成 Prisma Client
npx prisma generate

# 3. 设置管理员
psql $DATABASE_URL -c "
  UPDATE \"User\"
  SET \"isAdmin\" = true
  WHERE address = '0x...';
"
```

### 环境变量

```bash
# backend/.env
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=...

# frontend/.env.local
NEXT_PUBLIC_API_URL=https://api.example.com
```

### 验证部署

```bash
# 1. 检查 API
curl https://api.example.com/admin/health

# 2. 检查管理员权限
curl https://api.example.com/admin/verify/0x...

# 3. 检查日志
curl https://api.example.com/admin/logs?limit=10
```

## 常见问题

### Q: 如何添加新的管理员？

A: 直接更新数据库：
```sql
UPDATE "User" SET "isAdmin" = true WHERE address = '0x...';
```

### Q: 管理员操作会触发链上交易吗？

A: 部分操作会：
- **仅数据库：** 封禁用户、更新市场信息
- **需要链上：** 作废市场、裁决争议（需要管理员签名交易）

### Q: 误封禁用户怎么办？

A: 使用 "Unban" 功能解封，所有封禁都是可逆的。

### Q: 如何监控管理员滥用权限？

A: 查看 `/admin/monitoring` 页面的活动日志，定期审查异常操作。

### Q: 作废市场后用户如何退款？

A: 用户访问 Portfolio 页面，使用 "Batch Redeem" 功能批量申请退款。

## 总结

管理后台提供了完整的市场运营工具，涵盖：

- ✅ **市场管理：** 关闭、作废、更新
- ✅ **用户管理：** 封禁、解封、统计
- ✅ **争议仲裁：** 查看、裁决、分配奖励
- ✅ **系统监控：** 健康检查、日志、性能指标
- ✅ **操作审计：** 所有操作记录、可追溯

**完成度：100%** ✅

**生产环境部署前建议：**
1. 配置多签钱包管理管理员权限
2. 添加操作告警系统
3. 定期审计日志
4. 实施 Timelock 保护关键操作
5. 第三方安全审计

---

**版本：** v1.0.0
**最后更新：** 2026-01-07
**维护者：** Polymarket BSC Team
