# Privara User Guide and Technical Walkthrough

## Introduction

Privara is a privacy preserving reputation system that computes social reputation scores from Twitter data using Fully Homomorphic Encryption. The system ensures that raw user data never appears in plaintext form anywhere in the process. All computations happen on encrypted values, and only the user who owns the data can decrypt the final results.

Traditional reputation systems require users to expose their social media metrics in plaintext to third party services. This creates privacy risks because the service provider can see and potentially misuse the raw data. Privara solves this problem by encrypting all data before it leaves the user's browser and performing all calculations while the data remains encrypted.

## Problem Statement

When users want to prove their social reputation for purposes like joining a DAO, applying for a web3 job, or participating in governance, they typically must share their Twitter analytics with a service provider. This means the provider can see exactly how many followers you have, your engagement rates, and other sensitive metrics. Even if the provider promises not to misuse the data, you are placing trust in a centralized entity.

Privara removes this trust requirement by using Fully Homomorphic Encryption technology from Zama. With FHE, mathematical operations can be performed on encrypted data without ever decrypting it. The service that computes your reputation score never sees your actual follower count, engagement rate, or any other metric in plaintext form.

## Solution Overview

Privara works by encrypting Twitter metrics in the user's browser using the Zama FHE SDK. These encrypted values are then submitted to an Ethereum smart contract that stores them on chain. The smart contract performs reputation calculations using FHE operations provided by the FHEVM framework. The calculations produce encrypted results that remain encrypted on the blockchain. When the user wants to see their reputation scores, they request decryption from the Zama relayer service, which uses their private key to decrypt only their own results.

The entire process ensures that at no point does any party other than the user see unencrypted data. The smart contract cannot see plaintext values. The blockchain cannot see plaintext values. Even if someone examines the contract's storage, they only see encrypted ciphertext that is meaningless without the user's decryption key.

## Technical Architecture

Privara consists of three main components that work together to enable privacy preserving reputation computation.

The frontend application is built with Next.js and React. It runs entirely in the user's web browser and handles the initial encryption of Twitter metrics. The frontend uses the Zama FHE Relayer SDK which loads WebAssembly modules needed for encryption operations. The SDK is isolated from server side rendering using dynamic imports and webpack configuration to prevent browser specific code from executing during Next.js build processes.

The smart contract is written in Solidity and uses the FHEVM framework from Zama. FHEVM extends Ethereum with Fully Homomorphic Encryption capabilities, allowing contracts to perform mathematical operations on encrypted data types called euint32. The contract stores eight encrypted Twitter metrics per user and computes five reputation scores using FHE operations. All computations happen on encrypted values, meaning the contract never has access to plaintext data.

The backend worker is a Node.js service that listens for blockchain events. When a user submits encrypted metrics to the contract, the worker processes the submission and can trigger additional off chain computations if needed. The worker also handles storing computed reputation results back on the blockchain.

## How Fully Homomorphic Encryption Works in Privara

Fully Homomorphic Encryption allows computations to be performed on encrypted data. In traditional encryption, you must decrypt data before performing any operations on it. FHE changes this by providing special mathematical operations that work directly on ciphertext.

In Privara, when a user encrypts their Twitter metrics, each metric becomes an encrypted value called an euint32. This is an encrypted unsigned 32 bit integer. The encryption happens using Zama's FHE scheme which supports operations like addition, subtraction, and division while the data remains encrypted.

The smart contract receives these encrypted values and stores them. When computing reputation, the contract uses FHE operations like FHE.add to add two encrypted values together, FHE.sub to subtract encrypted values, and FHE.div to divide an encrypted value by a plain integer. These operations produce new encrypted values as results. The contract never decrypts anything, so it never sees the actual numbers being calculated.

For example, when computing the authenticity score, the contract performs the operation "100 minus bot likelihood" where both values are encrypted. The result is also encrypted. Someone examining the blockchain can see that the contract performed a subtraction operation, but they cannot determine what numbers were involved or what the result equals until the user decrypts it with their private key.

## Complete User Flow

### Step One: Landing Page and Wallet Connection

When users first visit Privara, they see the landing page which explains the service. To proceed, users must connect a cryptocurrency wallet such as MetaMask. The application uses Wagmi for wallet integration, which supports many wallet providers. When the user clicks the connect wallet button, their wallet prompts them to authorize the connection. Once connected, the application automatically switches the user's network to Sepolia testnet if they are not already on it.

The wallet connection serves two purposes. First, it provides the user's Ethereum address which is needed to associate encrypted data with a specific account on the blockchain. Second, the wallet will be used later to sign transactions when submitting encrypted data to the smart contract and to sign messages when requesting decryption of reputation results.

<img width="1349" height="527" alt="image" src="https://github.com/user-attachments/assets/79e33d22-8526-4be6-a082-08e685065146" />


<img width="1346" height="548" alt="Screenshot 2025-11-30 132750" src="https://github.com/user-attachments/assets/f0ae76e4-c65d-4290-bf9b-96f59a23c279" />


### Step Two: Twitter Connection and Metrics Loading

After connecting a wallet, users can connect their Twitter account. In the current implementation, the application uses mock Twitter data for demonstration purposes. This allows testing and demonstration without requiring actual Twitter API credentials. The mock system generates realistic looking Twitter metrics including follower count, following count, engagement rate, account age, bot likelihood score, posting frequency, follower quality metric, and growth score.

When a user clicks the connect Twitter button, the application stores a flag in browser localStorage indicating the connection is active. The application then generates mock metrics that represent what real Twitter data would look like. These metrics are displayed on the page so users can see the data that will be encrypted.

In a production version, this step would integrate with the Twitter API to fetch real metrics from a user's account. The API integration would retrieve follower counts, engagement statistics, account creation date, and other relevant metrics that feed into the reputation calculation.

<img width="1347" height="445" alt="Screenshot 2025-11-30 132807" src="https://github.com/user-attachments/assets/c97acc08-d0a7-4746-af98-091d8b9fc974" />


### Step Three: Encrypting Twitter Metrics

Once Twitter metrics are loaded, users navigate to the encryption page. This page displays all eight metrics that will be encrypted: follower count, following count, engagement rate as a percentage, account age in days, bot likelihood as a percentage, posting frequency as a percentage, follower quality as a percentage, and growth score as a percentage.

Before encryption can occur, the Zama FHE SDK must initialize in the browser. The SDK loads WebAssembly modules required for encryption operations. Initialization happens automatically when the page loads, but only if a wallet is connected and the browser environment is properly configured. The application displays a loading indicator while the SDK initializes.

When the user clicks the encrypt button, the application scales the metrics to integers suitable for encryption. Percentages are multiplied by 100 to convert from 0 to 100 range to 0 to 10000 range. This scaling ensures precision is maintained when values are encrypted as integers. The scaled metrics are then passed to the Zama FHE SDK's createEncryptedInput function along with the contract address and user's wallet address.

The SDK creates an encrypted input object that contains multiple encrypted handles. Each handle is an encrypted representation of one metric value. The SDK also generates a cryptographic proof that verifies the encrypted values were created correctly. This proof is required by the smart contract to accept the encrypted data.

The encryption process produces an encrypted payload containing eight encrypted handles and one input proof. This payload is formatted as a hexadecimal string that can be stored and transmitted. The payload is stored in browser localStorage so it persists across page navigation. The application displays a truncated version of the encrypted payload to confirm encryption completed successfully.

<img width="1347" height="626" alt="Screenshot 2025-11-30 132824" src="https://github.com/user-attachments/assets/ac562935-23ce-410e-aa87-255d90d8dfbb" />

<img width="936" height="352" alt="Screenshot 2025-11-30 132927" src="https://github.com/user-attachments/assets/9f21e3a9-0eda-4875-88c4-9cf5814acfad" />


### Step Four: Submitting Encrypted Data to Smart Contract

After encryption completes, users navigate to the submission page. This page displays the encrypted payload and provides a button to submit it to the Ethereum smart contract. When the user clicks submit, the application reads the encrypted handles and input proof from localStorage and formats them according to the contract's expected interface.

The smart contract's submitMetrics function expects an array of eight external encrypted handles and one input proof. The external encrypted handles are a specific format used by FHEVM that allows encrypted values to be passed into contract functions. The proof verifies that these encrypted values are valid and were created for the correct contract and user address.

The application uses Wagmi's writeContract hook to construct and send the transaction. The user's wallet prompts them to confirm the transaction and pay for gas fees. On Sepolia testnet, gas costs are paid using testnet ETH which has no real value. The transaction is broadcast to the Sepolia network and waits for confirmation.

Once the transaction is confirmed, the smart contract stores the encrypted metrics in its storage. The contract maintains a mapping from user address to an array of eight encrypted metrics. The contract also emits an event indicating that encrypted data was submitted. This event can be listened to by backend services or other applications.

The submission page displays the transaction hash after successful submission. Users can click this hash to view the transaction on Etherscan, Sepolia's block explorer. This provides transparency and allows users to verify their data was stored correctly on the blockchain.

<img width="936" height="567" alt="Screenshot 2025-11-30 132940" src="https://github.com/user-attachments/assets/5b8b67ae-7eb5-4a02-acb4-51d5779fe6c4" />

<img width="956" height="601" alt="Screenshot 2025-11-30 133012" src="https://github.com/user-attachments/assets/7cac3bf1-5609-4c50-b360-f8010df69043" />

<img width="891" height="253" alt="Screenshot 2025-11-30 133025" src="https://github.com/user-attachments/assets/172e910c-c35a-4117-835c-9f62b82fce38" />

### Step Five: Computing Reputation Scores

After encrypted metrics are stored on the smart contract, reputation scores must be computed. The computation happens entirely on the smart contract using FHE operations. Users call the contract's computeReputation function which performs calculations on the stored encrypted metrics.

The contract computes five reputation scores: authenticity, influence, account health, risk score, and momentum. Each score is calculated using FHE operations that work directly on the encrypted metric values. The calculations never decrypt the data, so all operations produce encrypted results.

For the authenticity score, the contract performs the operation 100 minus bot likelihood. Both values are encrypted, so the subtraction happens in encrypted form. The result is an encrypted authenticity score. The contract stores this and the other four scores as encrypted values in its storage.

When computation completes, the contract grants decryption permission to the user. This permission allows the user to decrypt their own reputation scores later. The permission is cryptographically tied to the user's address, so only they can decrypt their results even though the encrypted scores are stored publicly on the blockchain.


<img width="1074" height="557" alt="Screenshot 2025-11-30 133051" src="https://github.com/user-attachments/assets/ae41b5d7-1851-418e-84dc-4c7ec118a451" />

<img width="1066" height="317" alt="Screenshot 2025-11-30 133113" src="https://github.com/user-attachments/assets/e6bc36e4-18b9-4999-a9c3-c4191466e11a" />

### Step Six: Decrypting Reputation Results

After reputation computation completes, users can view their decrypted scores on the decrypt page. The application reads the encrypted reputation scores from the smart contract and requests decryption from the Zama relayer service.

Decryption requires the user to sign a message using their wallet. This signature proves they own the address that has permission to decrypt the scores. The application creates an EIP 712 typed data message that includes the contract address, the scores to decrypt, and a timestamp. The user's wallet prompts them to sign this message.

Once signed, the application sends the encrypted scores and signature to the Zama relayer. The relayer verifies the signature and checks that the user has permission to decrypt these specific scores. If verified, the relayer uses the user's private key to decrypt the scores and returns the plaintext values.

The application receives the decrypted scores and displays them in a visual format. Each score is shown as a progress bar with a numerical value from 0 to 100. The scores are labeled with descriptions explaining what they represent. Authenticity measures how genuine the account appears based on bot likelihood. Influence measures the account's reach based on engagement rates. Account health combines posting frequency and follower quality metrics. Risk score indicates potential account issues. Momentum reflects growth trends.

Only the user who owns the encrypted data can decrypt these scores. Even though the encrypted scores are stored on a public blockchain and visible to anyone, they remain encrypted until the user requests decryption with their private key. This maintains privacy while enabling verifiable reputation computation.

<img width="1129" height="388" alt="Screenshot 2025-11-30 133132" src="https://github.com/user-attachments/assets/5486405f-6631-4e33-96e6-33d2047c1c87" />

## Smart Contract Implementation

The Privara smart contract is written using Solidity version 0.8.24 and integrates with Zama's FHEVM framework. The contract inherits from ZamaEthereumConfig which provides the necessary configuration for FHE operations on Ethereum testnets.

The contract stores encrypted metrics using FHEVM's euint32 type, which represents an encrypted 32 bit unsigned integer. Each user has an array of eight euint32 values representing their eight Twitter metrics. The contract also stores encrypted reputation results as an array of five euint32 values representing the five reputation scores.

The submitMetrics function accepts eight external encrypted handles and one input proof. External encrypted handles are a format that allows encrypted values to be passed as function parameters. The contract converts these external handles into internal euint32 values using FHE.fromExternal with the input proof. The proof ensures the encrypted values are valid and were created for this specific contract and user address.

After conversion, the contract grants itself permission to use these encrypted values in future computations. This permission is required because FHEVM enforces access control on encrypted data. The contract must be explicitly allowed to perform operations on encrypted values.

The computeReputation function performs all reputation calculations using FHE operations. The contract reads the stored encrypted metrics and applies mathematical operations to compute each of the five reputation scores. All operations use functions from the FHE library: FHE.add for addition, FHE.sub for subtraction, and FHE.div for division.

The authenticity score is computed as 100 minus bot likelihood. The contract creates an encrypted constant value of 100 using FHE.asEuint32, then subtracts the encrypted bot likelihood value using FHE.sub. The result remains encrypted.

The influence score is set equal to the engagement rate metric. This is a direct assignment since both are already in the correct 0 to 100 range.

The account health score is computed as the average of posting frequency and follower quality. The contract adds these two encrypted values using FHE.add, then divides by the plain integer 2 using FHE.div. Division by a plain integer is supported by FHEVM and is more efficient than dividing two encrypted values.

The risk score is set equal to bot likelihood, providing a direct risk metric based on the bot detection score.

The momentum score is set equal to growth score, reflecting the account's growth trajectory.

After computing all five scores, the contract stores them and grants decryption permission to the user. Each encrypted score must have the user's address added to its access control list so they can decrypt it later. The contract also grants itself permission so it can return the scores when queried.

The contract provides view functions to retrieve encrypted results. The getResult function returns a single encrypted score by index, and getAllResults returns all five encrypted scores at once. Both functions require that computation has completed for the requesting user.

## Frontend Encryption Implementation

The frontend handles encryption using the Zama FHE Relayer SDK. The SDK is loaded dynamically only on the client side to prevent server side rendering issues. The application uses Next.js dynamic imports and webpack configuration to ensure the SDK never executes during server side rendering.

The FHE context provider manages the SDK instance lifecycle. When the application loads, the context provider checks if a wallet is connected and initializes the SDK in a React useEffect hook. The initialization happens asynchronously and only in the browser environment. The SDK loads WebAssembly modules required for encryption operations.

When encrypting metrics, the application calls createEncryptedInput on the SDK instance, passing the contract address and user address. This creates an encrypted input builder object. The application then calls add32 for each metric value to add it to the encrypted input. The add32 function accepts a plain integer and will encrypt it when the encrypt method is called.

After all eight metrics are added, the application calls encrypt which performs the actual encryption. This returns an object containing encrypted handles and an input proof. The handles are arrays of bytes representing encrypted values. The proof is cryptographic evidence that the encryption was performed correctly.

The application formats these into a hexadecimal payload for storage and transmission. The payload structure includes a header indicating the number of handles, followed by the handle data, followed by the proof data. This format allows the payload to be reconstructed later when needed for contract submission.

## Testing and Verification

The project includes comprehensive test coverage for the smart contract. The test suite uses Hardhat with the FHEVM plugin which provides a mock FHE environment for testing. Tests verify that encryption, submission, computation, and decryption all work correctly together.

The test suite includes deployment tests that verify the contract deploys successfully. Submission tests verify that encrypted metrics can be submitted and stored correctly. Computation tests verify that each reputation score is calculated correctly using various input combinations. Edge case tests verify behavior with zero values, maximum values, and boundary conditions. Error handling tests verify that invalid operations are properly rejected.

Integration tests verify the complete flow from submission through computation to result retrieval. These tests submit encrypted metrics, trigger computation, retrieve encrypted results, and decrypt them to verify the scores match expected values based on the input metrics.

The test suite demonstrates that the FHE operations produce mathematically correct results even though all computations happen on encrypted data. This proves that privacy is maintained without sacrificing correctness.

## Live Deployment

Privara is deployed and accessible at https://privara-neon.vercel.app/. The frontend is hosted on Vercel which provides automatic deployments from the GitHub repository. The smart contract is deployed on Sepolia testnet at address 0x293C20c5E122ea3e876DB5D44509BA94a78A42D9, which can be viewed on Etherscan.

The deployment demonstrates the complete user flow working end to end. Users can connect their wallet, load Twitter metrics, encrypt them, submit to the contract, compute reputation, and decrypt results. The system works with real blockchain transactions on a test network, proving the architecture functions correctly in a production like environment.

## Security and Privacy Guarantees

Privara provides strong privacy guarantees through the use of Fully Homomorphic Encryption. The system ensures that raw Twitter metrics never appear in plaintext form after leaving the user's browser. Encryption happens client side using the Zama FHE SDK, so even the application servers never see unencrypted data.

The smart contract performs all reputation computations on encrypted values. The contract cannot see or access plaintext metric values or reputation scores. Anyone examining the contract's storage on the blockchain sees only encrypted ciphertext that is cryptographically secure and meaningless without decryption keys.

Decryption requires the user's private key which is stored in their wallet. The Zama relayer service facilitates decryption but does not store private keys. The relayer verifies the user has permission to decrypt specific scores and performs the decryption operation, but it cannot decrypt data without the user's authorization.

The system is designed so that even if an attacker gains access to the smart contract, the blockchain, or the application servers, they cannot access plaintext user data. Only the user who owns the encrypted data can decrypt it using their private key. This provides end to end privacy protection.

## Use Cases and Applications

Privara enables privacy preserving reputation verification for several important use cases. Web3 social platforms can use it to verify user reputation without requiring users to expose their Twitter analytics. Users can prove they have good social standing based on engagement and authenticity metrics without revealing exact follower counts or engagement rates.

DAO governance systems can use Privara to implement reputation based voting. Members can demonstrate their influence and authenticity through encrypted reputation scores without exposing sensitive social media data. This enables fair governance while maintaining member privacy.

Identity verification services can integrate Privara to add social reputation to identity profiles while preserving privacy. Users can prove their online presence and credibility without revealing all their social media metrics to the verification service.

Credit scoring systems could potentially use encrypted social reputation as a factor in credit decisions without seeing the underlying data. This allows financial services to consider social proof while maintaining user privacy.

The architecture is extensible to other social platforms beyond Twitter. The same FHE based approach could work with LinkedIn metrics, GitHub activity, or other social data sources. The core privacy preserving computation framework remains the same regardless of the data source.

## Future Enhancements

Several enhancements are planned to expand Privara's capabilities. Real Twitter API integration will replace the mock data system, allowing users to connect their actual Twitter accounts and encrypt real metrics. Enhanced reputation formulas will incorporate more complex calculations that better reflect social reputation across different dimensions.

Multi chain support will allow deployment to additional blockchain networks beyond Sepolia testnet. This will provide users with more options and reduce dependency on a single network. Reputation history tracking will enable users to see how their scores change over time as their social media presence evolves.

An API for third party integrations will allow other applications to query reputation scores with user permission. This would enable Privara to serve as a reputation oracle for the broader web3 ecosystem. Mobile app support will make the service accessible from smartphones and tablets.

The current implementation focuses on Twitter metrics, but the architecture supports extension to other data sources. Future versions could incorporate metrics from multiple platforms into a unified reputation score, all computed under encryption to maintain privacy across all data sources.

## Conclusion

Privara demonstrates a practical application of Fully Homomorphic Encryption for privacy preserving reputation computation. The system proves that complex calculations can be performed on encrypted data without sacrificing correctness or usability. Users maintain control over their data while still being able to prove their reputation through verifiable encrypted computations.

The implementation uses production ready technologies including Zama's FHEVM framework for smart contracts and the Zama FHE Relayer SDK for client side encryption. The system is deployed and functional, demonstrating that FHE based applications are viable for real world use cases.

The architecture provides a foundation for building privacy preserving applications beyond reputation systems. The same patterns could apply to private voting systems, confidential auctions, private credit scoring, and other applications where computation must happen without exposing input data.

