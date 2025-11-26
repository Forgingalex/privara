// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PrivaraFHEVM
 * @notice Privacy-preserving reputation layer using FHEVM encrypted types
 * @dev This contract uses FHEVM for on-chain FHE computations
 * 
 * IMPORTANT: This contract requires FHEVM network and dependencies
 * Install: npm install --save-dev @zama-ai/fhevm-hardhat-plugin
 * 
 * Documentation: https://docs.zama.ai/fhevm
 */

// Import FHEVM library
import {FHE, euint32, euint64, inEuint32, inEuint64} from "@fhevm/solidity/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @notice FHEVM-compatible Privara contract
 * 
 * This contract accepts encrypted inputs and performs FHE computations on-chain
 */
contract PrivaraFHEVM is SepoliaConfig {
    // Mapping from user address to encrypted Twitter metrics (FHEVM encrypted types)
    mapping(address => euint32[]) private encryptedMetrics;
    
    // Mapping from user address to encrypted reputation vector
    mapping(address => euint32[]) private encryptedResults;
    
    // Mapping to track if user has submitted data
    mapping(address => bool) private hasSubmitted;
    
    // Mapping to track if result is ready
    mapping(address => bool) private resultReady;
    
    /**
     * @notice Emitted when encrypted data is submitted
     * @param user Address of the user submitting data
     */
    event EncryptedDataSubmitted(address indexed user);
    
    /**
     * @notice Emitted when encrypted result is stored
     * @param user Address of the user
     */
    event EncryptedResultStored(address indexed user);
    
    /**
     * @notice Submit encrypted Twitter metrics
     * @param encryptedMetricsArray Array of encrypted metrics (euint32[])
     * 
     * Expected format: [follower_count, following_count, engagement_rate*100, 
     *                   account_age_days, bot_likelihood*100, posting_frequency*100,
     *                   follower_quality*100, growth_score*100]
     */
    function submitEncryptedData(euint32[] calldata encryptedMetricsArray) external {
        require(encryptedMetricsArray.length == 8, "Invalid metrics array length");
        require(!hasSubmitted[msg.sender], "Data already submitted");
        
        // Store encrypted metrics
        encryptedMetrics[msg.sender] = encryptedMetricsArray;
        hasSubmitted[msg.sender] = true;
        
        emit EncryptedDataSubmitted(msg.sender);
    }
    
    /**
     * @notice Compute reputation vector from encrypted metrics using FHE operations
     * @return Encrypted reputation vector [authenticity, influence, account_health, risk_score, momentum]
     * 
     * This function performs FHE computations on-chain using FHEVM library
     * All values are scaled by 10000 (SCALE) for precision
     */
    function computeReputation() public view returns (euint32[] memory) {
        require(hasSubmitted[msg.sender], "No data submitted");
        
        euint32[] memory metrics = encryptedMetrics[msg.sender];
        require(metrics.length == 8, "Invalid metrics length");
        
        // Extract metrics (all encrypted)
        euint32 follower_count = metrics[0];
        euint32 following_count = metrics[1];
        euint32 engagement_rate_scaled = metrics[2]; // Already scaled by 100
        euint32 account_age_days = metrics[3];
        euint32 bot_likelihood_scaled = metrics[4]; // Already scaled by 100
        euint32 posting_freq_scaled = metrics[5]; // Already scaled by 100
        euint32 follower_quality_scaled = metrics[6]; // Already scaled by 100
        euint32 growth_score_scaled = metrics[7]; // Already scaled by 100
        
        // Convert scaled values to SCALE (10000) for FHE operations
        // engagement_rate_scaled is already *100, so multiply by 100 more to get *10000
        euint32 engagement_rate = FHE.mul(engagement_rate_scaled, inEuint32(100));
        euint32 bot_likelihood = FHE.mul(bot_likelihood_scaled, inEuint32(100));
        euint32 posting_frequency = FHE.mul(posting_freq_scaled, inEuint32(100));
        euint32 follower_quality = FHE.mul(follower_quality_scaled, inEuint32(100));
        euint32 growth_score = FHE.mul(growth_score_scaled, inEuint32(100));
        
        // Formula 1: authenticity = 0.4*(followers/following) + 0.3*(100 - bot_likelihood) + 0.3*(account_age_days/365 * 100)
        // Part 1: 0.4 * (followers/following) * SCALE
        euint32 followerRatio = FHE.div(FHE.mul(follower_count, inEuint32(10000)), following_count);
        euint32 authenticityPart1 = FHE.mul(followerRatio, inEuint32(40)) / 100;
        
        // Part 2: 0.3 * (100 - bot_likelihood) * SCALE
        euint32 botInverse = FHE.sub(inEuint32(1000000), bot_likelihood); // 100 * SCALE
        euint32 authenticityPart2 = FHE.mul(botInverse, inEuint32(30)) / 100;
        
        // Part 3: 0.3 * (account_age_days/365 * 100) * SCALE
        euint32 ageScore = FHE.div(FHE.mul(account_age_days, inEuint32(1000000)), inEuint32(365));
        euint32 authenticityPart3 = FHE.mul(ageScore, inEuint32(30)) / 100;
        
        euint32 authenticity = FHE.add(FHE.add(authenticityPart1, authenticityPart2), authenticityPart3);
        
        // Formula 2: influence = 0.5*log(followers + 1) + 0.3*engagement_rate + 0.2*growth_score
        // Note: Logarithm approximation would need to be implemented using FHE polynomial
        // For now, using simplified version without log
        euint32 influencePart1 = FHE.mul(engagement_rate, inEuint32(30)) / 100;
        euint32 influencePart2 = FHE.mul(growth_score, inEuint32(20)) / 100;
        euint32 influence = FHE.add(influencePart1, influencePart2);
        
        // Formula 3: account_health = 0.5*posting_frequency + 0.3*follower_quality + 0.2*engagement_rate
        euint32 healthPart1 = FHE.mul(posting_frequency, inEuint32(50)) / 100;
        euint32 healthPart2 = FHE.mul(follower_quality, inEuint32(30)) / 100;
        euint32 healthPart3 = FHE.mul(engagement_rate, inEuint32(20)) / 100;
        euint32 account_health = FHE.add(FHE.add(healthPart1, healthPart2), healthPart3);
        
        // Formula 4: risk_score = 100 - ((authenticity + account_health)/2)
        euint32 avgAuthenticityHealth = FHE.div(FHE.add(authenticity, account_health), inEuint32(2));
        euint32 risk_score = FHE.sub(inEuint32(1000000), avgAuthenticityHealth); // 100 * SCALE
        
        // Formula 5: momentum = 0.6*growth_score + 0.4*engagement_rate
        euint32 momentumPart1 = FHE.mul(growth_score, inEuint32(60)) / 100;
        euint32 momentumPart2 = FHE.mul(engagement_rate, inEuint32(40)) / 100;
        euint32 momentum = FHE.add(momentumPart1, momentumPart2);
        
        // Return encrypted reputation vector
        euint32[] memory reputationVector = new euint32[](5);
        reputationVector[0] = authenticity;
        reputationVector[1] = influence;
        reputationVector[2] = account_health;
        reputationVector[3] = risk_score;
        reputationVector[4] = momentum;
        
        return reputationVector;
    }
    
    /**
     * @notice Store encrypted reputation result (called after computation)
     * @param user Address of the user
     * @param encryptedResult Encrypted reputation vector
     */
    function storeEncryptedResult(
        address user,
        euint32[] calldata encryptedResult
    ) external {
        require(encryptedResult.length == 5, "Invalid result array length");
        require(hasSubmitted[user], "No data submitted for user");
        
        encryptedResults[user] = encryptedResult;
        resultReady[user] = true;
        
        emit EncryptedResultStored(user);
    }
    
    /**
     * @notice Get encrypted result for a user
     * @param user Address of the user
     * @return Encrypted reputation vector
     */
    function getEncryptedResult(address user) external view returns (euint32[] memory) {
        require(resultReady[user], "Result not ready");
        return encryptedResults[user];
    }
    
    /**
     * @notice Check if user has submitted data
     * @param user Address of the user
     * @return True if data has been submitted
     */
    function hasUserSubmitted(address user) external view returns (bool) {
        return hasSubmitted[user];
    }
    
    /**
     * @notice Check if result is ready for user
     * @param user Address of the user
     * @return True if result is ready
     */
    function isResultReady(address user) external view returns (bool) {
        return resultReady[user];
    }
}
