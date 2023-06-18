import {
  MediaRenderer,
  ThirdwebNftMedia,
  useContract,
  useContractEvents,
  useContractRead,
  useValidDirectListings,
  useValidEnglishAuctions,
  Web3Button,
} from '@thirdweb-dev/react';
import React, { useState } from 'react';
import Container from '../../../components/Container/Container';
import { GetStaticProps, GetStaticPaths } from 'next';
import { Marketplace, NFT, ThirdwebSDK } from '@thirdweb-dev/sdk';
import {
  ETHERSCAN_URL,
  MARKETPLACE_ADDRESS,
  NETWORK,
  NFT_COLLECTION_ADDRESS,
} from '../../../const/contractAddresses';
import styles from '../../../styles/Token.module.css';
import Link from 'next/link';
import randomColor from '../../../util/randomColor';
import Skeleton from '../../../components/Skeleton/Skeleton';
import toast, { Toaster } from 'react-hot-toast';
import toastStyle from '../../../util/toastConfig';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';

interface TransferOptions {
  from: string;
  to: string;
  amount: string;
}

async function sendMatic(options: TransferOptions): Promise<string> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('메타마스크가 설치되어 있지 않습니다.');
  }
  type ExternalProvider = /*unresolved*/ any;
  type JsonRpcFetchFunc = /*unresolved*/ any;
  const ethereum = window.ethereum as ExternalProvider | JsonRpcFetchFunc;
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();

  const maticChainId = '0x5'; // Matic 네트워크 체인 ID (Mumbai Testnet)
  const maticRpcUrl = 'https://rpc-mumbai.maticvigil.com'; // Matic 네트워크 RPC 엔드포인트

  // Matic 네트워크로 전환
  try {
    await provider.send('wallet_addEthereumChain', [
      {
        chainId: '0x13881', // Matic Mumbai Testnet의 체인 ID

        chainName: 'Matic Mumbai Testnet',
        nativeCurrency: {
          name: 'MATIC',
          symbol: 'MATIC',
          decimals: 18,
        },
        rpcUrls: [maticRpcUrl],
        blockExplorerUrls: ['https://explorer-mumbai.maticvigil.com'],
      },
    ]);
  } catch (error) {
    console.error('Matic 네트워크로 전환 실패:', error);
    throw error;
  }

  // 계정 접근 권한 요청
  const accounts = await provider.send('eth_requestAccounts', []);
  const fromAccount = accounts[0]; // 보내는 계정

  try {
    const transaction = await signer.sendTransaction({
      to: options.to,
      value: ethers.utils.parseEther(options.amount),
      gasLimit: 21000, // 가스 한도 (기본값: 21000)
    });

    console.log('전송 성공!');
    console.log('트랜잭션 해시:', transaction.hash);

    return transaction.hash;
  } catch (error) {
    console.error('전송 실패:', error);
    throw error;
  }
}

type Props = {
  nft: NFT;
  contractMetadata: any;
};

const [randomColor1, randomColor2] = [randomColor(), randomColor()];

export default function TokenPage({ nft, contractMetadata }: Props) {
  const router = useRouter();
  const currentUrl = router.asPath;
  const regex = /\/token\/(.+?)\//;
  const match = currentUrl.match(regex);
  const token = match && match[1]; // 추출된 토큰 값

  const [bidValue, setBidValue] = useState<string>();

  // Connect to marketplace smart contract
  const { contract: marketplace, isLoading: loadingContract } = useContract(
    MARKETPLACE_ADDRESS,
    'marketplace-v3'
  );

  // Connect to NFT Collection smart contract
  const { contract: nftCollection } = useContract(NFT_COLLECTION_ADDRESS);
  const { contract: nftCollection2 } = useContract(MARKETPLACE_ADDRESS);

  const { data: directListing, isLoading: loadingDirect } =
    useValidDirectListings(marketplace, {
      tokenContract: NFT_COLLECTION_ADDRESS,
      tokenId: nft.metadata.id,
    });

  // 2. Load if the NFT is for auction
  const { data: auctionListing, isLoading: loadingAuction } =
    useValidEnglishAuctions(marketplace, {
      tokenContract: NFT_COLLECTION_ADDRESS,
      tokenId: nft.metadata.id,
    });

  // Load historical transfer events: TODO - more event types like sale
  const { data: transferEvents, isLoading: loadingTransferEvents } =
    useContractEvents(nftCollection, 'Transfer', {
      queryFilter: {
        filters: {
          tokenId: nft.metadata.id,
        },
        order: 'desc',
      },
    });

  const { data: transferEvents2, isLoading: loadingTransferEvents2 } =
    useContractEvents(nftCollection2, 'NewBid', {
      queryFilter: {
        filters: {
          tokenId: nft.metadata.id,
        },
        order: 'desc',
      },
    });

  async function createBidOrOffer() {
    let txResult;
    if (!bidValue) {
      toast(`Please enter a bid value`, {
        icon: '❌',
        style: toastStyle,
        position: 'bottom-center',
      });
      return;
    }

    if (auctionListing?.[0]) {
      txResult = await marketplace?.englishAuctions.makeBid(
        auctionListing[0].id,
        bidValue
      );
      console.log('auctionListing', auctionListing?.[0]);
    } else if (directListing?.[0]) {
      txResult = await marketplace?.offers.makeOffer({
        assetContractAddress: NFT_COLLECTION_ADDRESS,
        tokenId: nft.metadata.id,
        totalPrice: bidValue,
      });
      console.log('directListing', directListing?.[0]);
    } else {
      throw new Error('No valid listing found for this NFT');
    }
    console.log(txResult);
    return txResult;
  }

  async function buyListing() {
    let txResult;

    if (auctionListing?.[0]) {
      txResult = await marketplace?.englishAuctions.buyoutAuction(
        auctionListing[0].id
      );
    } else if (directListing?.[0]) {
      txResult = await marketplace?.directListings.buyFromListing(
        directListing[0].id,
        1
      );
    } else {
      throw new Error('No valid listing found for this NFT');
    }
    return txResult;
  }

  return (
    <>
      <Toaster position="bottom-center" reverseOrder={false} />
      <Container maxWidth="lg">
        <div className={styles.container}>
          <div className={styles.metadataContainer}>
            <ThirdwebNftMedia
              metadata={nft.metadata}
              className={styles.image}
            />

            <div className={styles.descriptionContainer}>
              <h3 className={styles.descriptionTitle}>Description</h3>
              <p className={styles.description}>{nft.metadata.description}</p>

              <h3 className={styles.descriptionTitle}>Traits</h3>

              <div className={styles.traitsContainer}>
                {Object.entries(nft?.metadata?.attributes || {}).map(
                  ([key, value]) => {
                    // value에 대한 타입 어노테이션 추가
                    const typedValue: string = value as string;

                    return (
                      <div className={styles.traitContainer} key={key}>
                        <p className={styles.traitName}>{key}</p>
                        <p className={styles.traitValue}>
                          {typedValue?.toString() || ''}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>

              <h3 className={styles.descriptionTitle}>History</h3>

              <div className={styles.traitsContainer}>
                {transferEvents?.map((event, index) => {
                  // 사용 예시
                  const transferOptions: TransferOptions = {
                    from: event.data.bidder,
                    to: nft.owner,
                    amount: event.data.bidAmount, // 전송할 Matic 양
                  };
                  return (
                    <div
                      key={event.transaction.transactionHash}
                      className={styles.eventsContainer}
                    >
                      <div className={styles.eventContainer}>
                        <p className={styles.traitName}>Event</p>
                        <p className={styles.traitValue}>
                          {index === transferEvents.length - 1
                            ? 'Mint'
                            : 'Transfer'}
                        </p>
                      </div>

                      <div className={styles.eventContainer}>
                        <p className={styles.traitName}>From</p>
                        <p className={styles.traitValue}>
                          {event.data.from?.slice(0, 4)}...
                          {event.data.from?.slice(-2)}
                        </p>
                      </div>

                      <div className={styles.eventContainer}>
                        <Link
                          className={styles.txHashArrow}
                          href={`${ETHERSCAN_URL}/tx/${event.transaction.transactionHash}`}
                          target="_blank"
                        >
                          ↗
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
              <h3 className={styles.descriptionTitle}>History BID</h3>
              <div className={styles.traitsContainer}>
                {transferEvents2?.map((event, index) => {
                  console.log(event.transaction.transactionHash); // 개발자 도구의 콘솔에 출력됨
                  console.log(event.data);
                  console.log('bidder(From) : ' + event.data.bidder);
                  console.log('bidder(To) : ' + MARKETPLACE_ADDRESS);
                  console.log('bidder(Index) : ' + event.data.assetContract);
                  console.log('bidder(PageNFT) : ' + token);
                  // 특정 토큰 값에 대한 조건문 추가
                  if (event.data.assetContract === token) {
                    return (
                      <div
                        key={event.transaction.transactionHash}
                        className={styles.eventsContainer}
                      >
                        <div className={styles.eventContainer}>
                          <p className={styles.traitName}>Index</p>
                          <p className={styles.traitValue}>
                            {event.data.assetContract?.slice(0, 4)}...
                            {event.data.assetContract?.slice(-2)}
                          </p>
                        </div>
                        <div className={styles.eventContainer}>
                          <p className={styles.traitName}>From</p>
                          <p className={styles.traitValue}>
                            {event.data.bidder?.slice(0, 4)}...
                            {event.data.bidder?.slice(-2)}
                          </p>
                        </div>
                        <div className={styles.eventContainer}>
                          <p className={styles.traitName}>To</p>
                          <p className={styles.traitValue}>
                            {MARKETPLACE_ADDRESS?.slice(0, 4)}...
                            {MARKETPLACE_ADDRESS?.slice(-2)}
                          </p>
                        </div>
                        <div className={styles.eventContainer}>
                          <p className={styles.traitName}>bidAmount</p>
                          <p className={styles.traitValue}>
                            {(
                              parseInt(event.data.bidAmount['_hex']) /
                              10000000000000000
                            )
                              .toFixed(10)
                              .replace(/\.?0+$/, '')}
                          </p>
                        </div>
                      </div>
                    );
                  } else {
                    return null; // 조건에 맞지 않는 경우 null 반환하여 해당 이벤트를 렌더링하지 않음
                  }
                })}
              </div>
            </div>
          </div>

          <div className={styles.listingContainer}>
            {contractMetadata && (
              <div className={styles.contractMetadataContainer}>
                <MediaRenderer
                  src={contractMetadata.image}
                  className={styles.collectionImage}
                />
                <p className={styles.collectionName}>{contractMetadata.name}</p>
              </div>
            )}
            <h1 className={styles.title}>{nft.metadata.name}</h1>
            <p className={styles.collectionName}>Token ID #{nft.metadata.id}</p>

            <Link
              href={`/profile/${nft.owner}`}
              className={styles.nftOwnerContainer}
            >
              {/* Random linear gradient circle shape */}
              <div
                className={styles.nftOwnerImage}
                style={{
                  background: `linear-gradient(90deg, ${randomColor1}, ${randomColor2})`,
                }}
              />
              <div className={styles.nftOwnerInfo}>
                <p className={styles.label}>Current Owner</p>
                <p className={styles.nftOwnerAddress}>
                  {nft.owner.slice(0, 8)}...{nft.owner.slice(-4)}
                </p>
              </div>
            </Link>

            <div className={styles.pricingContainer}>
              {/* Pricing information */}
              <div className={styles.pricingInfo}>
                <p className={styles.label}>Price</p>
                <div className={styles.pricingValue}>
                  {loadingContract || loadingDirect || loadingAuction ? (
                    <Skeleton width="120" height="24" />
                  ) : (
                    <>
                      {directListing && directListing[0] ? (
                        <>
                          {directListing[0]?.currencyValuePerToken.displayValue}
                          {' ' + directListing[0]?.currencyValuePerToken.symbol}
                        </>
                      ) : auctionListing && auctionListing[0] ? (
                        <>
                          {auctionListing[0]?.buyoutCurrencyValue.displayValue}
                          {' ' + auctionListing[0]?.buyoutCurrencyValue.symbol}
                        </>
                      ) : (
                        'Not for sale'
                      )}
                    </>
                  )}
                </div>

                {/* <div>
                  {loadingAuction ? (
                    <Skeleton width="120" height="24" />
                  ) : (
                    <>
                      {auctionListing && auctionListing[0] && (
                        <>
                          <p className={styles.label} style={{ marginTop: 12 }}>
                            Bids starting from
                          </p>

                          <div className={styles.pricingValue}>
                            {
                              auctionListing[0]?.minimumBidCurrencyValue
                                .displayValue
                            }
                            {' ' +
                              auctionListing[0]?.minimumBidCurrencyValue.symbol}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div> */}
              </div>
            </div>

            {loadingContract || loadingDirect || loadingAuction ? (
              <Skeleton width="100%" height="164" />
            ) : (
              <>
                <Web3Button
                  contractAddress={MARKETPLACE_ADDRESS}
                  action={async () => await buyListing()}
                  className={styles.btn}
                  onSuccess={() => {
                    toast(`Purchase success!`, {
                      icon: '✅',
                      style: toastStyle,
                      position: 'bottom-center',
                    });
                  }}
                  onError={(e) => {
                    toast(`Purchase failed! Reason: ${e.message}`, {
                      icon: '❌',
                      style: toastStyle,
                      position: 'bottom-center',
                    });
                  }}
                >
                  Buy
                </Web3Button>

                <div className={styles.traitsContainer}>
                  {transferEvents2?.slice(0, 1).map((event, index) => {
                    const bidAmount = (
                      parseInt(event.data.bidAmount['_hex']) / 10000000000000000
                    )
                      .toFixed(10)
                      .replace(/\.?0+$/, '');

                    // const price =
                    //   (parseInt(
                    //     directListing[0]?.currencyValuePerToken.displayValue
                    //   ) || 0) - parseInt(bidAmount);

                    const transferOptions: TransferOptions = {
                      from: nft.owner,
                      to: event.data.bidder,
                      amount: bidAmount, // 전송할 Matic 양
                    };
                    return event.data.assetContract === token ? (
                      <Web3Button
                        contractAddress={MARKETPLACE_ADDRESS}
                        action={async () => await sendMatic(transferOptions)}
                        className={styles.btn}
                        onSuccess={() => {
                          toast(`send success!`, {
                            icon: '✅',
                            style: toastStyle,
                            position: 'bottom-center',
                          });
                        }}
                        onError={(e) => {
                          toast(`send failed! Reason: ${e.message}`, {
                            icon: '❌',
                            style: toastStyle,
                            position: 'bottom-center',
                          });
                        }}
                      >
                        Send Money
                      </Web3Button>
                    ) : null;
                  })}
                </div>

                {/* <div className={`${styles.listingTimeContainer} ${styles.or}`}>
                  <p className={styles.listingTime}>or</p>
                </div>

                <input
                  className={styles.input}
                  defaultValue={
                    auctionListing?.[0]?.minimumBidCurrencyValue
                      ?.displayValue || 0
                  }
                  type="number"
                  step={0.000001}
                  onChange={(e) => {
                    setBidValue(e.target.value);
                  }}
                />

                <Web3Button
                  contractAddress={MARKETPLACE_ADDRESS}
                  action={async () => await createBidOrOffer()}
                  className={styles.btn}
                  onSuccess={() => {
                    toast(`Bid success!`, {
                      icon: '✅',
                      style: toastStyle,
                      position: 'bottom-center',
                    });
                  }}
                  onError={(e) => {
                    console.log(e);
                    toast(`Bid failed! Reason: ${e.message}`, {
                      icon: '❌',
                      style: toastStyle,
                      position: 'bottom-center',
                    });
                  }}
                >
                  Place bid
                </Web3Button> */}
              </>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const tokenId = context.params?.tokenId as string;

  const sdk = new ThirdwebSDK(NETWORK);

  const contract = await sdk.getContract(NFT_COLLECTION_ADDRESS);

  const nft = await contract.erc721.get(tokenId);

  let contractMetadata;

  try {
    contractMetadata = await contract.metadata.get();
    contractMetadata.description = 'Your description here';
  } catch (e) {}

  return {
    props: {
      nft,
      contractMetadata: contractMetadata || null,
    },
    revalidate: 1, // https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const sdk = new ThirdwebSDK(NETWORK);

  const contract = await sdk.getContract(NFT_COLLECTION_ADDRESS);

  const nfts = await contract.erc721.getAll();
  const paths = nfts.map((nft) => {
    return {
      params: {
        contractAddress: NFT_COLLECTION_ADDRESS,
        tokenId: nft.metadata.id,
      },
    };
  });

  return {
    paths,
    fallback: 'blocking', // can also be true or 'blocking'
  };
};
