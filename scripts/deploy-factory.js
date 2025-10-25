const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("GifterraFactoryV2 Deployment");
  console.log("========================================\n");

  console.log("Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // 手数料受取アドレス（環境変数または deployer）
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  console.log("Fee recipient:", feeRecipient);

  // Factory デプロイ
  console.log("\nDeploying GifterraFactoryV2...");
  const GifterraFactoryV2 = await ethers.getContractFactory("GifterraFactoryV2");
  const factory = await GifterraFactoryV2.deploy(feeRecipient);

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("✅ GifterraFactoryV2 deployed to:", factoryAddress);

  // 初期設定確認
  console.log("\n--- Initial Configuration ---");
  const deploymentFee = await factory.deploymentFee();
  const totalTenants = await factory.totalTenants();
  const activeTenants = await factory.activeTenants();
  const nextTenantId = await factory.nextTenantId();

  console.log("Deployment Fee:", ethers.formatEther(deploymentFee), "ETH");
  console.log("Total Tenants:", totalTenants.toString());
  console.log("Active Tenants:", activeTenants.toString());
  console.log("Next Tenant ID:", nextTenantId.toString());

  // ロール確認
  const DEFAULT_ADMIN_ROLE = await factory.DEFAULT_ADMIN_ROLE();
  const SUPER_ADMIN_ROLE = await factory.SUPER_ADMIN_ROLE();
  const OPERATOR_ROLE = await factory.OPERATOR_ROLE();

  const hasDefaultAdmin = await factory.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const hasSuperAdmin = await factory.hasRole(SUPER_ADMIN_ROLE, deployer.address);
  const hasOperator = await factory.hasRole(OPERATOR_ROLE, deployer.address);

  console.log("\n--- Deployer Roles ---");
  console.log("DEFAULT_ADMIN_ROLE:", hasDefaultAdmin);
  console.log("SUPER_ADMIN_ROLE:", hasSuperAdmin);
  console.log("OPERATOR_ROLE:", hasOperator);

  // デプロイ情報保存
  const deploymentInfo = {
    network: network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      factory: factoryAddress,
      feeRecipient: feeRecipient,
    },
    config: {
      deploymentFee: ethers.formatEther(deploymentFee),
      totalTenants: totalTenants.toString(),
    },
    roles: {
      DEFAULT_ADMIN_ROLE: DEFAULT_ADMIN_ROLE,
      SUPER_ADMIN_ROLE: SUPER_ADMIN_ROLE,
      OPERATOR_ROLE: OPERATOR_ROLE,
    },
  };

  const outputDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(
    outputDir,
    `factory-${network.name}-${Date.now()}.json`
  );
  fs.writeFileSync(outputFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n✅ Deployment info saved to:", outputFile);

  // Verification コマンド
  console.log("\n========================================");
  console.log("Verification Command");
  console.log("========================================");
  console.log(
    `npx hardhat verify --network ${network.name} ${factoryAddress} ${feeRecipient}`
  );

  console.log("\n========================================");
  console.log("Next Steps");
  console.log("========================================");
  console.log("1. Verify the contract on Etherscan (see command above)");
  console.log("2. Create tenants using factory.createTenant()");
  console.log("3. Configure tenant contracts (Gifterra, RewardNFT, etc.)");
  console.log("4. Set up indexer/distributor for each tenant");
  console.log("\nSee docs/FACTORY-DEPLOYMENT-GUIDE.md for details.");

  return {
    factory: factoryAddress,
    feeRecipient: feeRecipient,
    deploymentInfo: outputFile,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
