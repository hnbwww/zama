const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ConditionalTokens", function () {
  let conditionalTokens;
  let mockUSDC;
  let owner, oracle, user1, user2;

  beforeEach(async function () {
    [owner, oracle, user1, user2] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", ethers.parseEther("1000000"));
    await mockUSDC.waitForDeployment();

    // Deploy ConditionalTokens
    const ConditionalTokens = await ethers.getContractFactory("ConditionalTokens");
    conditionalTokens = await ConditionalTokens.deploy(await mockUSDC.getAddress());
    await conditionalTokens.waitForDeployment();

    // Mint USDC to users
    await mockUSDC.transfer(user1.address, ethers.parseEther("10000"));
    await mockUSDC.transfer(user2.address, ethers.parseEther("10000"));
  });

  describe("Condition Preparation", function () {
    it("Should prepare a new condition", async function () {
      const questionId = ethers.id("Will Bitcoin reach $100k in 2024?");

      const tx = await conditionalTokens.prepareCondition(questionId, oracle.address);
      await tx.wait();

      const conditionId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address"],
          [questionId, oracle.address]
        )
      );

      const condition = await conditionalTokens.conditions(conditionId);
      expect(condition.oracle).to.equal(oracle.address);
      expect(condition.outcomeSlotCount).to.equal(2);
      expect(condition.resolved).to.be.false;
    });

    it("Should not allow duplicate conditions", async function () {
      const questionId = ethers.id("Test question");

      await conditionalTokens.prepareCondition(questionId, oracle.address);

      await expect(
        conditionalTokens.prepareCondition(questionId, oracle.address)
      ).to.be.revertedWith("Condition already exists");
    });
  });

  describe("Position Splitting", function () {
    let conditionId;

    beforeEach(async function () {
      const questionId = ethers.id("Test question");
      const tx = await conditionalTokens.prepareCondition(questionId, oracle.address);
      await tx.wait();

      conditionId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address"],
          [questionId, oracle.address]
        )
      );
    });

    it("Should split collateral into YES and NO tokens", async function () {
      const amount = ethers.parseEther("100");

      // Approve and split
      await mockUSDC.connect(user1).approve(await conditionalTokens.getAddress(), amount);
      await conditionalTokens.connect(user1).splitPosition(conditionId, amount);

      // Check balances
      const [yesTokenId, noTokenId] = await conditionalTokens.getPositionIds(conditionId);
      const yesBalance = await conditionalTokens.balanceOf(user1.address, yesTokenId);
      const noBalance = await conditionalTokens.balanceOf(user1.address, noTokenId);

      expect(yesBalance).to.equal(amount);
      expect(noBalance).to.equal(amount);
    });

    it("Should merge YES and NO tokens back to collateral", async function () {
      const amount = ethers.parseEther("100");

      // Split
      await mockUSDC.connect(user1).approve(await conditionalTokens.getAddress(), amount);
      await conditionalTokens.connect(user1).splitPosition(conditionId, amount);

      const initialBalance = await mockUSDC.balanceOf(user1.address);

      // Merge
      await conditionalTokens.connect(user1).mergePositions(conditionId, amount);

      const finalBalance = await mockUSDC.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(amount);
    });
  });

  describe("Condition Resolution", function () {
    let conditionId;

    beforeEach(async function () {
      const questionId = ethers.id("Test question");
      const tx = await conditionalTokens.prepareCondition(questionId, oracle.address);
      await tx.wait();

      conditionId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address"],
          [questionId, oracle.address]
        )
      );
    });

    it("Should resolve condition (YES wins)", async function () {
      await conditionalTokens.connect(oracle).resolveCondition(conditionId, 1); // YES wins

      const condition = await conditionalTokens.conditions(conditionId);
      expect(condition.resolved).to.be.true;
      expect(condition.payoutNumerator).to.equal(1);
    });

    it("Should only allow oracle to resolve", async function () {
      await expect(
        conditionalTokens.connect(user1).resolveCondition(conditionId, 1)
      ).to.be.revertedWith("Only oracle can resolve");
    });

    it("Should allow redemption of winning tokens", async function () {
      const amount = ethers.parseEther("100");

      // Split position
      await mockUSDC.connect(user1).approve(await conditionalTokens.getAddress(), amount);
      await conditionalTokens.connect(user1).splitPosition(conditionId, amount);

      // Resolve (YES wins)
      await conditionalTokens.connect(oracle).resolveCondition(conditionId, 1);

      const initialBalance = await mockUSDC.balanceOf(user1.address);

      // Redeem
      await conditionalTokens.connect(user1).redeemPositions(conditionId);

      const finalBalance = await mockUSDC.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(amount);
    });
  });
});

// Mock ERC20 contract for testing
const MockERC20 = {
  abi: [
    "constructor(string memory name, string memory symbol, uint256 initialSupply)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ],
  bytecode: "0x..." // Would need actual bytecode
};
