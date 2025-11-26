// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Privara - Privacy-Preserving Reputation Layer
/// @author Privara Team
/// @notice Computes reputation scores from encrypted Twitter metrics using FHE
/// @dev Built for Zama FHEVM - all computations happen on encrypted data
contract Privara is ZamaEthereumConfig {
    // Encrypted metrics storage (8 metrics per user)
    mapping(address => euint32[8]) private encryptedMetrics;
    
    // Encrypted reputation results (5 scores per user)
    mapping(address => euint32[5]) private encryptedResults;
    
    // User submission status
    mapping(address => bool) private hasSubmitted;
    mapping(address => bool) private resultReady;
    
    // Events
    event MetricsSubmitted(address indexed user);
    event ReputationComputed(address indexed user);
    
    /// @notice Submit encrypted Twitter metrics
    /// @param metrics Array of 8 encrypted metrics:
    ///        [0] follower_count, [1] following_count, [2] engagement_rate*100,
    ///        [3] account_age_days, [4] bot_likelihood*100, [5] posting_freq*100,
    ///        [6] follower_quality*100, [7] growth_score*100
    /// @param inputProof The proof for all encrypted inputs
    function submitMetrics(
        externalEuint32[8] calldata metrics,
        bytes calldata inputProof
    ) external {
        require(!hasSubmitted[msg.sender], "Already submitted");
        
        // Convert external inputs to internal encrypted values
        for (uint256 i = 0; i < 8; i++) {
            encryptedMetrics[msg.sender][i] = FHE.fromExternal(metrics[i], inputProof);
            // Allow this contract to use the values
            FHE.allowThis(encryptedMetrics[msg.sender][i]);
        }
        
        hasSubmitted[msg.sender] = true;
        emit MetricsSubmitted(msg.sender);
    }
    
    /// @notice Compute reputation from encrypted metrics using FHE
    /// @dev All math operations happen on encrypted data - values never decrypted on-chain
    function computeReputation() external {
        require(hasSubmitted[msg.sender], "No metrics submitted");
        require(!resultReady[msg.sender], "Already computed");
        
        euint32[8] storage m = encryptedMetrics[msg.sender];
        
        // Scale factor: 100 (metrics already scaled by 100 on client)
        // We'll compute reputation scores as 0-100 range
        
        // ========================================
        // Authenticity Score (0-100)
        // Formula: 100 - bot_likelihood (higher = more authentic)
        // ========================================
        euint32 hundred = FHE.asEuint32(100);
        euint32 authenticity = FHE.sub(hundred, m[4]); // 100 - bot_likelihood
        
        // ========================================
        // Influence Score (0-100)
        // Simplified: engagement_rate (already 0-100)
        // ========================================
        euint32 influence = m[2]; // engagement_rate
        
        // ========================================
        // Account Health Score (0-100)
        // Formula: (posting_frequency + follower_quality) / 2
        // ========================================
        euint32 healthSum = FHE.add(m[5], m[6]); // posting_freq + follower_quality
        euint32 accountHealth = FHE.div(healthSum, 2); // div by plain uint32
        
        // ========================================
        // Risk Score (0-100)
        // Formula: bot_likelihood (higher = more risky)
        // ========================================
        euint32 riskScore = m[4]; // bot_likelihood
        
        // ========================================
        // Momentum Score (0-100)
        // Formula: growth_score (already 0-100)
        // ========================================
        euint32 momentum = m[7]; // growth_score
        
        // Store results
        encryptedResults[msg.sender][0] = authenticity;
        encryptedResults[msg.sender][1] = influence;
        encryptedResults[msg.sender][2] = accountHealth;
        encryptedResults[msg.sender][3] = riskScore;
        encryptedResults[msg.sender][4] = momentum;
        
        // Grant decryption permissions to user and contract
        for (uint256 i = 0; i < 5; i++) {
            FHE.allowThis(encryptedResults[msg.sender][i]);
            FHE.allow(encryptedResults[msg.sender][i], msg.sender);
        }
        
        resultReady[msg.sender] = true;
        emit ReputationComputed(msg.sender);
    }
    
    /// @notice Get encrypted reputation result
    /// @param index Which score: 0=authenticity, 1=influence, 2=health, 3=risk, 4=momentum
    /// @return The encrypted reputation score
    function getResult(uint256 index) external view returns (euint32) {
        require(resultReady[msg.sender], "Result not ready");
        require(index < 5, "Invalid index");
        return encryptedResults[msg.sender][index];
    }
    
    /// @notice Get all encrypted results at once
    /// @return Array of 5 encrypted reputation scores
    function getAllResults() external view returns (euint32[5] memory) {
        require(resultReady[msg.sender], "Result not ready");
        return encryptedResults[msg.sender];
    }
    
    /// @notice Check if user has submitted metrics
    function hasUserSubmitted(address user) external view returns (bool) {
        return hasSubmitted[user];
    }
    
    /// @notice Check if result is ready for user
    function isResultReady(address user) external view returns (bool) {
        return resultReady[user];
    }
    
    /// @notice Reset user data (for testing/resubmission)
    function reset() external {
        hasSubmitted[msg.sender] = false;
        resultReady[msg.sender] = false;
    }
}

