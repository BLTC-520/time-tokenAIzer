'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { getUnifiedKYCAgent, KYCResult, KYCStatus } from '../services/unifiedKycAgent';
import { isDevKycBypassEnabled } from '../shared/devMode';

interface KYCVerificationProps {
  onVerificationComplete?: (result: KYCResult) => void;
  onStatusUpdate?: (status: KYCStatus) => void;
}

export default function KYCVerification({ onVerificationComplete, onStatusUpdate }: KYCVerificationProps) {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [verificationResult, setVerificationResult] = useState<KYCResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kycAgent = getUnifiedKYCAgent();

  const grantDevKycAccess = () => {
    const status: KYCStatus = { hasAccess: true, kycLevel: 1 };
    const result: KYCResult = {
      success: true,
      tokenId: 1,
      contractAddress: 'dev-mode',
      hasExistingNFT: true,
    };

    setKycStatus(status);
    setVerificationResult(result);
    setError(null);
    onStatusUpdate?.(status);
    onVerificationComplete?.(result);
  };

  useEffect(() => {
    if (isConnected && address) {
      checkKYCStatus();
    }
  }, [isConnected, address]);

  const checkKYCStatus = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);
      
      const status = await kycAgent.checkKYCStatus(address);
      setKycStatus(status);
      
      if (onStatusUpdate) {
        onStatusUpdate(status);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check KYC status');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKYC = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await kycAgent.verifyKYC(address);
      setVerificationResult(result);
      
      if (result.success) {
        // Refresh status after successful verification
        await checkKYCStatus();
      }
      
      if (onVerificationComplete) {
        onVerificationComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KYC verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600">Please connect your wallet to verify KYC status</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold text-center mb-6">KYC Verification</h2>

      {isDevKycBypassEnabled && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <h3 className="font-semibold">Development KYC bypass enabled</h3>
          <p className="mt-1 text-sm">
            This grants local-only access without database, Chainlink, or NFT checks.
          </p>
          <button
            type="button"
            onClick={grantDevKycAccess}
            className="mt-3 w-full rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
          >
            Grant Dev KYC Access
          </button>
        </div>
      )}
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Wallet Address:</p>
        <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
          {address}
        </p>
      </div>

      {loading && (
        <div className="text-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Checking KYC status...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {kycStatus && (
        <div className={`mb-4 p-4 rounded ${kycStatus.hasAccess ? 'bg-green-100 border border-green-400' : 'bg-yellow-100 border border-yellow-400'}`}>
          <h3 className="font-semibold mb-2">Current KYC Status:</h3>
          {kycStatus.hasAccess ? (
            <div className="text-green-700">
              <p>✅ KYC Verified</p>
              <p className="text-sm">Level: {kycStatus.kycLevel}</p>
            </div>
          ) : (
            <div className="text-yellow-700">
              <p>⚠️ KYC Not Verified</p>
              <p className="text-sm">You need to complete KYC verification</p>
            </div>
          )}
        </div>
      )}

      {verificationResult && (
        <div className={`mb-4 p-4 rounded ${verificationResult.success ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400'}`}>
          <h3 className="font-semibold mb-2">Verification Result:</h3>
          {verificationResult.success ? (
            <div className="text-green-700">
              <p>🎉 KYC Verification Successful!</p>
              {verificationResult.tokenId && (
                <p className="text-sm">NFT Token ID: {verificationResult.tokenId}</p>
              )}
              {verificationResult.pending && (
                <p className="text-sm">⏳ Processing... Please wait 2-5 minutes</p>
              )}
            </div>
          ) : (
            <div className="text-red-700">
              <p>❌ Verification Failed</p>
              {verificationResult.error && (
                <p className="text-sm">{verificationResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={checkKYCStatus}
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Checking...' : 'Check KYC Status'}
        </button>

        {kycStatus && !kycStatus.hasAccess && (
          <button
            onClick={handleVerifyKYC}
            disabled={loading}
            className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Start KYC Verification'}
          </button>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>• KYC verification requires database approval</p>
        <p>• NFT will be minted after successful verification</p>
        <p>• Process may take 2-5 minutes to complete</p>
      </div>
    </motion.div>
  );
}
