import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  console.log("Deploying SomiArbVault to Somnia network...");

  // Get the contract factory
  const SomiArbVault = await ethers.getContractFactory("SomiArbVault");

  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Mock addresses for testnet deployment
  // In production, replace these with actual protocol addresses
  const QUICKSWAP_ROUTER = "0xcfF438ec5B4AB5Afef185D5C2b270c9fFFF5fc8e"; // Somnia QuickSwap Router
  const STANDARD_CLOB = "0x6AA08fD4C41D4e66CC27f654bE4f8f0e71029DBD"; // Somnia Standard CLOB
  
  // Deploy the contract with constructor parameters
  const vault = await SomiArbVault.deploy(
    QUICKSWAP_ROUTER,    // QuickSwap router address
    STANDARD_CLOB,       // Standard CLOB address
    deployer.address     // Owner address (deployer)
  );

  await vault.deployed();
  const address = vault.address;

  console.log(`SomiArbVault deployed to: ${address}`);
  
  // Verify the contract
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await vault.deployTransaction?.wait(6);
    
    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [QUICKSWAP_ROUTER, STANDARD_CLOB, deployer.address],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});