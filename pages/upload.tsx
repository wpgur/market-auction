import {
  ConnectWallet,
  useAddress,
  useContract,
  useDisconnect,
  useMetamask,
  useMintNFT,
  useNetworkMismatch,
  useNFTs,
  ThirdwebNftMedia,
  useStorageUpload,
  useContractWrite,
} from '@thirdweb-dev/react';

import type { NextPage } from 'next';
import React, { useState } from 'react';
import Container from '../components/Container/Container';
import styles from '../styles/Upload.module.css';

// export default function Component() {
//   const { contract } = useContract("0xE44bC8e2c506b8FF6b820E1dC2502b7ba9f30d93");
//   const { mutateAsync: mintTo, isLoading } = useContractWrite(contract, "mintTo")

//   const call = async () => {
//     try {
//       const data = await mintTo({ args: [_to, _tokenURI] });
//       console.info("contract call successs", data);
//     } catch (err) {
//       console.error("contract call failure", err);
//     }
//   }
// }

const Upload: NextPage = () => {
  //연결 되어있는 지갑 주소 가져오기
  const address = useAddress();

  //지갑을 연결하고 연결끊기
  const connectWithMetamask = useMetamask();
  const disconnectWallet = useDisconnect();

  //nft 컨드렉트 주소
  const { contract } = useContract(
    '0xE44bC8e2c506b8FF6b820E1dC2502b7ba9f30d93'
  );

  // nft 컨트렉트 불러오기
  const { data: nfts, isLoading: loading } = useNFTs(contract);
  // nft mint 즉 등록
  const { mutate: mintNft, isLoading: minting } = useMintNFT(contract);
  // nft mint 즉 등록 2
  const { mutateAsync: mintTo, isLoading } = useContractWrite(
    contract,
    'mintTo'
  );

  //입력받은 name 변수 가공
  const [nftFormValues, setNftFormValues] = useState<NftFormValues>({
    name: '',
    description: '',
  });

  type NftFormValues = {
    name: string;
    description: string;
  };
  const { name, description } = nftFormValues;

  // 입력 받은 img 파일 가공
  const [file, setFile] = useState<File | null>(null);

  const { mutateAsync: upload } = useStorageUpload();

  //입력 받은 image 데이터 처리
  const handleImageInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    setFile(selectedFile || null);
  };

  //입력 받은 name 데이터 처리
  const handleNameInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setNftFormValues((prevValues) => ({ ...prevValues, [name]: value }));
  };

  //mint 즉 nft 등록 함수
  const handleMintNft = async () => {
    if (!address) {
      connectWithMetamask();
      return;
    }
    if (!file) {
      console.error('No file selected');
      return;
    }

    // 이미지 파일을 IPFS에 업로드합니다.
    const uploadUrl = await upload({
      data: [file],
      options: {
        uploadWithGatewayUrl: true,
        uploadWithoutDirectory: true,
      },
    });

    // name 과 uploadUrl 잘 넘어 왔는지 확인
    console.log(name, uploadUrl, description);

    // NFT를 발행합니다.
    mintNft(
      {
        metadata: {
          name,
          image: uploadUrl[0], // IPFS URL을 사용합니다.
          description,
        },
        to: address,
      },
      {
        onSuccess(data) {
          alert(`🚀 Successfully Minted NFT!`);
        },
      }
    );

    // mintTo(
    //   {
    //     metadata: {
    //       name,
    //       image: uploadUrl[0], // IPFS URL을 사용합니다.
    //       description,
    //     },
    //     to: address,
    //   },
    //   {
    //     onSuccess(data) {
    //       alert(`🚀 Successfully Minted NFT!`);
    //     },
    //   }
    // );
  };

  return (
    <Container maxWidth="lg">
      {address ? (
        <>
          <div className="form-container">
            <label htmlFor="name-input">Name:</label>
            <input
              type="text"
              id="name-input"
              name="name"
              value={nftFormValues.name}
              onChange={handleNameInputChange}
            />

            <label htmlFor="description-input">Description:</label>
            <input
              type="text"
              id="description-input"
              name="description"
              value={nftFormValues.description}
              onChange={handleNameInputChange}
            />

            <label htmlFor="image-input">Image URL:</label>
            <input
              type="file"
              id="image-input"
              name="image"
              onChange={handleImageInputChange}
            />

            <button className="mint-button" onClick={handleMintNft}>
              Mint NFT
            </button>
          </div>

          {!loading ? (
            <div className="nftBoxGrid">
              {nfts?.map((nft) => (
                <div className="nftBox" key={nft.metadata.id.toString()}>
                  <ThirdwebNftMedia
                    metadata={nft.metadata}
                    className="nftMedia"
                  />
                  <h3>{nft.metadata.name}</h3>
                  <p>Owner: {nft.owner.slice(0, 6)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>Loading NFTs..........</p>
          )}
        </>
      ) : (
        <div className="container">
          <ConnectWallet btnTitle="Connect Wallet" />
        </div>
      )}
    </Container>
  );
};

export default Upload;
