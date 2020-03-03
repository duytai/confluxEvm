const chalk = require('chalk')
const needle = require('needle')
const assert = require('assert')
const Q = require('q')
const path = require('path')
const fs = require('fs')
const { createLogger, format, transports } = require('winston')
const EthereumTx = require('ethereumjs-tx').Transaction
const util = require('ethereumjs-util')
const BN = require('bn.js')
const sleep = require('sleep')
const dotenv = require('dotenv')

const { combine, timestamp, label, prettyPrint, printf } = format
const { parsed: { ETHEREUM_REMOTE, ETHEREUM_PRIVATE_KEY } } = dotenv.config()
assert(ETHEREUM_REMOTE && ETHEREUM_PRIVATE_KEY, `update .env file`)

class Ethereum {
  constructor() {
    this.rpcURL = ETHEREUM_REMOTE
    this.privateKey = Buffer.from(ETHEREUM_PRIVATE_KEY, 'hex')
    this.contractsDir = path.join(__dirname, '../../contracts')
    this.address = `0x${util.privateToAddress(this.privateKey).toString('hex')}`
    this.logger = createLogger({
      format: combine(
        format.colorize(),
        label({ label: 'ethereum' }),
        timestamp(),
        printf(({ level, message, label }) => {
          return `[${label}] ${level}: ${message}`
        }),
      ),
      transports: [
        new (transports.Console)({ level: 'debug' }),
        new transports.File({ filename: 'logs/ethereum.log', level: 'debug' })
      ]
    })
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
      gasPrice: gasPrice * 1e18,
      value: value * 1e10,
      gasLimit: gasLimit * 1e1,
      data: payload,
    }
    const tx = new EthereumTx(txParams)
    tx.sign(this.privateKey)
    const serializedTx = tx.serialize().toString('hex')
    const txHash = await this.httpPost({
      method: 'eth_sendRawTransaction',
      params: [`0x${serializedTx}`]
    })
    return txHash.result
  }

  async sendTransactions() {
    let pastBalance = await this.getBalance()
    pastBalance = new BN(pastBalance.result.slice(2), 16)
    this.logger.info(`balance: ${pastBalance}`)
    const contractFiles = fs
      .readdirSync(this.contractsDir)
      .map(p => path.join(this.contractsDir, p))
    let contractCount = 0 
    let txCount = 0
    let allUsed = new BN(0)
    while (contractCount < contractFiles.length) {
      let contractAddress = null
      this.logger.info(`\ttransact : ${contractFiles[contractCount].slice(-47).slice(0, -5)}`)
      const jsonFormat = JSON.parse(fs.readFileSync(contractFiles[contractCount], 'utf8'))
      const { transactions } = jsonFormat
      let txIdx = 0
      while (txIdx < transactions.length) {
        txCount ++
        const transaction = transactions[txIdx]
        this.logger.info(`\tcontract : ${contractCount}`)
        this.logger.info(`\ttransact : ${txCount}`)
        this.logger.info(`\tto       : ${contractAddress}`)
        this.logger.info(`\tsig      : ${transaction.payload.slice(0, 10)}`)
        const hash = await this.sendTransaction(transaction, contractAddress)
        assert(hash)
        let receipt = { result: null }
        while (!receipt.result) {
          sleep.sleep(1)
          receipt = await this.getReceipt(hash)
        }
        contractAddress = receipt.result.contractCreated || contractAddress
        const gasUsed = new BN(receipt.result.gasUsed.slice(2), 16)
        const gasPrice = new BN(transaction.gasPrice * 1e18)
        const value = new BN(transaction.value * 1e10)
        const gasLimit = new BN(transaction.gasLimit * 1e1)
        const used = gasUsed.mul(gasPrice)
        allUsed = allUsed.add(used)
        this.logger.info(`\tgasUsed  : ${gasUsed}`)
        this.logger.info(`\tgasLimit : ${gasLimit}`)
        this.logger.info(`\tgasPrice : ${gasPrice}`)
        this.logger.info(`\tvalue    : ${value}`)
        this.logger.info(`\tspend    : ${used}`)
        this.logger.info('\t---------------------')
        txIdx ++
      }
      contractCount ++
    }
    let currentBalance = await this.getBalance()
    currentBalance = new BN(currentBalance.result.slice(2), 16)
    this.logger.info(`balance: ${currentBalance}`)
    const spend = pastBalance.sub(currentBalance)
    this.logger.info(`real Spend   : ${spend}`)
    this.logger.info(`manual Spend : ${allUsed}`)
  }
}

module.exports = {
  Ethereum,
}
