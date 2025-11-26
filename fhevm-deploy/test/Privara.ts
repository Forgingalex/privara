import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

// We'll use the contract factory type after compilation
type PrivaraContract = any;

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("Privara");
  const privaraContract = await factory.deploy();
  const privaraContractAddress = await privaraContract.getAddress();

  return { privaraContract, privaraContractAddress };
}

describe("Privara", function () {
  let signers: Signers;
  let privaraContract: PrivaraContract;
  let privaraContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ privaraContract, privaraContractAddress } = await deployFixture());
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(privaraContractAddress).to.be.properAddress;
    });

    it("should have no submissions initially", async function () {
      const hasSubmitted = await privaraContract.hasUserSubmitted(signers.alice.address);
      expect(hasSubmitted).to.be.false;
    });

    it("should have no results initially", async function () {
      const isReady = await privaraContract.isResultReady(signers.alice.address);
      expect(isReady).to.be.false;
    });
  });

  describe("Submit Metrics", function () {
    it("should submit encrypted metrics successfully", async function () {
      // Create encrypted input with 8 metrics
      // [follower_count, following_count, engagement_rate, account_age_days,
      //  bot_likelihood, posting_freq, follower_quality, growth_score]
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000)  // follower_count
        .add32(500)   // following_count
        .add32(50)    // engagement_rate (50%)
        .add32(365)   // account_age_days
        .add32(10)    // bot_likelihood (10%)
        .add32(70)    // posting_frequency (70%)
        .add32(80)    // follower_quality (80%)
        .add32(60)    // growth_score (60%)
        .encrypt();

      // Submit metrics
      const tx = await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);
      await tx.wait();

      // Verify submission
      const hasSubmitted = await privaraContract.hasUserSubmitted(signers.alice.address);
      expect(hasSubmitted).to.be.true;
    });

    it("should not allow double submission", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      // Try to submit again - should fail
      await expect(
        privaraContract
          .connect(signers.alice)
          .submitMetrics(encryptedInput.handles, encryptedInput.inputProof)
      ).to.be.revertedWith("Already submitted");
    });
  });

  describe("Compute Reputation", function () {
    beforeEach(async function () {
      // Submit metrics first
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000)  // follower_count
        .add32(500)   // following_count
        .add32(50)    // engagement_rate (50%)
        .add32(365)   // account_age_days
        .add32(10)    // bot_likelihood (10%)
        .add32(70)    // posting_frequency (70%)
        .add32(80)    // follower_quality (80%)
        .add32(60)    // growth_score (60%)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);
    });

    it("should compute reputation successfully", async function () {
      const tx = await privaraContract.connect(signers.alice).computeReputation();
      await tx.wait();

      const isReady = await privaraContract.isResultReady(signers.alice.address);
      expect(isReady).to.be.true;
    });

    it("should compute correct authenticity score", async function () {
      await privaraContract.connect(signers.alice).computeReputation();

      // Get encrypted result
      const encryptedAuthenticity = await privaraContract.connect(signers.alice).getResult(0);
      
      // Decrypt and verify
      // Authenticity = 100 - bot_likelihood = 100 - 10 = 90
      const clearAuthenticity = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedAuthenticity,
        privaraContractAddress,
        signers.alice,
      );

      expect(clearAuthenticity).to.eq(90); // 100 - 10 = 90
    });

    it("should compute correct influence score", async function () {
      await privaraContract.connect(signers.alice).computeReputation();

      const encryptedInfluence = await privaraContract.connect(signers.alice).getResult(1);
      
      const clearInfluence = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedInfluence,
        privaraContractAddress,
        signers.alice,
      );

      expect(clearInfluence).to.eq(50); // engagement_rate = 50
    });

    it("should compute correct account health score", async function () {
      await privaraContract.connect(signers.alice).computeReputation();

      const encryptedHealth = await privaraContract.connect(signers.alice).getResult(2);
      
      const clearHealth = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedHealth,
        privaraContractAddress,
        signers.alice,
      );

      // Account Health = (posting_freq + follower_quality) / 2 = (70 + 80) / 2 = 75
      expect(clearHealth).to.eq(75);
    });

    it("should compute correct risk score", async function () {
      await privaraContract.connect(signers.alice).computeReputation();

      const encryptedRisk = await privaraContract.connect(signers.alice).getResult(3);
      
      const clearRisk = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedRisk,
        privaraContractAddress,
        signers.alice,
      );

      expect(clearRisk).to.eq(10); // bot_likelihood = 10
    });

    it("should compute correct momentum score", async function () {
      await privaraContract.connect(signers.alice).computeReputation();

      const encryptedMomentum = await privaraContract.connect(signers.alice).getResult(4);
      
      const clearMomentum = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedMomentum,
        privaraContractAddress,
        signers.alice,
      );

      expect(clearMomentum).to.eq(60); // growth_score = 60
    });

    it("should return all results at once", async function () {
      await privaraContract.connect(signers.alice).computeReputation();

      const allResults = await privaraContract.connect(signers.alice).getAllResults();
      expect(allResults.length).to.eq(5);
    });
  });

  describe("Reset", function () {
    it("should allow user to reset and resubmit", async function () {
      // Submit first
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      // Reset
      await privaraContract.connect(signers.alice).reset();

      // Should be able to submit again
      const hasSubmitted = await privaraContract.hasUserSubmitted(signers.alice.address);
      expect(hasSubmitted).to.be.false;
    });

    it("should reset result ready status", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);
      
      await privaraContract.connect(signers.alice).computeReputation();
      
      let isReady = await privaraContract.isResultReady(signers.alice.address);
      expect(isReady).to.be.true;

      await privaraContract.connect(signers.alice).reset();
      
      isReady = await privaraContract.isResultReady(signers.alice.address);
      expect(isReady).to.be.false;
    });
  });

  describe("Multiple Users", function () {
    it("should handle multiple users independently", async function () {
      // Alice submits
      const aliceInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(aliceInput.handles, aliceInput.inputProof);

      // Bob submits
      const bobInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.bob.address)
        .add32(5000).add32(2000).add32(75).add32(730)
        .add32(5).add32(90).add32(95).add32(85)
        .encrypt();

      await privaraContract
        .connect(signers.bob)
        .submitMetrics(bobInput.handles, bobInput.inputProof);

      // Both should have submitted
      expect(await privaraContract.hasUserSubmitted(signers.alice.address)).to.be.true;
      expect(await privaraContract.hasUserSubmitted(signers.bob.address)).to.be.true;

      // Compute for both
      await privaraContract.connect(signers.alice).computeReputation();
      await privaraContract.connect(signers.bob).computeReputation();

      // Both should have results
      expect(await privaraContract.isResultReady(signers.alice.address)).to.be.true;
      expect(await privaraContract.isResultReady(signers.bob.address)).to.be.true;
    });

    it("should compute different results for different users", async function () {
      // Alice: low bot likelihood (10%)
      const aliceInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(aliceInput.handles, aliceInput.inputProof);
      await privaraContract.connect(signers.alice).computeReputation();

      // Bob: high bot likelihood (80%)
      const bobInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.bob.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(80).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.bob)
        .submitMetrics(bobInput.handles, bobInput.inputProof);
      await privaraContract.connect(signers.bob).computeReputation();

      // Decrypt and compare authenticity scores
      const aliceAuth = await privaraContract.connect(signers.alice).getResult(0);
      const bobAuth = await privaraContract.connect(signers.bob).getResult(0);

      const aliceAuthClear = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        aliceAuth,
        privaraContractAddress,
        signers.alice,
      );

      const bobAuthClear = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        bobAuth,
        privaraContractAddress,
        signers.bob,
      );

      // Alice should have higher authenticity (90 vs 20)
      expect(aliceAuthClear).to.be.gt(bobAuthClear);
      expect(aliceAuthClear).to.eq(90); // 100 - 10
      expect(bobAuthClear).to.eq(20); // 100 - 80
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero values correctly", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(0)   // follower_count
        .add32(0)   // following_count
        .add32(0)   // engagement_rate
        .add32(0)   // account_age_days
        .add32(0)   // bot_likelihood
        .add32(0)   // posting_frequency
        .add32(0)   // follower_quality
        .add32(0)   // growth_score
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      await privaraContract.connect(signers.alice).computeReputation();

      // Authenticity should be 100 (100 - 0)
      const authenticity = await privaraContract.connect(signers.alice).getResult(0);
      const clearAuth = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        authenticity,
        privaraContractAddress,
        signers.alice,
      );
      expect(clearAuth).to.eq(100);
    });

    it("should handle maximum values correctly", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000000)  // follower_count
        .add32(50000)    // following_count
        .add32(100)      // engagement_rate (100%)
        .add32(3650)     // account_age_days (10 years)
        .add32(100)      // bot_likelihood (100%)
        .add32(100)      // posting_frequency (100%)
        .add32(100)      // follower_quality (100%)
        .add32(100)      // growth_score (100%)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      await privaraContract.connect(signers.alice).computeReputation();

      // Authenticity should be 0 (100 - 100)
      const authenticity = await privaraContract.connect(signers.alice).getResult(0);
      const clearAuth = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        authenticity,
        privaraContractAddress,
        signers.alice,
      );
      expect(clearAuth).to.eq(0);

      // Account health should be 100 ((100 + 100) / 2)
      const health = await privaraContract.connect(signers.alice).getResult(2);
      const clearHealth = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        health,
        privaraContractAddress,
        signers.alice,
      );
      expect(clearHealth).to.eq(100);
    });

    it("should handle boundary values for account health calculation", async function () {
      // Test with different posting_freq and follower_quality values
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(1).add32(1).add32(60)  // posting_freq=1, follower_quality=1
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      await privaraContract.connect(signers.alice).computeReputation();

      // Account Health = (1 + 1) / 2 = 1
      const health = await privaraContract.connect(signers.alice).getResult(2);
      const clearHealth = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        health,
        privaraContractAddress,
        signers.alice,
      );
      expect(clearHealth).to.eq(1);
    });
  });

  describe("Error Handling", function () {
    it("should revert when computing without submission", async function () {
      await expect(
        privaraContract.connect(signers.alice).computeReputation()
      ).to.be.revertedWith("No metrics submitted");
    });

    it("should revert when computing twice", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      await privaraContract.connect(signers.alice).computeReputation();

      // Try to compute again - should fail
      await expect(
        privaraContract.connect(signers.alice).computeReputation()
      ).to.be.revertedWith("Already computed");
    });

    it("should revert when getting result without computation", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      // Try to get result before computation - should fail
      await expect(
        privaraContract.connect(signers.alice).getResult(0)
      ).to.be.revertedWith("Result not ready");
    });

    it("should revert when getting result with invalid index", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      await privaraContract.connect(signers.alice).computeReputation();

      // Try to get result with invalid index - should fail
      await expect(
        privaraContract.connect(signers.alice).getResult(5)
      ).to.be.revertedWith("Invalid index");
    });
  });

  describe("Events", function () {
    it("should emit MetricsSubmitted event on submission", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      const tx = await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      await expect(tx)
        .to.emit(privaraContract, "MetricsSubmitted")
        .withArgs(signers.alice.address);
    });

    it("should emit ReputationComputed event on computation", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      const tx = await privaraContract.connect(signers.alice).computeReputation();

      await expect(tx)
        .to.emit(privaraContract, "ReputationComputed")
        .withArgs(signers.alice.address);
    });
  });

  describe("Integration Tests", function () {
    it("should complete full flow: submit -> compute -> get results", async function () {
      // Step 1: Submit metrics
      const encryptedInput = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(5000)   // follower_count
        .add32(2000)   // following_count
        .add32(75)     // engagement_rate
        .add32(730)    // account_age_days
        .add32(15)     // bot_likelihood
        .add32(85)     // posting_frequency
        .add32(90)     // follower_quality
        .add32(80)     // growth_score
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(encryptedInput.handles, encryptedInput.inputProof);

      expect(await privaraContract.hasUserSubmitted(signers.alice.address)).to.be.true;
      expect(await privaraContract.isResultReady(signers.alice.address)).to.be.false;

      // Step 2: Compute reputation
      await privaraContract.connect(signers.alice).computeReputation();

      expect(await privaraContract.isResultReady(signers.alice.address)).to.be.true;

      // Step 3: Get all results
      const allResults = await privaraContract.connect(signers.alice).getAllResults();
      expect(allResults.length).to.eq(5);

      // Step 4: Decrypt and verify each result
      const authenticity = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        allResults[0],
        privaraContractAddress,
        signers.alice,
      );
      expect(authenticity).to.eq(85); // 100 - 15

      const influence = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        allResults[1],
        privaraContractAddress,
        signers.alice,
      );
      expect(influence).to.eq(75); // engagement_rate

      const health = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        allResults[2],
        privaraContractAddress,
        signers.alice,
      );
      expect(health).to.eq(87); // (85 + 90) / 2 = 87.5 -> 87 (integer division)

      const risk = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        allResults[3],
        privaraContractAddress,
        signers.alice,
      );
      expect(risk).to.eq(15); // bot_likelihood

      const momentum = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        allResults[4],
        privaraContractAddress,
        signers.alice,
      );
      expect(momentum).to.eq(80); // growth_score
    });

    it("should allow reset and full resubmission flow", async function () {
      // First submission
      const input1 = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(1000).add32(500).add32(50).add32(365)
        .add32(10).add32(70).add32(80).add32(60)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(input1.handles, input1.inputProof);
      await privaraContract.connect(signers.alice).computeReputation();

      const result1 = await privaraContract.connect(signers.alice).getResult(0);
      const clear1 = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        result1,
        privaraContractAddress,
        signers.alice,
      );

      // Reset
      await privaraContract.connect(signers.alice).reset();

      // Second submission with different values
      const input2 = await fhevm
        .createEncryptedInput(privaraContractAddress, signers.alice.address)
        .add32(2000).add32(1000).add32(60).add32(730)
        .add32(5).add32(80).add32(85).add32(70)
        .encrypt();

      await privaraContract
        .connect(signers.alice)
        .submitMetrics(input2.handles, input2.inputProof);
      await privaraContract.connect(signers.alice).computeReputation();

      const result2 = await privaraContract.connect(signers.alice).getResult(0);
      const clear2 = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        result2,
        privaraContractAddress,
        signers.alice,
      );

      // Results should be different
      expect(clear1).to.eq(90); // 100 - 10
      expect(clear2).to.eq(95); // 100 - 5
      expect(clear2).to.be.gt(clear1);
    });
  });
});


