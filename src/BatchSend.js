import React, { useState } from "react";
import {
    Center,
    Flex,
    Heading,
    Textarea,
    Button,
    Box,
    VStack,
    Text,
    FormControl,
    FormLabel,
    FormErrorMessage,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import * as fcl from "@onflow/fcl";
import * as types from "@onflow/types";

export default function BatchSend() {
    const {
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();
    const [errorText, setErrorText] = useState("");
    const [amount, setAmount] = useState(0);
    const [toAddressesStr, setToAddressesStr] = useState("");
    const [txHash, setTxHash] = useState("");

    const onSubmit = async (data) => {
        try {
            const toAddresses = toAddressesStr ? toAddressesStr.split(/\r\n|\n/).filter(v => !!v) : [];
            console.log("onSubmit:", amount, toAddresses);
            setErrorText("");
            fcl.unauthenticate();
            const account = await fcl.authenticate();
            if (!account.loggedIn) {
                return;
            }

            const tx = await sendFLOW(amount, toAddresses);
            setTxHash(tx.transactionId);
            await fcl.tx(tx).onceSealed();

        } catch (e) {
            console.log("error:", e);
        }
    };

    return (
        <>
            <Flex padding="2rem" justify="center" >
                <Heading fontFamily={"'Dela Gothic One', 'Zen Antique'"} fontWeight={200}>FLOW Batch Send</Heading>
            </Flex>

            <Flex padding="2rem" justify="center" >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FormControl isInvalid={errors.email}>
                        <FormLabel htmlFor='addresses'>To Flow Addresses</FormLabel>
                        <Textarea
                            id='addresses'
                            placeholder="0x74c8be713d59bc63 .."
                            mb={2}
                            onChange={(e) => { setToAddressesStr(e.target.value) }}
                        />

                        <FormLabel htmlFor='amount'>Amount (FLOW)</FormLabel>
                        <NumberInput
                            id='amount'
                            defaultValue={0}
                            precision={4}
                            step={0.1}
                            onChange={(value) => setAmount(Number(value))}
                        >
                            <NumberInputField />
                            <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                        <FormErrorMessage>
                            {errors.amount && errors.amount.message}
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
                            Send FLOW
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
                            </>
                        )}
                    </VStack>
                </form>
            </Flex>
        </>
    );
}

const sendFLOW = async (amount, toAddresses) => {
    const authz = fcl.currentUser().authorization;
    const responseTransaction = await fcl.send([
        fcl.transaction`
import FungibleToken from 0xf233dcee88fe0abe
import FlowToken from 0x1654653399040a61

transaction(amount: UFix64, toAddresses: [Address]) {
    prepare(signer: AuthAccount) {
        let vaultRef = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
			?? panic("Could not borrow reference to the owner's Vault!")

        var i: UInt64 = 0
        while i < toAddresses.length {
            let sentVault <- vaultRef.withdraw(amount: amount)
            let receiverRef =  getAccount(toAddresses[i])
                .getCapability(/public/flowTokenReceiver)
                .borrow<&{FungibleToken.Receiver}>()
                ?? panic("Could not borrow receiver reference to the recipient's Vault")
            receiverRef.deposit(from: <-sentVault)
            i = i + UInt64(1)
        }
    }
}`,
        fcl.args([
            fcl.arg(amount.toString(), types.UFix64),
            fcl.arg(toAddresses, types.Array(types.Address)),
        ]),
        fcl.proposer(authz),
        fcl.authorizations([authz]),
        fcl.payer(authz),
        fcl.limit(9999),
    ]);
    return responseTransaction;
}
