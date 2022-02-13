import * as fcl from "@onflow/fcl";
import axios from "axios";

const API = "http://localhost:5001/flow-challenge-nft/us-central1";

const getSignature = async (signable) => {
    const response = await axios.post(
        `${API}/sign`,
        { signable },
    );
    const signed = JSON.parse(JSON.stringify(response.data));
    return signed.signature;
}

export const getTokenId = async (email) => {
    const response = await axios.get(
        `${API}/getTokenId`,
        { params: { email } },
    );
    const resTokenId = JSON.parse(JSON.stringify(response.data));
    return resTokenId.tokenId;
}

export const serverAuthorization = async (account) => {
    const addr = "0x74c8be713d59bc63";
    const keyId = 3;
    return {
        ...account,
        tempId: `${addr}-${keyId}`,
        addr: fcl.sansPrefix(addr),
        keyId: Number(keyId),
        signingFunction: async (signable) => {
            const signature = await getSignature(signable);
            return {
                addr: fcl.withPrefix(addr),
                keyId: Number(keyId),
                signature
            }
        }
    }
}
