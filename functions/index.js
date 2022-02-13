const functions = require("firebase-functions");
const fcl = require("@onflow/fcl");
const { getTokenId, hashToTokenIds } = require("./nftList");
const { sign, hash } = require("./signer");

fcl.config().put("accessNode.api", "https://flow-access-mainnet.portto.io");

exports.getTokenId = functions.https.onRequest(async (req, res) => {
    functions.logger.info("getTokenId", { query: req.query });
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST');
    const tokenId = getTokenId(req.query.email);
    res.send({ tokenId: tokenId || '' });
});

exports.sign = functions.https.onRequest(async (req, res) => {
    functions.logger.info("sign", { body: req });
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST');

    try {
        const { signable } = req.body;
        functions.logger.info("signable", { signable });

        functions.logger.info("isAllowedTx(signable)", { result: isAllowedTx(signable) });
        if (isAllowedTx(signable)) {
            const signature = sign(signable.message);
            functions.logger.info("signature", signature);
            res.json({ signature });
        } else {
            res.status(400).send({ error: true, message: 'invalid cadence code' });
        }
    } catch (e) {
        res.send("success");
    }

});

const transaction = `
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
}`;

const isAllowedTx = (signable) => {
    return (
        hash(signable.cadence.replace(/\s/g, "")) === hash(transaction.replace(/\s/g, "")) &&
        Number(signable.args[0].value) === hashToTokenIds[signable.args[1].value]
    );
}
