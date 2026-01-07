# 🚀 快速开始指南

欢迎使用 Polymarket BSC！这份指南将帮助您在 15 分钟内启动整个项目。

## 📋 前置检查

确保您已安装：
- ✅ Node.js >= 18.0.0
- ✅ npm >= 9.0.0
- ✅ Git
- ✅ MetaMask 钱包（浏览器扩展）

可选（用于完整开发）：
- PostgreSQL >= 14
- Redis >= 6.0

---

## ⚡ 5 分钟快速启动（仅智能合约）

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd polymarket-bsc/contracts
```

### 2. 安装依赖
```bash
npm install
```

### 3. 编译合约
```bash
npm run compile
```

### 4. 运行测试
```bash
npm test
```

### 5. 部署到本地网络
```bash
# 终端 1：启动本地节点
npx hardhat node

# 终端 2：部署合约
npx hardhat run scripts/deploy.js --network localhost
```

✅ **完成！** 您已成功运行智能合约！

---

## 🏗️ 完整开发环境搭建（15 分钟）

### 步骤 1：智能合约部署（5 分钟）

```bash
cd polymarket-bsc/contracts

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加您的私钥和配置

# 3. 编译合约
npm run compile

# 4. 部署到 BSC 测试网
npm run deploy:testnet

# 保存合约地址！
```

### 步骤 2：后端启动（5 分钟）

```bash
cd ../backend

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入：
# - DATABASE_URL（如果没有 PostgreSQL，可以跳过后端）
# - 合约地址（从步骤 1 获取）

# 3. 运行数据库迁移（如果有 PostgreSQL）
npm run migrate

# 4. 启动开发服务器
npm run start:dev
```

### 步骤 3：前端启动（5 分钟）

```bash
cd ../frontend

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入：
# - 合约地址（从步骤 1 获取）
# - API URL（如果后端已启动）

# 3. 启动开发服务器
npm run dev
```

### 步骤 4：打开浏览器

访问 `http://localhost:3000`

✅ **恭喜！** 完整的开发环境已启动！

---

## 🎯 核心功能演示

### 1. 连接钱包
1. 打开 MetaMask
2. 切换到 BSC 测试网
3. 点击"连接钱包"按钮

### 2. 创建市场（需要 USDC）
```bash
# 在合约目录下运行
cd contracts
npx hardhat console --network bscTestnet

# 在控制台中执行：
const factory = await ethers.getContractAt("MarketFactory", "YOUR_FACTORY_ADDRESS");
await factory.createMarket(
  "Will Bitcoin reach $100k in 2024?",
  "This market resolves YES if Bitcoin reaches $100,000 before Dec 31, 2024",
  "Crypto",
  Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year from now
  "https://coinmarketcap.com",
  ethers.parseEther("500") // 500 USDC initial liquidity
);
```

### 3. 执行交易

**AMM 交易：**
```bash
const amm = await ethers.getContractAt("AMM", "YOUR_AMM_ADDRESS");

# 买入 10 个 YES 代币
await amm.swap(
  conditionId,
  true,  // buyYes = true
  ethers.parseEther("10"),
  0  // minAmountOut (实际应用中应设置滑点保护)
);
```

**查看价格：**
```bash
const price = await amm.getCurrentPrice(conditionId);
console.log("YES 价格:", ethers.formatEther(price));
```

---

## 🛠️ 常见操作

### 获取测试网 BNB（用于 Gas）
1. 访问 https://testnet.binance.org/faucet-smart
2. 输入您的钱包地址
3. 获取 0.5 BNB

### 获取测试网 USDC
由于测试网没有真实的 USDC，您需要：
1. 部署一个 Mock USDC 合约，或
2. 使用主网（需要真实资金）

### 验证合约
```bash
cd contracts
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 查看交易
访问 BscScan 测试网：
https://testnet.bscscan.com

---

## 📚 下一步学习

1. **阅读架构文档**
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构设计
   - [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 详细开发指南

2. **探索代码**
   - `contracts/core/` - 核心智能合约
   - `backend/src/modules/` - 后端业务模块
   - `frontend/src/components/` - 前端 React 组件

3. **扩展功能**
   - 添加新的市场类型
   - 实现高级图表
   - 集成预言机
   - 添加社交功能

---

## ⚠️ 注意事项

### 安全
- ⚠️ **永远不要**提交私钥到 Git
- ⚠️ **永远不要**在主网使用测试私钥
- ⚠️ 部署到主网前进行安全审计

### Gas 优化
- 批量操作可以节省 Gas
- 使用 `estimateGas()` 预估费用
- 合理设置滑点保护

### 测试
- 编写充分的单元测试
- 进行集成测试
- 测试网测试后再上主网

---

## 🆘 遇到问题？

### 常见错误

**1. "Insufficient funds" 错误**
- 检查钱包是否有足够的 BNB（用于 Gas）
- 检查是否有足够的 USDC

**2. "Network mismatch" 错误**
- 确保 MetaMask 连接到正确的网络
- 检查前端 `.env.local` 中的 `NEXT_PUBLIC_CHAIN_ID`

**3. "Contract not found" 错误**
- 确认合约已部署
- 检查合约地址是否正确配置

**4. 数据库连接失败**
- 确认 PostgreSQL 已启动
- 检查 `DATABASE_URL` 配置

### 获取帮助
- GitHub Issues: [提交问题](https://github.com/your-repo/issues)
- Discord: [加入社区](https://discord.gg/your-server)
- 文档: [查看文档](./DEVELOPMENT_GUIDE.md)

---

## 🎉 成功部署检查清单

- [ ] 智能合约已编译
- [ ] 智能合约测试通过
- [ ] 合约已部署到测试网
- [ ] 合约地址已配置
- [ ] 后端 API 正常运行
- [ ] 前端可以连接钱包
- [ ] 前端可以显示市场数据
- [ ] 可以执行测试交易

---

**祝您开发愉快！** 🚀

如果您觉得这个项目有帮助，请给我们一个 ⭐ Star！
