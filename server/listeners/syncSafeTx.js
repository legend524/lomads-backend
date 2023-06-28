const GnosisSafeTx = require('../modules/gnosisSafeTx/gnosisSafeTx.model')
const _ = require('lodash')
const GnosisSafeTxSyncTracker  = require('../modules/gnosisSafeTx/gnosisSafeTxSyncTracker.model')
const Safe = require('../modules/safe/safe.model');
const { GNOSIS_API_ENDPOINT } = require('../../config/constants')
const axios = require('axios');
const config = require('@config/config')
const moment = require('moment')

module.exports = {
  handle: async () => {
    if(config.env === 'local') return;
    console.log("30s")
    const safe = await GnosisSafeTxSyncTracker.findOne({ chainId: { $ne: null } }).sort({ lastSync: 1 })
    console.log(safe)
    if(safe.chainId) {
      // if(!safe.lastSync) {
        const localTxns = await GnosisSafeTx.find({ 'safeAddress': safe?.safeAddress })
        axios.get(`${GNOSIS_API_ENDPOINT[safe.chainId]}/api/v1/safes/${safe?.safeAddress}/all-transactions/?limit=10000&offset=0`)
        .then(async res => {
          if(res.data && res.data.results && res.data.results.length > 0) {
            let Alltxns = res.data.results.map(tx => { return { safeAddress: safe?.safeAddress, rawTx: tx } })
            let txns = Alltxns.filter(tx => !_.find(localTxns, ltxn => ( ltxn?._doc?.rawTx?.safeTxHash === tx?.rawTx?.safeTxHash ||  ltxn?._doc?.rawTx?.txHash === tx?.rawTx?.txHash || ltxn?._doc?.rawTx?.safeTxHash === tx?.rawTx?.txHash )))
            if(txns.length > 0)
              await GnosisSafeTx.create(txns)
            let existingtxns = Alltxns.filter(tx => _.find(localTxns, ltxn => ( ltxn?._doc?.rawTx?.safeTxHash === tx?.rawTx?.safeTxHash ||  ltxn?._doc?.rawTx?.txHash === tx?.rawTx?.txHash || ltxn?._doc?.rawTx?.safeTxHash === tx?.rawTx?.txHash )))
            if(existingtxns.length > 0) {
              for (let index = 0; index < existingtxns.length; index++) {
                const exTxn = existingtxns[index];
                await GnosisSafeTx.findOneAndUpdate({  $or: [{'rawTx.safeTxHash': exTxn?.rawTx?.safeTxHash }, {'rawTx.txHash': exTxn?.rawTx?.txHash }], safeAddress: safe?.safeAddress }, { rawTx: exTxn.rawTx })
              }
            }
            console.log("localTxns", localTxns.length, "receivedTxns", res.data.results.length,  "creatingTxns", txns.length, "updatingTxns", existingtxns.length)
          }
        })
        .finally(async () => {
          await GnosisSafeTxSyncTracker.findOneAndUpdate({ _id: safe._id }, { $set: { lastSync: moment().utc().toDate() } })
        })
      // } else {
      //   axios.get(`${GNOSIS_API_ENDPOINT[safe.chainId]}/api/v1/safes/${safe?.safeAddress}/multisig-transactions/?modified__gte=${moment(safe.lastSync).toISOString()}&limit=10000&offset=0`)
      //   .then(async res => {
      //     for (let index = 0; index < res.data.results.length; index++) {
      //       const tx = res.data.results[index];
      //       const gstx = await GnosisSafeTx.findOne({ 'rawTx.safeTxHash': tx.safeTxHash, safeAddress: safe?.safeAddress })
      //       if(gstx) {
      //         gstx.rawTx = tx
      //         await gstx.save()
      //       } else {
      //         await GnosisSafeTx.create({ safeAddress: safe?.safeAddress, rawTx: tx })
      //       }
      //     }
      //     await GnosisSafeTxSyncTracker.findOneAndUpdate({ _id: safe._id }, { $set: { lastSync: moment().utc().toDate() } })
      //   })
      //   .finally(async () => {
      //     await GnosisSafeTxSyncTracker.findOneAndUpdate({ _id: safe._id }, { $set: { lastSync: moment().utc().toDate() } })
      //   })
      // }
    }
  }
}