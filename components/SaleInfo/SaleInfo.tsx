import { NFT as NFTType } from '@thirdweb-dev/sdk';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import styles from '../../styles/Sale.module.css';
import profileStyles from '../../styles/Profile.module.css';
import {
  useContract,
  useCreateAuctionListing,
  useCreateDirectListing,
  Web3Button,
} from '@thirdweb-dev/react';
import {
  MARKETPLACE_ADDRESS,
  NFT_COLLECTION_ADDRESS,
} from '../../const/contractAddresses';
import { useRouter } from 'next/router';
import toast, { Toaster } from 'react-hot-toast';
import toastStyle from '../../util/toastConfig';

type Props = {
  nft: NFTType;
};

type AuctionFormData = {
  nftContractAddress: string;
  tokenId: string;
  startDate: string;
  endDate: Date;
  floorPrice: string;
  buyoutPrice: string;
};

export default function SaleInfo({ nft }: Props) {
  const router = useRouter();
  // Connect to marketplace contract
  const { contract: marketplace } = useContract(
    MARKETPLACE_ADDRESS,
    'marketplace-v3'
  );

  // useContract is a React hook that returns an object with the contract key.
  // The value of the contract key is an instance of an NFT_COLLECTION on the blockchain.
  // This instance is created from the contract address (NFT_COLLECTION_ADDRESS)
  const { contract: nftCollection } = useContract(NFT_COLLECTION_ADDRESS);

  // Hook provides an async function to create a new auction listing
  const { mutateAsync: createAuctionListing } =
    useCreateAuctionListing(marketplace);

  // Hook provides an async function to create a new direct listing
  const { mutateAsync: createDirectListing } =
    useCreateDirectListing(marketplace);

  // Manage form submission state using tabs and conditional rendering
  const [tab, setTab] = useState<'auction'>('auction');

  function getLocalISOString() {
    const date = new Date();
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  }
  // Manage form values using react-hook-form library: Auction form
  const { register: registerAuction, handleSubmit: handleSubmitAuction } =
    useForm<AuctionFormData>({
      defaultValues: {
        nftContractAddress: NFT_COLLECTION_ADDRESS,
        tokenId: nft.metadata.id,
        startDate: getLocalISOString(),
        endDate: new Date(),
        floorPrice: '0',
        buyoutPrice: '99999999',
      },
    });

  // User requires to set marketplace approval before listing
  async function checkAndProvideApproval() {
    // Check if approval is required
    const hasApproval = await nftCollection?.call('isApprovedForAll', [
      nft.owner,
      MARKETPLACE_ADDRESS,
    ]);

    // If it is, provide approval
    if (!hasApproval) {
      const txResult = await nftCollection?.call('setApprovalForAll', [
        MARKETPLACE_ADDRESS,
        true,
      ]);

      if (txResult) {
        toast.success('Marketplace approval granted', {
          icon: '👍',
          style: toastStyle,
          position: 'bottom-center',
        });
      }
    }

    return true;
  }

  // Manage form values using react-hook-form library: Direct form

  async function handleSubmissionAuction(data: AuctionFormData) {
    await checkAndProvideApproval();
    const txResult = await createAuctionListing({
      assetContractAddress: data.nftContractAddress,
      tokenId: data.tokenId,
      buyoutBidAmount: data.buyoutPrice,
      minimumBidAmount: data.floorPrice,
      startTimestamp: new Date(data.startDate),
      endTimestamp: new Date(data.endDate),
    });

    return txResult;
  }

  return (
    <>
      <Toaster position="bottom-center" reverseOrder={false} />
      <div className={styles.saleInfoContainer} style={{ marginTop: -42 }}>
        <div className={profileStyles.tabs}>
          <h3
            className={`${profileStyles.tab} 
        ${tab === 'auction' ? profileStyles.activeTab : ''}`}
            onClick={() => setTab('auction')}
          >
            Auction
          </h3>
        </div>

        {/* Auction listing fields */}
        <div
          className={`${
            tab === 'auction'
              ? styles.activeTabContent
              : profileStyles.tabContent
          }`}
          style={{ flexDirection: 'column' }}
        >
          <h4 className={styles.formSectionTitle}>When </h4>

          {/* Input field for auction start date */}
          <legend className={styles.legend}> Auction Starts on </legend>
          <input
            className={styles.input}
            type="datetime-local"
            {...registerAuction('startDate')}
            aria-label="Auction Start Date"
          />

          {/* Input field for auction end date */}
          <legend className={styles.legend}> Auction Ends on </legend>
          <input
            className={styles.input}
            type="datetime-local"
            {...registerAuction('endDate')}
            aria-label="Auction End Date"
          />
          <h4 className={styles.formSectionTitle}>Price </h4>

          {/* Input field for minimum bid price */}
          <legend className={styles.legend}> Allow bids starting from </legend>
          <input
            className={styles.input}
            step={0.000001}
            type="number"
            {...registerAuction('floorPrice')}
          />

          {/* Input field for buyout price */}
          <legend className={styles.legend}> Buyout price </legend>
          <input
            className={styles.input}
            type="number"
            step={0.000001}
            {...registerAuction('buyoutPrice')}
          />
          <Web3Button
            contractAddress={MARKETPLACE_ADDRESS}
            action={async () => {
              return await handleSubmitAuction(handleSubmissionAuction)();
            }}
            onError={(error) => {
              toast(`Listed Failed! Reason: ${error.cause}`, {
                icon: '❌',
                style: toastStyle,
                position: 'bottom-center',
              });
            }}
            onSuccess={(txResult) => {
              toast('Listed Successfully!', {
                icon: '🥳',
                style: toastStyle,
                position: 'bottom-center',
              });
              router.push(
                `/token/${NFT_COLLECTION_ADDRESS}/${nft.metadata.id}`
              );
            }}
          >
            Create Auction Listing
          </Web3Button>
        </div>
      </div>
    </>
  );
}
