/** Replace the values below with the addresses of your smart contracts. */

// 1. Set up the network your smart contracts are deployed to.
// First, import the chain from the package, then set the NETWORK variable to the chain.
import { Mumbai } from '@thirdweb-dev/chains';
export const NETWORK = Mumbai;

// 2. The address of the marketplace V3 smart contract.
// Deploy your own: https://thirdweb.com/thirdweb.eth/MarketplaceV3
export const MARKETPLACE_ADDRESS = '0x1C0e9d114DEF136740FD19f704107E1A810E9d91';
// export const MARKETPLACE_ADDRESS = '0x00b1c8068FF3891C659a8691ced60d66AE989a74';

// 3. The address of your NFT collection smart contract.
export const NFT_COLLECTION_ADDRESS =
  '0xE44bC8e2c506b8FF6b820E1dC2502b7ba9f30d93';
// "0xFfd9bAddF3f6e427EfAa1A4AEC99131078C1d683";

// (Optional) Set up the URL of where users can view transactions on
// For example, below, we use Mumbai.polygonscan to view transactions on the Mumbai testnet.
export const ETHERSCAN_URL = 'https://mumbai.polygonscan.com';
