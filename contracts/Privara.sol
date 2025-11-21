// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Privara
 * @notice Privacy-preserving reputation layer for social identity
 * @dev Stores encrypted Twitter metrics and encrypted reputation results
 */
contract Privara {
    // Mapping from user address to encrypted Twitter metrics
    mapping(address => bytes) private encryptedMetrics;
    
    // Mapping from user address to encrypted reputation vector
    mapping(address => bytes) private encryptedResults;
    
    // Mapping to track if user has submitted data
    mapping(address => bool) private hasSubmitted;
    
    // Mapping to track if result is ready
    mapping(address => bool) private resultReady;
    
    /**
     * @notice Emitted when encrypted data is submitted
     * @param user Address of the user submitting data
     * @param encryptedPayload Encrypted Twitter metrics
     */
    event EncryptedDataSubmitted(address indexed user, bytes encryptedPayload);
    
    /**
     * @notice Emitted when encrypted result is stored
     * @param user Address of the user
     * @param encryptedResult Encrypted reputation vector
     */
    event EncryptedResultStored(address indexed user, bytes encryptedResult);
    
    /**
     * @notice Submit encrypted Twitter metrics
     * @param encryptedPayload Encrypted metrics data
     */
    function submitEncryptedData(bytes calldata encryptedPayload) external {
        require(encryptedPayload.length > 0, "Empty payload");
        require(!hasSubmitted[msg.sender], "Data already submitted");
        
        encryptedMetrics[msg.sender] = encryptedPayload;
        hasSubmitted[msg.sender] = true;
        
        emit EncryptedDataSubmitted(msg.sender, encryptedPayload);
    }
    
    /**
     * @notice Store encrypted reputation result (called by backend worker)
     * @param user Address of the user
     * @param encryptedResult Encrypted reputation vector
     */
    function storeEncryptedResult(address user, bytes calldata encryptedResult) external {
        require(encryptedResult.length > 0, "Empty result");
        require(hasSubmitted[user], "No data submitted for user");
        
        encryptedResults[user] = encryptedResult;
        resultReady[user] = true;
        
        emit EncryptedResultStored(user, encryptedResult);
    }
    
    /**
     * @notice Get encrypted result for a user
     * @param user Address of the user
     * @return Encrypted reputation vector
     */
    function getEncryptedResult(address user) external view returns (bytes memory) {
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

