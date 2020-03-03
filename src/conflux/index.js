const chalk = require('chalk')
const needle = require('needle')
const assert = require('assert')
const Q = require('q')
const path = require('path')
const BN = require('bn.js')
const fs = require('fs')
const ConfluxTx= require('confluxjs-transaction')
const sleep = require('sleep')
const util = require('ethereumjs-util')
const dotenv = require('dotenv')

const { parsed: { CFX_REMOTE, CFX_PRIVATE_KEY } } = dotenv.config()
assert(CFX_REMOTE && CFX_PRIVATE_KEY, `update .env file`)

class Conflux {
  constructor() {
    this.rpcURL = CFX_REMOTE
    this.privateKey = Buffer.from(CFX_PRIVATE_KEY, 'hex')
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
      params: [this.address, 'latest_state'],
    })
  }

  async getReceipt(transactionHash) {
    return await this.httpPost({
      method: 'cfx_getTransactionReceipt',
      params: [transactionHash]
    })
  }

  async sendTransaction(transaction, contractAddress) {
    const { payload, gasPrice, gasLimit, value } = transaction
    const txCount = await this.getTransactionCount()
    assert(txCount.result)
    const txParams = {
      to: contractAddress,
      nonce: txCount.result,
      gasPrice: gasPrice * 1e18, 
      value: value * 1e18,
      gasLimit: gasLimit,
      data: payload,
    }
    const tx = new ConfluxTx(txParams)
    tx.sign(this.privateKey)
    const serializedTx = tx.serialize().toString('hex')
    const txHash = await this.httpPost({
      method: 'cfx_sendRawTransaction',
      params: [`0x${serializedTx}`]
    })
    return txHash.result
  }

  async getBalance() {
    return await this.httpPost({
      method: 'cfx_getBalance',
      params: [this.address],
    })
  }

  async sendTransactions() {
    let pastBalance = await this.getBalance()
    pastBalance = new BN(pastBalance.result.slice(2), 16)
    console.log(`balance: ${pastBalance}`)
    const contractFiles = fs
      .readdirSync(this.contractsDir)
      .map(p => path.join(this.contractsDir, p))
      .slice(0, 1)
    let idx = 0 
    let allUsed = new BN(0)
    while (idx < contractFiles.length) {
      let contractAddress = null
      console.log(`\ttransaction: ${contractFiles[idx].slice(-47).slice(0, -5)}`)
      const jsonFormat = JSON.parse(fs.readFileSync(contractFiles[idx], 'utf8'))
      const { transactions } = jsonFormat
      let txIdx = 0
      while (txIdx < transactions.length) {
        const transaction = transactions[txIdx]
        console.log(`\tto: ${contractAddress}`)
        const hash = await this.sendTransaction(transaction, contractAddress)
        if (!hash) {
          sleep.sleep(1)
          continue
        } 
        let receipt = { result: null }
        while (!receipt.result) {
          sleep.sleep(1)
          receipt = await this.getReceipt(hash)
        }
        contractAddress = receipt.result.contractCreated || contractAddress
        const gasUsed = new BN(receipt.result.gasUsed.slice(2), 16)
        const gasPrice = new BN(transaction.gasPrice * 1e18)
        const value = new BN(transaction.value * 1e18)
        const gasLimit = new BN(transaction.gasLimit)
        const used = gasUsed.mul(gasPrice)
        allUsed = allUsed.add(used)
        console.log(`\tgasUsed  : ${gasUsed}`)
        console.log(`\tgasPrice : ${gasPrice}`)
        console.log(`\tvalue    : ${value}`)
        console.log(`\tspend    : ${used}`)
        console.log(`\tlimit    : ${gasLimit}`)
        console.log('\t---------------------')
        txIdx ++
      }
      idx ++
    }
    let currentBalance = await this.getBalance()
    currentBalance = new BN(currentBalance.result.slice(2), 16)
    console.log(`balance: ${currentBalance}`)
    const spend = pastBalance.sub(currentBalance)
    console.log(`real Spend   : ${spend}`)
    console.log(`manual Spend : ${allUsed}`)
  }
}

module.exports = {
  Conflux,
}
