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
import axios from "axios";

export default function Promotion() {
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm();
  const [errorText, setErrorText] = useState("");

  const onSubmit = async (data) => {
    try {
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

      const exist = await existsRaribleCollection(account.addr);
      if (!exist) {
        alert("Rarible のコレクションを作成する必要があります。このあと出てくるウォレットの画面で、承認してください。");
        await createRaribleCollection();
      }

      try {
        const res = await axios.get(
          "request-url-to-get-nft",
          {
            params: {
            },
          }
        );
        console.log("res:", res);
      } catch (e) {
        console.log("error:", e);
        setErrorText("NFTが送付できませんでした。" + e.message);
        return;
      }

      return;
    } catch (e) {
      console.log("error:", e);
      return;
    }
  };

  return (
    <>
      <Flex padding="2rem" justify="center" >
        <Heading>Flow チャレンジ 記念 NFT</Heading>
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
        </form>
      </Flex>
    </>
  );
}

const existsRaribleCollection = async (toAddress) => {
  const script = `
    import NonFungibleToken from 0x1d7e57aa55817448
    import RaribleNFT from 0x01ab36aaf654a13e

    pub fun main(address: Address): Bool {
        return getAccount(address)
            .getCapability<&{NonFungibleToken.CollectionPublic}>(RaribleNFT.collectionPublicPath)
            .check()
    }
  `;
  const args = [fcl.arg(toAddress, types.Address)];
  const response = await fcl.send([fcl.script`${script}`, fcl.args(args)]);
  return await fcl.decode(response);
};

const createRaribleCollection = async () => {
  const authz = fcl.currentUser().authorization;
  const responseTransaction = await fcl.send([
    fcl.transaction`
transaction {
  prepare(signer: AuthAccount) {
    if acct.borrow<&RaribleNFT.Collection>(from: RaribleNFT.collectionStoragePath) == nil {
      let collection <- RaribleNFT.createEmptyCollection() as! @RaribleNFT.Collection
      acct.save(<- collection, to: RaribleNFT.collectionStoragePath)
      acct.link<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(RaribleNFT.collectionPublicPath, target: RaribleNFT.collectionStoragePath)
    }
  }
}`,
    fcl.args([]),
    fcl.proposer(authz),
    fcl.authorizations([authz]),
    fcl.payer(authz),
    fcl.limit(9999),
  ]);
  await fcl.tx(responseTransaction).onceSealed();
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
