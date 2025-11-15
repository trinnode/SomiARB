import { expect } from "chai";
import hre from "hardhat";

describe("SomiArbVault Basic Test", function () {
  it("Should deploy the vault contract", async function () {
    const [owner] = await hre.ethers.getSigners();

    // Deploy mock tokens
    const MockERC20Factory = await hre.ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20Factory.deploy("Token A", "TKA", 18);
    
    // Deploy mock QuickSwap router
    const MockQuickSwapRouterFactory = await hre.ethers.getContractFactory("MockQuickSwapRouter");
    const quickSwapRouter = await MockQuickSwapRouterFactory.deploy();

    // Deploy mock Standard CLOB
    const MockStandardCLOBFactory = await hre.ethers.getContractFactory("MockStandardCLOB");
    const standardCLOB = await MockStandardCLOBFactory.deploy();

    // Deploy SomiArbVault
    const SomiArbVaultFactory = await hre.ethers.getContractFactory("SomiArbVault");
    const vault = await SomiArbVaultFactory.deploy(
      await quickSwapRouter.getAddress(),
      await standardCLOB.getAddress(),
      owner.address
    );

    expect(await vault.owner()).to.equal(owner.address);
    console.log("✅ SomiArbVault deployed successfully!");
    console.log("Vault address:", await vault.getAddress());
  });

  it("Should set up token support", async function () {
    const [owner] = await hre.ethers.getSigners();

    // Deploy mock tokens
    const MockERC20Factory = await hre.ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20Factory.deploy("Token A", "TKA", 18);
    
    // Deploy mock routers
    const MockQuickSwapRouterFactory = await hre.ethers.getContractFactory("MockQuickSwapRouter");
    const quickSwapRouter = await MockQuickSwapRouterFactory.deploy();

    const MockStandardCLOBFactory = await hre.ethers.getContractFactory("MockStandardCLOB");
    const standardCLOB = await MockStandardCLOBFactory.deploy();

    // Deploy vault
    const SomiArbVaultFactory = await hre.ethers.getContractFactory("SomiArbVault");
    const vault = await SomiArbVaultFactory.deploy(
      await quickSwapRouter.getAddress(),
      await standardCLOB.getAddress(),
      owner.address
    );

    // Set token support
    await vault.setSupportedToken(await tokenA.getAddress(), true);
    expect(await vault.supportedTokens(await tokenA.getAddress())).to.be.true;
    
    console.log("✅ Token support configured successfully!");
  });

  it("Should handle deposits", async function () {
    const [owner, user] = await hre.ethers.getSigners();

    // Deploy everything
    const MockERC20Factory = await hre.ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20Factory.deploy("Token A", "TKA", 18);
    
    const MockQuickSwapRouterFactory = await hre.ethers.getContractFactory("MockQuickSwapRouter");
    const quickSwapRouter = await MockQuickSwapRouterFactory.deploy();

    const MockStandardCLOBFactory = await hre.ethers.getContractFactory("MockStandardCLOB");
    const standardCLOB = await MockStandardCLOBFactory.deploy();

    const SomiArbVaultFactory = await hre.ethers.getContractFactory("SomiArbVault");
    const vault = await SomiArbVaultFactory.deploy(
      await quickSwapRouter.getAddress(),
      await standardCLOB.getAddress(),
      owner.address
    );

    // Setup
    await vault.setSupportedToken(await tokenA.getAddress(), true);
    const depositAmount = hre.ethers.parseEther("1000");
    await tokenA.mint(user.address, depositAmount);
    await tokenA.connect(user).approve(await vault.getAddress(), depositAmount);

    // Test deposit
    await vault.connect(user).deposit(await tokenA.getAddress(), depositAmount);
    expect(await vault.getUserShares(user.address, await tokenA.getAddress())).to.equal(depositAmount);
    
    console.log("✅ Deposit functionality works!");
  });
});