const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to BSC...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  console.log("");

  // Configuration from environment variables
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"; // BSC BUSD
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const FEE_RECIPIENT = process.env.FEE_RECIPIENT || deployer.address;
  const PLATFORM_FEE = process.env.PLATFORM_FEE || 150; // 1.5%
  const MARKET_CREATION_STAKE = ethers.parseEther(process.env.MARKET_CREATION_STAKE || "100");
  const MIN_INITIAL_LIQUIDITY = ethers.parseEther(process.env.MIN_INITIAL_LIQUIDITY || "500");

  console.log("📋 Deployment Configuration:");
  console.log("  USDC Address:", USDC_ADDRESS);
  console.log("  Admin Address:", ADMIN_ADDRESS);
  console.log("  Fee Recipient:", FEE_RECIPIENT);
  console.log("  Platform Fee:", PLATFORM_FEE, "bps");
  console.log("  Market Creation Stake:", ethers.formatEther(MARKET_CREATION_STAKE), "USDC");
  console.log("  Min Initial Liquidity:", ethers.formatEther(MIN_INITIAL_LIQUIDITY), "USDC");
  console.log("");

  // Deploy ConditionalTokens
  console.log("📝 Deploying ConditionalTokens...");
  const ConditionalTokens = await ethers.getContractFactory("ConditionalTokens");
  const conditionalTokens = await ConditionalTokens.deploy(USDC_ADDRESS);
  await conditionalTokens.waitForDeployment();
  const ctfAddress = await conditionalTokens.getAddress();
  console.log("  ✅ ConditionalTokens deployed to:", ctfAddress);
  console.log("");

  // Deploy MarketFactory
  console.log("📝 Deploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    ctfAddress,
    USDC_ADDRESS,
    MARKET_CREATION_STAKE,
    MIN_INITIAL_LIQUIDITY,
    PLATFORM_FEE,
    FEE_RECIPIENT
  );
  await marketFactory.waitForDeployment();
  const factoryAddress = await marketFactory.getAddress();
  console.log("  ✅ MarketFactory deployed to:", factoryAddress);
  console.log("");

  // Deploy AMM
  console.log("📝 Deploying AMM...");
  const AMM = await ethers.getContractFactory("AMM");
  const amm = await AMM.deploy(
    ctfAddress,
    USDC_ADDRESS,
    FEE_RECIPIENT
  );
  await amm.waitForDeployment();
  const ammAddress = await amm.getAddress();
  console.log("  ✅ AMM deployed to:", ammAddress);
  console.log("");

  // Deploy OrderBook
  console.log("📝 Deploying OrderBook...");
  const OrderBook = await ethers.getContractFactory("OrderBook");
  const orderBook = await OrderBook.deploy(
    ctfAddress,
    USDC_ADDRESS,
    FEE_RECIPIENT
  );
  await orderBook.waitForDeployment();
  const orderBookAddress = await orderBook.getAddress();
  console.log("  ✅ OrderBook deployed to:", orderBookAddress);
  console.log("");

  // Summary
  console.log("🎉 Deployment completed successfully!\n");
  console.log("📋 Contract Addresses:");
  console.log("==================================================");
  console.log("ConditionalTokens:", ctfAddress);
  console.log("MarketFactory:    ", factoryAddress);
  console.log("AMM:              ", ammAddress);
  console.log("OrderBook:        ", orderBookAddress);
  console.log("==================================================\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ConditionalTokens: ctfAddress,
      MarketFactory: factoryAddress,
      AMM: ammAddress,
      OrderBook: orderBookAddress
    },
    configuration: {
      USDC_ADDRESS,
      ADMIN_ADDRESS,
      FEE_RECIPIENT,
      PLATFORM_FEE,
      MARKET_CREATION_STAKE: MARKET_CREATION_STAKE.toString(),
      MIN_INITIAL_LIQUIDITY: MIN_INITIAL_LIQUIDITY.toString()
    }
  };

  const fs = require("fs");
  const path = require("path");

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `deployment-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to:", filename);
  console.log("");

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("📝 To verify contracts on BscScan, run:");
    console.log("");
    console.log(`npx hardhat verify --network ${hre.network.name} ${ctfAddress} ${USDC_ADDRESS}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${factoryAddress} ${ctfAddress} ${USDC_ADDRESS} ${MARKET_CREATION_STAKE} ${MIN_INITIAL_LIQUIDITY} ${PLATFORM_FEE} ${FEE_RECIPIENT}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${ammAddress} ${ctfAddress} ${USDC_ADDRESS} ${FEE_RECIPIENT}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${orderBookAddress} ${ctfAddress} ${USDC_ADDRESS} ${FEE_RECIPIENT}`);
    console.log("");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
