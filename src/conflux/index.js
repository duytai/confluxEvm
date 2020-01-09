const chalk = require('chalk')
const needle = require('needle')
const assert = require('assert')
const Q = require('q')
const path = require('path')
const fs = require('fs')
const ConfluxTx= require('confluxjs-transaction')
const util = require('ethereumjs-util')

class Conflux {
  constructor() {
    this.rpcURL = 'http://10.27.36.29:10011'
    this.privateKey = Buffer.from(
      '9b230bf609770025a17e26b55602580476e45fb4426267b1f0d394d48e4dbd6b',
      'hex'
    )
    this.contractsDir = path.join(__dirname, '../../contracts')
    this.address = `0x${util.privateToAddress(this.privateKey).toString('hex')}`
  }

  httpPost(data) {
    const options = {
      headers: {
        'Content-Type': 'application/json'
      }
    }
    Object.assign(data, { id: 1, jsonrpc: '2.0' })
    return Q.Promise((resolve, reject) => {
      needle.post(this.rpcURL, data, options, (error, resp) => {
        if (error) return reject(error)
        assert(resp.body)
        resolve(resp.body)
      })
    })
  }

  async getTransactionCount() {
    return await this.httpPost({
      method: 'cfx_getTransactionCount',
      params: [this.address],
    })
  }

  async sendTransaction(transaction) {
    const { payload, gasPrice, gasLimit, value } = transaction
    const txCount = await this.getTransactionCount()
    assert(txCount.result)
    const txParams = {
      nonce: txCount.result,
      gasPrice: gasPrice * 1e9,
      gasLimit,
      value,
      data: payload,
    }
    const tx = new ConfluxTx(txParams)
    tx.sign(this.privateKey)
    const serializedTx = tx.serialize().toString('hex')
    const result = await this.httpPost({
      method: 'cfx_sendRawTransaction',
      params: [`0x${serializedTx}`]
    })
    console.log(result)
  }

  async sendTransactions() {
    const contractFiles = fs
      .readdirSync(this.contractsDir)
      .map(p => path.join(this.contractsDir, p))
      .slice(0, 1)
    for (let i = 0; i < contractFiles.length; i ++) {
      const jsonFormat = JSON.parse(fs.readFileSync(contractFiles[i], 'utf8'))
      const { transactions } = jsonFormat
      for (let j = 0; j < transactions.length; j ++) {
        const transaction = transactions[i]
        await this.sendTransaction(transaction)
        process.exit()
      }
    }
  }
}

module.exports = {
  Conflux,
}