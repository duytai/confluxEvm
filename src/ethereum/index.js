const chalk = require('chalk')
const needle = require('needle')
const assert = require('assert')
const Q = require('q')
const path = require('path')
const fs = require('fs')
const EthereumTx = require('ethereumjs-tx').Transaction
const util = require('ethereumjs-util')
const sleep = require('sleep')

class Ethereum {
  constructor() {
    // this.rpcURL = 'http://127.0.0.1:10011'
    this.rpcURL = 'http://testnet-jsonrpc.conflux-chain.org:12537'
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
    return Q.Promise((resolve, reject) => {
      needle.post(this.rpcURL, data, options, (error, resp) => {
        if (error) return reject(error)
        assert(resp.body)
        resolve(resp.body)
      })
    })
  }

  async getBalance() {
    return await this.httpPost({
      method: 'eth_getBalance',
      params: [this.address],
    })
  }

  async getReceipt(transactionHash) {
    return await this.httpPost({
      method: 'eth_getTransactionReceipt',
      params: [transactionHash]
    })
  }

  async getTransactionCount() {
    return await this.httpPost({
      method: 'eth_getTransactionCount',
      params: [this.address],
    })
  }

  async sendTransaction(transaction, contractAddress) {
    const { payload, gasPrice, gasLimit, value } = transaction
    const txCount = await this.getTransactionCount()
    assert(txCount.result)
    const txParams = {
      to: contractAddress,
      nonce: txCount.result,
      gasPrice: (gasPrice + 1) * 1e9,
      gasLimit,
      value,
      data: payload,
    }
    const tx = new EthereumTx(txParams)
    tx.sign(this.privateKey)
    const serializedTx = tx.serialize().toString('hex')
    const txHash = await this.httpPost({
      method: 'eth_sendRawTransaction',
      params: [`0x${serializedTx}`]
    })
    assert(txHash.result)
    return txHash.result
  }

  async sendTransactions() {
    let pastBalance = await this.getBalance()
    pastBalance = parseInt(pastBalance.result)
    console.log(chalk.green.bold(`balance: ${pastBalance}`))
    const contractFiles = fs
      .readdirSync(this.contractsDir)
      .map(p => path.join(this.contractsDir, p))
      .slice(10, 20)
    for (let i = 0; i < contractFiles.length; i ++) {
      let contractAddress = null
      try {
        console.log(chalk.green.bold(`f: ${contractFiles[i].slice(-47)}`))
        const jsonFormat = JSON.parse(fs.readFileSync(contractFiles[i], 'utf8'))
        const { transactions } = jsonFormat
        for (let j = 0; j < transactions.length; j ++) {
          const transaction = transactions[j]
          const hash = await this.sendTransaction(transaction, contractAddress)
          assert(hash)
          let receipt = { result: null }
          while (!receipt.result) {
            sleep.sleep(1)
            receipt = await this.getReceipt(hash)
            console.log(receipt)
          }
          assert(receipt.result)
          contractAddress = receipt.result.contractAddress || contractAddress
          const { result: { gasUsed } } = receipt
          assert(gasUsed)
          console.log(gasUsed)
        }
      } catch (e) {
        console.log(e)
      }
    }
    let currentBalance = await this.getBalance()
    currentBalance = parseInt(currentBalance.result)
    console.log(chalk.green.bold(`balance: ${currentBalance}`))
    const spend = pastBalance - currentBalance 
    console.log(chalk.green.bold(`spend: ${spend}`))
  }
}

module.exports = {
  Ethereum,
}
