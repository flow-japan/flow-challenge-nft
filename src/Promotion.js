import React, { useState } from "react";
import {
  Center,
  Flex,
  Heading,
  Image,
  Button,
  Box,
  VStack,
  Text,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import * as fcl from "@onflow/fcl";
import * as types from "@onflow/types";
import { SHA3 } from "sha3";
import { serverAuthorization, getTokenId } from "./serverSigner";

export default function Promotion() {
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm();
  const [errorText, setErrorText] = useState("");
  const [txHash, setTxHash] = useState("");

  const onSubmit = async (data) => {
    try {
      setErrorText("");
      fcl.unauthenticate();
      const account = await fcl.authenticate();
      if (!account.loggedIn) {
        return;
      }

      const email = await getEmailFromIdentity();
      if (data.email.toLowerCase() !== email.toLowerCase()) {
        alert("同一メールアドレスでウォレットにログインしてください");
        return;
      }

      let tokenId;
      try {
        tokenId = await getTokenId(email);
      } catch (e) {
        console.log("error:", e);
        setErrorText("NFTが送付できませんでした。" + e.message);
        return;
      }

      if (tokenId === '') {
        alert("このメールアドレスは配布対象ではありません。記念NFT配布のメッセージが届いたメールアドレスを入力してください。");
        return;
      }

      const tx = await claimNft(tokenId, email);
      setTxHash(tx.transactionId);
      await fcl.tx(tx).onceSealed();

    } catch (e) {
      console.log("error:", e);
    }
  };

  return (
    <>
      <Flex padding="2rem" justify="center" >
        <Heading fontFamily={"'Dela Gothic One', 'Zen Antique'"} fontWeight={200}>Flow チャレンジ 記念 NFT</Heading>
      </Flex>

      <Center>
        <Box boxSize='sm'>
          <Image src='https://img.rarible.com/prod/image/upload/t_image_preview/prod-itemImages/FLOW-A.01ab36aaf654a13e.RaribleNFT:119834/d211034d' alt='Flow Challenge Attendee' />
        </Box>
      </Center>

      <Flex padding="2rem" justify="center" >
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl isInvalid={errors.email}>
            <FormLabel htmlFor='email'>メールを受け取ったあなたのメールアドレス</FormLabel>
            <Input
              id='Email'
              placeholder='test@gmail.com'
              {...register('email', {
                required: 'メールアドレスを入力してください。',
                pattern: {
                  value: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                  message: "メールアドレス形式で入力してください。"
                }
              })}
            />
            <FormErrorMessage>
              {errors.email && errors.email.message}
            </FormErrorMessage>
          </FormControl>

          <VStack>
            {errorText && (
              <Center>
                <Text textColor="gray" fontWeight="700">
                  {errorText}
                </Text>
              </Center>
            )}
          </VStack>

          <Center>
            <Button mt={4} colorScheme='teal' isLoading={isSubmitting} type='submit'>
              ウォレットに接続して NFT を受け取る
            </Button>
          </Center>

          <VStack>
            {txHash && (
              <>
                <Box m={6}>
                  <a href={"https://flowscan.org/transaction/" + txHash} target="_blank" rel="noreferrer">
                    <Text as='u'>
                      Flowscan でトランザクションを確認
                    </Text>
                  </a>
                </Box>
                <Box m={6}>
                  <a href={"https://rarible.com/"} target="_blank" rel="noreferrer">
                    <Text as='u'>
                      Rarible で Blocto ウォレットを接続すると NFT を確認できます。
                    </Text>
                  </a>
                </Box>
              </>
            )}
          </VStack>
        </form>
      </Flex>
    </>
  );
}

const hash = (msg) => {
  const sha = new SHA3(256);
  sha.update(Buffer.from(msg));
  return sha.digest().toString('hex');
}

const claimNft = async (tokenId, email) => {
  const authz = fcl.currentUser().authorization;
  const responseTransaction = await fcl.send([
    fcl.transaction`
import NonFungibleToken from 0x1d7e57aa55817448
import RaribleNFT from 0x01ab36aaf654a13e

transaction(tokenId: UInt64, code: String) {
  prepare(acct: AuthAccount, fromAcct: AuthAccount) {
    if acct.borrow<&RaribleNFT.Collection>(from: RaribleNFT.collectionStoragePath) == nil {
      let collection <- RaribleNFT.createEmptyCollection() as! @RaribleNFT.Collection
      acct.save(<- collection, to: RaribleNFT.collectionStoragePath)
      acct.link<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(RaribleNFT.collectionPublicPath, target: RaribleNFT.collectionStoragePath)
    }

    let collection = fromAcct.borrow<&RaribleNFT.Collection>(from: RaribleNFT.collectionStoragePath)
        ?? panic("could not borrow RaribleNFT collection from account")
    let token <- collection.withdraw(withdrawID: tokenId)
    let receiver = acct.borrow<&RaribleNFT.Collection>(from: RaribleNFT.collectionStoragePath)
        ?? panic("could not borrow RaribleNFT collection from account")
    receiver.deposit(token: <- token)
  }
}`,
    fcl.args([
      fcl.arg(Number(tokenId), types.UInt64),
      fcl.arg(hash(email), types.String),
    ]),
    fcl.proposer(authz),
    fcl.authorizations([authz, serverAuthorization]),
    fcl.payer(authz),
    fcl.limit(9999),
  ]);
  return responseTransaction;
}

const getEmailFromIdentity = async () => {
  const identity = await fcl.currentUser().snapshot();
  if (identity.loggedIn) {
    const filteredEmail = identity.services
      .map((s) => (s.scoped ? s.scoped.email : null))
      .filter((s) => s !== null);
    if (filteredEmail.length > 0) {
      return filteredEmail[0];
    }
  }
  return null;
};
