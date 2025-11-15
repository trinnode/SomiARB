import { expect } from "chai";
import hre from "hardhat";
import { SomiArbVault, MockERC20, MockQuickSwapRouter, MockStandardCLOB } from "../typechain-types";

const { ethers } = hre;

describe("SomiArbVault", function () {
  let vault: SomiArbVault;
  let tokenA: MockERC20;
  let tokenB: MockERC20;
  let usdc: MockERC20;
  let quickSwapRouter: MockQuickSwapRouter;
  let standardCLOB: MockStandardCLOB;
  let owner: any;
  let agent: any;
  let user1: any;
  let user2: any;
  let feeRecipient: any;

  beforeEach(async function () {
    const signers = await hre.ethers.getSigners();
    [owner, agent, user1, user2, feeRecipient] = signers;

    // Deploy mock tokens
    const MockERC20Factory = await hre.ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20Factory.deploy("Token A", "TKA", 18);
    tokenB = await MockERC20Factory.deploy("Token B", "TKB", 18);
    usdc = await MockERC20Factory.deploy("USD Coin", "USDC", 6);

    // Deploy mock QuickSwap router
    const MockQuickSwapRouterFactory = await hre.ethers.getContractFactory("MockQuickSwapRouter");
    quickSwapRouter = await MockQuickSwapRouterFactory.deploy();

    // Deploy mock Standard CLOB
    const MockStandardCLOBFactory = await hre.ethers.getContractFactory("MockStandardCLOB");
    standardCLOB = await MockStandardCLOBFactory.deploy();

    // Deploy SomiArbVault
    const SomiArbVaultFactory = await hre.ethers.getContractFactory("SomiArbVault");
    vault = await SomiArbVaultFactory.deploy(
      await quickSwapRouter.getAddress(),
      await standardCLOB.getAddress(),
      owner.address
    );

    // Mint tokens to users
    const initialAmount = hre.ethers.parseEther("100000");
    await tokenA.mint(user1.address, initialAmount);
    await tokenA.mint(user2.address, initialAmount);
    await tokenA.mint(await vault.getAddress(), initialAmount);
    
    await tokenB.mint(user1.address, initialAmount);
    await tokenB.mint(user2.address, initialAmount);
    await tokenB.mint(await vault.getAddress(), initialAmount);

    await usdc.mint(user1.address, hre.ethers.parseUnits("100000", 6));
    await usdc.mint(user2.address, hre.ethers.parseUnits("100000", 6));

    // Set up token support
    await vault.setSupportedToken(await tokenA.getAddress(), true);
    await vault.setSupportedToken(await tokenB.getAddress(), true);
    await vault.setSupportedToken(await usdc.getAddress(), true);

    // Authorize agent
    await vault.setAgentAuthorization(agent.address, true);
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial configuration", async function () {
      expect(await vault.owner()).to.equal(owner.address);
      expect(await vault.quickSwapRouter()).to.equal(await quickSwapRouter.getAddress());
      expect(await vault.standardCLOB()).to.equal(await standardCLOB.getAddress());
      
      const config = await vault.config();
      expect(config.managementFee).to.equal(200); // 2%
      expect(config.performanceFee).to.equal(1000); // 10%
    });

    it("Should reject zero address parameters", async function () {
      const SomiArbVaultFactory = await ethers.getContractFactory("SomiArbVault");

      await expect(
        SomiArbVaultFactory.deploy(ethers.ZeroAddress, ethers.ZeroAddress, owner.address)
      ).to.be.revertedWith("Invalid router address");
    });
  });

  describe("Token Support Management", function () {
    it("Should allow owner to add/remove supported tokens", async function () {
      expect(await vault.supportedTokens(await tokenA.getAddress())).to.be.true;
      
      await vault.setSupportedToken(await tokenA.getAddress(), false);
      expect(await vault.supportedTokens(await tokenA.getAddress())).to.be.false;
    });

    it("Should reject non-owner setting token support", async function () {
      await expect(
        vault.connect(user1).setSupportedToken(await tokenA.getAddress(), false)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Agent Authorization", function () {
    it("Should allow owner to authorize/deauthorize agents", async function () {
      expect(await vault.authorizedAgents(agent.address)).to.be.true;
      expect(await vault.authorizedAgents(user1.address)).to.be.false;
      
      await vault.setAgentAuthorization(user1.address, true);
      expect(await vault.authorizedAgents(user1.address)).to.be.true;
      
      await vault.setAgentAuthorization(agent.address, false);
      expect(await vault.authorizedAgents(agent.address)).to.be.false;
    });

    it("Should emit AgentAuthorized event", async function () {
      await expect(vault.setAgentAuthorization(user1.address, true))
        .to.emit(vault, "AgentAuthorized")
        .withArgs(user1.address, true);
    });
  });

  describe("Deposits", function () {
    it("Should allow users to deposit supported tokens", async function () {
      const depositAmount = ethers.parseEther("1000");
      await tokenA.connect(user1).approve(await vault.getAddress(), depositAmount);
      
      await expect(vault.connect(user1).deposit(await tokenA.getAddress(), depositAmount))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, await tokenA.getAddress(), depositAmount, depositAmount);
      
      expect(await vault.getUserShares(user1.address, await tokenA.getAddress())).to.equal(depositAmount);
      expect(await vault.totalDeposits(await tokenA.getAddress())).to.equal(depositAmount);
    });

    it("Should reject deposits of unsupported tokens", async function () {
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const unsupportedToken = await MockERC20Factory.deploy("Unsupported", "UNS", 18);
      
      const depositAmount = ethers.parseEther("1000");
      await unsupportedToken.mint(user1.address, depositAmount);
      await unsupportedToken.connect(user1).approve(await vault.getAddress(), depositAmount);
      
      await expect(
        vault.connect(user1).deposit(await unsupportedToken.getAddress(), depositAmount)
      ).to.be.revertedWith("Token not supported");
    });

    it("Should reject zero amount deposits", async function () {
      await expect(
        vault.connect(user1).deposit(await tokenA.getAddress(), 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Withdrawals", function () {
    it("Should allow users to withdraw their tokens", async function () {
      const depositAmount = ethers.parseEther("1000");
      const withdrawShares = ethers.parseEther("500");
      
      // Deposit first
      await tokenA.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(await tokenA.getAddress(), depositAmount);
      
      const initialBalance = await tokenA.balanceOf(user1.address);
      
      // Withdraw
      await expect(vault.connect(user1).withdraw(await tokenA.getAddress(), withdrawShares))
        .to.emit(vault, "Withdraw")
        .withArgs(user1.address, await tokenA.getAddress(), withdrawShares, withdrawShares);
      
      const finalBalance = await tokenA.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(withdrawShares);
    });

    it("Should reject withdrawal of more shares than owned", async function () {
      const depositAmount = ethers.parseEther("1000");
      const withdrawShares = ethers.parseEther("1500");
      
      await tokenA.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(await tokenA.getAddress(), depositAmount);
      
      await expect(
        vault.connect(user1).withdraw(await tokenA.getAddress(), withdrawShares)
      ).to.be.revertedWith("Insufficient shares");
    });

    it("Should reject zero share withdrawals", async function () {
      await expect(
        vault.connect(user1).withdraw(await tokenA.getAddress(), 0)
      ).to.be.revertedWith("Shares must be greater than 0");
    });
  });

  describe("Configuration Management", function () {
    it("Should allow owner to update configuration", async function () {
      const newConfig = {
        managementFee: 300, // 3%
        performanceFee: 1500, // 15%
        minProfitThreshold: 75, // 0.75%
        maxSlippage: 400, // 4%
        autoCompound: false,
        feeRecipient: feeRecipient.address
      };
      
      await expect(vault.updateConfig(newConfig))
        .to.emit(vault, "ConfigUpdated")
        .withArgs(newConfig.managementFee, newConfig.performanceFee, newConfig.minProfitThreshold, newConfig.maxSlippage);
      
      const updatedConfig = await vault.config();
      expect(updatedConfig.managementFee).to.equal(newConfig.managementFee);
      expect(updatedConfig.performanceFee).to.equal(newConfig.performanceFee);
    });

    it("Should reject invalid configuration parameters", async function () {
      // Management fee too high
      await expect(vault.updateConfig({
        managementFee: 600, // > 5%
        performanceFee: 1000,
        minProfitThreshold: 50,
        maxSlippage: 300,
        autoCompound: true,
        feeRecipient: feeRecipient.address
      })).to.be.revertedWith("Management fee too high");
    });
  });

  describe("Emergency Management", function () {
    it("Should allow owner to trigger emergency mode", async function () {
      const reason = "Security incident detected";
      
      await expect(vault.triggerEmergency(reason))
        .to.emit(vault, "EmergencyTriggered");
      
      expect(await vault.paused()).to.be.true;
      
      const emergencyState = await vault.emergencyState();
      expect(emergencyState.isEmergency).to.be.true;
      expect(emergencyState.emergencyReason).to.equal(reason);
    });

    it("Should prevent deposits during emergency", async function () {
      await vault.triggerEmergency("Test emergency");
      
      const depositAmount = ethers.parseEther("1000");
      await tokenA.connect(user1).approve(await vault.getAddress(), depositAmount);
      
      await expect(
        vault.connect(user1).deposit(await tokenA.getAddress(), depositAmount)
      ).to.be.revertedWith("Vault in emergency mode");
    });
  });

  describe("View Functions", function () {
    it("Should return correct user balances", async function () {
      const depositAmount = ethers.parseEther("1000");
      
      await tokenA.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(await tokenA.getAddress(), depositAmount);
      
      expect(await vault.getUserShares(user1.address, await tokenA.getAddress())).to.equal(depositAmount);
      expect(await vault.getUserBalance(user1.address, await tokenA.getAddress())).to.be.closeTo(depositAmount, ethers.parseEther("1"));
    });

    it("Should return correct total value", async function () {
      const vaultBalance = await tokenA.balanceOf(await vault.getAddress());
      expect(await vault.getTotalValue(await tokenA.getAddress())).to.equal(vaultBalance);
    });

    it("Should return performance metrics", async function () {
      const metrics = await vault.getPerformanceMetrics();
      expect(metrics.totalTrades).to.equal(0);
      expect(metrics.totalProfit).to.equal(0);
      expect(metrics.successfulTrades).to.equal(0);
    });
  });

  describe("Access Control", function () {
    it("Should restrict admin functions to owner", async function () {
      await expect(
        vault.connect(user1).setSupportedToken(await tokenA.getAddress(), false)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
      
      await expect(
        vault.connect(user1).setAgentAuthorization(user1.address, true)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should reject arbitrage execution from non-agent", async function () {
      const arbitrageParams = {
        tokenA: await tokenA.getAddress(),
        tokenB: await tokenB.getAddress(),
        amountIn: ethers.parseEther("1000"),
        minAmountOut: ethers.parseEther("950"),
        expectedProfit: 100,
        minProfit: ethers.parseEther("10"),
        slippage: 200,
        buyPlatform: 0,
        sellPlatform: 1,
        deadline: Math.floor(Date.now() / 1000) + 300
      };
      
      await expect(
        vault.connect(user1).executeArbitrage(arbitrageParams)
      ).to.be.revertedWith("Not authorized agent");
    });
  });
});