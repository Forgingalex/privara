/**
 * Wallet connection utilities
 * Uses Wagmi for wallet management
 */

/**
 * Format Ethereum address for display
 * @param address - Full Ethereum address
 * @returns Formatted address (first 6 + last 4 characters)
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

