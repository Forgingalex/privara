import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🚀 Deploying Privara contract...");
  console.log(`   Deployer: ${deployer}`);

  const deployedPrivara = await deploy("Privara", {
    from: deployer,
    log: true,
  });

  console.log(`\n✅ Privara contract deployed!`);
  console.log(`   Address: ${deployedPrivara.address}`);
  console.log(`   Transaction: ${deployedPrivara.transactionHash}`);
  console.log(`\n📋 Save this address for your frontend .env.local:`);
  console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS=${deployedPrivara.address}`);
};

export default func;
func.id = "deploy_privara";
func.tags = ["Privara"];


