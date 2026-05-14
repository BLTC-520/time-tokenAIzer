'use client';

/**
 * 🤖 Unified KYC Agent - Single Agent for Complete KYC Flow
 * 
 * Combines all KYC functionality into one agent:
 * - Database verification
 * - Smart contract interaction
 * - Chainlink Functions integration
 * - NFT minting monitoring
 * - Browser and Node.js compatibility
 */

import { createPublicClient, createWalletClient, http, isAddress, type Address, type Hash } from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { writeContract, readContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from '../lib/wagmi';
import { KYC_CONTRACT_ADDRESS, CHAINLINK_CONFIG } from '../shared/constants';

// Types
export interface KYCResult {
    success: boolean;
    tokenId?: number;
    contractAddress?: string;
    transactionHash?: string;
    pending?: boolean;
    error?: string;
    hasExistingNFT?: boolean;
}

export interface KYCStatus {
    hasAccess: boolean;
    kycLevel: number;
}

export interface KYCEventCallbacks {
    onKYCStart?: (walletAddress: string) => void;
    onKYCSuccess?: (result: KYCResult) => void;
    onKYCError?: (error: string) => void;
    onNFTMinted?: (tokenId: number, contractAddress: string, transactionHash?: string) => void;
    onAccessGranted?: () => void;
    // Add this new callback:
    onStepUpdate?: (
        stepId: string,
        status: 'pending' | 'processing' | 'completed' | 'error',
        description?: string,
        details?: string
    ) => void;
}

export class UnifiedKYCAgent {
    private contractAddress: Address;
    private subscriptionId: number;
    private donHostedSecretsSlotID: number;
    private donHostedSecretsVersion: number;
    private publicClient: any;
    private walletClient: any;
    private account: PrivateKeyAccount | null = null;

    // Browser compatibility
    private callbacks: KYCEventCallbacks = {};
    private isProcessing = false;
    private processingWallet: string | null = null;
    private lastTransactionHash: string | null = null;

    constructor() {
        // Contract configuration from constants - will be updated when you deploy
        this.contractAddress = KYC_CONTRACT_ADDRESS as Address;
        this.subscriptionId = CHAINLINK_CONFIG.SUBSCRIPTION_ID;
        this.donHostedSecretsSlotID = CHAINLINK_CONFIG.DON_HOSTED_SECRETS_SLOT_ID;
        this.donHostedSecretsVersion = CHAINLINK_CONFIG.DON_HOSTED_SECRETS_VERSION;

        console.log('🏗️ KYC Agent Configuration:', {
            contractAddress: this.contractAddress,
            subscriptionId: this.subscriptionId,
            secretsSlotID: this.donHostedSecretsSlotID,
            secretsVersion: this.donHostedSecretsVersion
        });

        this.setupClients();
    }

    private setupClients(): void {
        const rpcUrl = 'https://api.avax-test.network/ext/bc/C/rpc';

        // Public client for reading
        this.publicClient = createPublicClient({
            chain: avalancheFuji,
            transport: http(rpcUrl)
        });

        // Setup wallet client if private key available (Node.js)
        if (typeof process !== 'undefined' && process.env?.EVM_PRIVATE_KEY) {
            try {
                this.account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
                this.walletClient = createWalletClient({
                    chain: avalancheFuji,
                    transport: http(rpcUrl),
                    account: this.account
                });
                console.log(`🔗 KYC Agent connected with wallet: ${this.account.address}`);
            } catch (error) {
                console.warn('⚠️ Private key setup failed, using browser mode');
            }
        }

        console.log(`📝 KYC Contract: ${this.contractAddress}`);
        console.log(`🔗 Network: Avalanche Fuji`);
    }

    /**
     * Set event callbacks for KYC process
     */
    setCallbacks(callbacks: KYCEventCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Main KYC verification function - handles complete flow
     */
    async verifyKYC(walletAddress: string): Promise<KYCResult> {
        // Reset processing state if it's a different wallet or if enough time has passed
        if (this.isProcessing && this.processingWallet !== walletAddress) {
            console.log('🔄 Resetting KYC processing state for new wallet');
            this.isProcessing = false;
            this.processingWallet = null;
        }

        if (this.isProcessing && this.processingWallet === walletAddress) {
            console.log('⚠️ KYC verification already in progress for this wallet');
            return { success: false, error: 'KYC verification already in progress for this wallet' };
        }

        this.isProcessing = true;
        this.processingWallet = walletAddress;

        try {
            console.log('🚀 KYC Agent activated for wallet:', walletAddress);
            this.callbacks.onKYCStart?.(walletAddress);

            // Step 1: Check existing NFT access
            console.log('🔍 Step 1: Checking existing NFT access...');
            const existingStatus = await this.checkKYCStatus(walletAddress);

            if (existingStatus.hasAccess) {
                console.log('✅ Wallet already has KYC access! Token ID:', existingStatus.kycLevel);

                const result: KYCResult = {
                    success: true,
                    tokenId: existingStatus.kycLevel,
                    contractAddress: this.contractAddress
                };

                this.callbacks.onKYCSuccess?.(result);
                this.callbacks.onNFTMinted?.(existingStatus.kycLevel, this.contractAddress);
                this.callbacks.onAccessGranted?.();

                return result;
            }

            // Step 2: Check database KYC status
            console.log('🔍 Step 2: Checking database KYC status...');
            const isDatabaseVerified = await this.checkDatabaseKYC(walletAddress);

            if (!isDatabaseVerified) {
                const error = 'KYC not verified in database. Please complete KYC verification first.';
                console.log('❌', error);
                this.callbacks.onKYCError?.(error);
                return { success: false, error };
            }

            // Step 3: Trigger Chainlink Functions KYC verification
            console.log('🔗 Step 3: Triggering Chainlink Functions KYC verification...');
            const result = await this.triggerKYCVerification(walletAddress);

            if (result.success) {
                console.log('🎉 KYC verification request submitted successfully!');

                this.callbacks.onKYCSuccess?.(result);

                if (result.tokenId) {
                    // NFT minted immediately
                    this.callbacks.onNFTMinted?.(result.tokenId, result.contractAddress || this.contractAddress, result.transactionHash);
                    this.callbacks.onAccessGranted?.();
                } else if (result.pending) {
                    // Start monitoring for NFT minting
                    console.log('⏳ Starting NFT minting monitoring...');
                    this.monitorNFTMinting(walletAddress);
                }
            } else {
                console.log('❌ KYC verification failed:', result.error);
                this.callbacks.onKYCError?.(result.error || 'KYC verification failed');
            }

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'KYC verification failed';
            console.error('❌ KYC Agent Error:', errorMessage);
            this.callbacks.onKYCError?.(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            this.isProcessing = false;
            this.processingWallet = null;
        }
    }

    /**
     * Check if wallet already has KYC NFT and get database KYC level
     */
    async checkKYCStatus(walletAddress: string): Promise<KYCStatus> {
        try {
            console.log(`🔍 Checking KYC status for ${walletAddress}...`);

            // First check database for KYC level
            let databaseKycLevel = 0;
            try {
                const supabaseUrl = 'https://wtsruzsccudercdaxbmp.supabase.co';
                const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0c3J1enNjY3VkZXJjZGF4Ym1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NDYwOTQsImV4cCI6MjA2NTMyMjA5NH0.bN8vI9syCe_6XkXpZ79HLyyuIhP5gXJu0K9JO_Uqr48';

                const response = await fetch(`${supabaseUrl}/rest/v1/wallet_kyc?select=*`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const kycRecord = data.find((record: any) =>
                        record.wallet_address.toLowerCase() === walletAddress.toLowerCase()
                    );

                    if (kycRecord && kycRecord.is_kyc_verified && kycRecord.kyc_status === 'approved') {
                        databaseKycLevel = kycRecord.kyc_level;
                        console.log(`📋 Database KYC Level: ${databaseKycLevel}`);
                    }
                }
            } catch (dbError) {
                console.log(`⚠️ Could not check database KYC level`);
            }

            // Then check smart contract using your GetWalletKYC.sol ABI
            const contractABI = [
                {
                    "inputs": [{ "name": "wallet", "type": "address" }],
                    "name": "hasKYCAccess",
                    "outputs": [{ "name": "", "type": "bool" }],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{ "name": "wallet", "type": "address" }],
                    "name": "getKYCLevel",
                    "outputs": [{ "name": "", "type": "uint8" }],
                    "stateMutability": "view",
                    "type": "function"
                }
            ];

            const [hasAccess, contractKycLevel] = await Promise.all([
                this.publicClient.readContract({
                    address: this.contractAddress,
                    abi: contractABI,
                    functionName: 'hasKYCAccess',
                    args: [walletAddress as Address]
                }),
                this.publicClient.readContract({
                    address: this.contractAddress,
                    abi: contractABI,
                    functionName: 'getKYCLevel',
                    args: [walletAddress as Address]
                })
            ]);

            if (hasAccess) {
                console.log(`✅ Wallet already has KYC NFT!`);
                console.log(`🎫 Contract KYC Level: ${contractKycLevel.toString()}`);
                console.log(`📋 Database KYC Level: ${databaseKycLevel}`);
                return { hasAccess: true, kycLevel: Number(contractKycLevel) };
            }

            console.log(`❌ No existing NFT found for this wallet`);
            if (databaseKycLevel > 0) {
                console.log(`📋 But Database KYC Level found: ${databaseKycLevel}`);
            }
            return { hasAccess: false, kycLevel: databaseKycLevel };

        } catch (error) {
            console.error(`❌ Error checking KYC status:`, error instanceof Error ? error.message : 'Unknown error');
            return { hasAccess: false, kycLevel: 0 };
        }
    }

    /**
     * Check if wallet is verified in Supabase database
     */
    async checkDatabaseKYC(walletAddress: string): Promise<{ verified: boolean, kycLevel?: number, error?: string }> {
        try {
            const supabaseUrl = 'https://wtsruzsccudercdaxbmp.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0c3J1enNjY3VkZXJjZGF4Ym1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NDYwOTQsImV4cCI6MjA2NTMyMjA5NH0.bN8vI9syCe_6XkXpZ79HLyyuIhP5gXJu0K9JO_Uqr48';

            console.log(`🔍 Checking KYC status in database for wallet: ${walletAddress}`);

            const response = await fetch(`${supabaseUrl}/rest/v1/wallet_kyc?select=*`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.log(`⚠️ Database check failed - proceeding anyway`);
                return { verified: true, kycLevel: 1 };
            }

            const data = await response.json();
            const kycRecord = data.find((record: any) =>
                record.wallet_address.toLowerCase() === walletAddress.toLowerCase()
            );

            if (!kycRecord) {
                console.log(`❌ Wallet ${walletAddress} not found in KYC database`);
                return { verified: false, error: 'Wallet not found in KYC database' };
            }

            if (kycRecord.is_kyc_verified && kycRecord.kyc_status === 'approved') {
                console.log(`✅ KYC verified in database (Level ${kycRecord.kyc_level})`);
                return { verified: true, kycLevel: kycRecord.kyc_level || 1 };
            } else {
                console.log(`❌ KYC not verified in database (Status: ${kycRecord.kyc_status})`);
                return { verified: false, error: `KYC not verified (Status: ${kycRecord.kyc_status})` };
            }

        } catch (error) {
            console.error('Database KYC Check Error:', error);
            return { verified: false, error: error instanceof Error ? error.message : 'Database check failed' };
        }
    }

    /**
     * Trigger KYC verification using your GetWalletKYC.sol contract
     */
    private async triggerKYCVerification(walletAddress: string): Promise<KYCResult> {
        try {
            if (!isAddress(walletAddress)) {
                return { success: false, error: 'Invalid wallet address format' };
            }

            console.log('🚀 Calling requestKYCVerification...');
            console.log('📋 Parameters:', {
                walletAddress,
                contractAddress: this.contractAddress,
                subscriptionId: this.subscriptionId,
                secretsSlot: this.donHostedSecretsSlotID,
                secretsVersion: this.donHostedSecretsVersion
            });

            // Your contract's ABI for requestKYCVerification function
            const kycABI = [
                {
                    "inputs": [
                        { "name": "walletAddress", "type": "address" },
                        { "name": "donHostedSecretsSlotID", "type": "uint8" },
                        { "name": "donHostedSecretsVersion", "type": "uint64" },
                        { "name": "subscriptionId", "type": "uint64" }
                    ],
                    "name": "requestKYCVerification",
                    "outputs": [{ "name": "requestId", "type": "bytes32" }],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ];

            // Call the smart contract using wagmi
            console.log('📤 Calling writeContract with parameters:', {
                address: this.contractAddress,
                functionName: 'requestKYCVerification',
                args: [
                    walletAddress,
                    this.donHostedSecretsSlotID,
                    this.donHostedSecretsVersion,
                    this.subscriptionId
                ]
            });

            const txHash = await writeContract(config, {
                address: this.contractAddress,
                abi: kycABI,
                functionName: 'requestKYCVerification',
                args: [
                    walletAddress as `0x${string}`,
                    BigInt(this.donHostedSecretsSlotID),
                    BigInt(this.donHostedSecretsVersion),
                    BigInt(this.subscriptionId)
                ]
            });

            console.log('📤 Transaction submitted:', txHash);
            console.log('🔗 View on explorer: https://testnet.snowtrace.io/tx/' + txHash);

            // Store transaction hash
            this.lastTransactionHash = txHash;

            // Wait for transaction confirmation
            const receipt = await waitForTransactionReceipt(config, { hash: txHash });
            console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

            // Check if NFT was minted immediately (parse logs)
            const logs = receipt.logs;
            let tokenId: number | undefined;

            for (const log of logs) {
                try {
                    // NFTMinted event signature: event NFTMinted(address indexed recipient, uint256 tokenId, uint8 kycLevel)
                    // keccak256("NFTMinted(address,uint256,uint8)") = 0x5716925f2a990bb51e5354134a606547c86dc787be1a2729eef575fd0c2bea1e
                    if (log.topics[0] === '0x5716925f2a990bb51e5354134a606547c86dc787be1a2729eef575fd0c2bea1e') {
                        // Parse NFTMinted event: topics[1] = recipient address, topics[2] = tokenId
                        const recipientAddress = '0x' + log.topics[1]?.slice(26); // Remove padding
                        tokenId = parseInt(log.topics[2] || '0x0', 16);
                        console.log('🎉 NFTMinted Event Detected! Recipient:', recipientAddress, 'Token ID:', tokenId);

                        // Verify this NFT was minted for the correct address
                        if (recipientAddress.toLowerCase() === walletAddress.toLowerCase()) {
                            break;
                        }
                    }

                    // Also check for Transfer events as fallback (ERC721 NFT minting)
                    if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                        // Check if it's a mint (from address is 0x0)
                        if (log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000') {
                            const transferTokenId = parseInt(log.topics[3] || '0x0', 16);
                            console.log('🎉 Transfer Event (Fallback) - Token ID:', transferTokenId);
                            if (tokenId === undefined) {
                                tokenId = transferTokenId;
                            }
                        }
                    }
                } catch (e) {
                    // Continue parsing other logs
                    console.warn('Log parsing error:', e);
                }
            }

            if (tokenId !== undefined) {
                return {
                    success: true,
                    tokenId,
                    contractAddress: this.contractAddress,
                    transactionHash: txHash
                };
            }

            // If no immediate NFT minting, Chainlink Functions request was submitted
            console.log('✅ Chainlink Functions request submitted successfully');
            console.log('⏱️ NFT minting will happen when Chainlink processes the request (2-5 minutes)');

            return {
                success: true,
                pending: true,
                transactionHash: txHash,
                contractAddress: this.contractAddress
            };

        } catch (error) {
            console.error('❌ KYC verification failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'KYC verification failed'
            };
        }
    }

    /**
     * Monitor for NFT minting after Chainlink Functions processing
     */
    private async monitorNFTMinting(walletAddress: string): Promise<void> {
        const maxAttempts = 30; // 5 minutes with 10-second intervals
        let attempts = 0;

        console.log('🔄 Starting NFT minting monitoring for wallet:', walletAddress);

        const checkInterval = setInterval(async () => {
            attempts++;

            try {
                console.log(`🔍 Monitoring NFT minting... Attempt ${attempts}/${maxAttempts}`);

                const status = await this.checkKYCStatus(walletAddress);

                if (status.hasAccess) {
                    console.log('🎉 NFT successfully minted! Token ID:', status.kycLevel);
                    console.log('📍 Contract Address:', this.contractAddress);
                    if (this.lastTransactionHash) {
                        console.log('🔗 Transaction Hash:', this.lastTransactionHash);
                        console.log('🔗 View Transaction: https://testnet.snowtrace.io/tx/' + this.lastTransactionHash);
                    }

                    // Trigger success callbacks
                    this.callbacks.onNFTMinted?.(status.kycLevel, this.contractAddress, this.lastTransactionHash || undefined);
                    this.callbacks.onAccessGranted?.();

                    clearInterval(checkInterval);
                    this.isProcessing = false;
                    this.processingWallet = null;
                    this.lastTransactionHash = null;
                    return;
                }

                if (attempts >= maxAttempts) {
                    console.log('⏰ NFT minting monitoring timeout. Please check manually.');
                    console.log('💡 Transaction may still be processing. Check your wallet periodically.');

                    if (this.lastTransactionHash) {
                        console.log('🔗 Your transaction: https://testnet.snowtrace.io/tx/' + this.lastTransactionHash);
                    }

                    this.callbacks.onKYCError?.('NFT minting timeout - transaction submitted but still processing. Check your wallet.');

                    clearInterval(checkInterval);
                    this.isProcessing = false;
                    this.processingWallet = null;
                    this.lastTransactionHash = null;
                }

            } catch (error) {
                console.error('Error monitoring NFT minting:', error);
                if (attempts >= maxAttempts) {
                    console.log('❌ Monitoring failed after max attempts');
                    this.callbacks.onKYCError?.('NFT monitoring failed - please check manually');
                    clearInterval(checkInterval);
                    this.isProcessing = false;
                    this.processingWallet = null;
                    this.lastTransactionHash = null;
                }
            }
        }, 10000); // Check every 10 seconds
    }

    /**
     * Auto-trigger KYC verification when wallet connects
     */
    async autoVerifyOnConnect(walletAddress: string): Promise<KYCResult> {
        return this.verifyKYC(walletAddress);
    }

    /**
     * Get agent status
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            processingWallet: this.processingWallet,
            contractAddress: this.contractAddress,
            subscriptionId: this.subscriptionId
        };
    }

    /**
     * Reset agent processing state
     */
    resetProcessingState(): void {
        console.log('🔄 Resetting KYC agent processing state');
        this.isProcessing = false;
        this.processingWallet = null;
        this.lastTransactionHash = null;
    }

    /**
     * Check KYC status via Chainlink Functions (not local calls)
     */
    async checkKYCStatusViaChainlink(walletAddress: string): Promise<KYCStatus> {
        try {
            console.log('🔗 Attempting to check KYC status via deployed smart contract...');
            console.log(`📋 Contract Address: ${this.contractAddress}`);

            // Check if contract is actually deployed by trying to call it
            const contractABI = [
                {
                    "inputs": [{ "name": "wallet", "type": "address" }],
                    "name": "hasKYCAccess",
                    "outputs": [{ "name": "", "type": "bool" }],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{ "name": "wallet", "type": "address" }],
                    "name": "getKYCLevel",
                    "outputs": [{ "name": "", "type": "uint8" }],
                    "stateMutability": "view",
                    "type": "function"
                }
            ];

            // Try to call the contract - this will fail if not deployed
            const [hasAccess, contractKycLevel] = await Promise.all([
                this.publicClient.readContract({
                    address: this.contractAddress,
                    abi: contractABI,
                    functionName: 'hasKYCAccess',
                    args: [walletAddress as Address]
                }),
                this.publicClient.readContract({
                    address: this.contractAddress,
                    abi: contractABI,
                    functionName: 'getKYCLevel',
                    args: [walletAddress as Address]
                })
            ]);

            console.log(`✅ Contract is deployed! HasAccess: ${hasAccess}, Level: ${contractKycLevel}`);

            return {
                hasAccess: Boolean(hasAccess),
                kycLevel: Number(contractKycLevel)
            };

        } catch (error) {
            console.error('❌ Smart contract not deployed or call failed:', error);

            // Return proper error indicating contract is not deployed
            throw new Error(`Smart contract not deployed at ${this.contractAddress}. Please deploy GetWalletKYC.sol first.`);
        }
    }

    /**
     * Check database KYC via Chainlink Functions
     */
    async checkDatabaseKYCViaChainlink(walletAddress: string): Promise<{ verified: boolean, kycLevel?: number, error?: string }> {
        try {
            console.log('🔗 Attempting to trigger Chainlink Functions for database verification...');
            console.log(`📋 This requires deployed smart contract at: ${this.contractAddress}`);

            // Check if smart contract is deployed first
            const contractCode = await this.publicClient.getCode({
                address: this.contractAddress
            });

            if (!contractCode || contractCode === '0x') {
                throw new Error(`No smart contract found at ${this.contractAddress}. Please deploy GetWalletKYC.sol first.`);
            }

            // If contract exists, try to trigger Chainlink Functions for database check
            // This would call requestKYCVerification which includes database verification
            console.log('🔗 Contract found, but database verification requires Chainlink Functions request...');

            throw new Error('Database verification via Chainlink Functions requires calling requestKYCVerification() function. This should be done in the Chainlink Functions step, not separately.');

        } catch (error) {
            console.error('❌ Chainlink database verification not available:', error);
            return {
                verified: false,
                error: error instanceof Error ? error.message : 'Database verification requires deployed smart contract'
            };
        }
    }

    /**
     * Trigger NFT minting via Chainlink Functions
     */
    async triggerNFTMintingViaChainlink(walletAddress: string): Promise<KYCResult> {
        try {
            console.log('🔗 Attempting to trigger Chainlink Functions for NFT minting...');
            console.log(`📋 Contract Address: ${this.contractAddress}`);

            // Check if smart contract is deployed first
            const contractCode = await this.publicClient.getCode({
                address: this.contractAddress
            });

            if (!contractCode || contractCode === '0x') {
                throw new Error(`Smart contract not deployed at ${this.contractAddress}. Please deploy GetWalletKYC.sol first before triggering Chainlink Functions.`);
            }

            console.log('✅ Smart contract found! Calling requestKYCVerification...');

            // This calls your actual GetWalletKYC.sol contract
            return await this.triggerKYCVerification(walletAddress);

        } catch (error) {
            console.error('❌ Chainlink NFT minting failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'NFT minting requires deployed smart contract'
            };
        }
    }

}

// Global unified KYC agent instance
let unifiedKycAgentInstance: UnifiedKYCAgent | null = null;

export const getUnifiedKYCAgent = (): UnifiedKYCAgent => {
    if (!unifiedKycAgentInstance) {
        unifiedKycAgentInstance = new UnifiedKYCAgent();
    }
    return unifiedKycAgentInstance;
};

export default UnifiedKYCAgent;
