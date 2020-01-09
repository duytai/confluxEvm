const needle = require('needle')
const assert = require('assert')
const chalk = require('chalk')
const Q = require('q')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const Page = require('./page')

class Etherscan {
  constructor() {
    this.contractList = new Page({
      url: 'https://etherscan.io/contractsVerified/',
      curPageNumber: 0,
      lastPageNumber: 20,
    })
    this.contractAsset = new Page({
      url: 'https://etherscan.io/txs?a='
    })
    this.transactionDetail = new Page({
      url: 'https://etherscan.io/tx/'
    })
  }

  httpGet(url) {
    console.log(chalk.green(`>> PageURL: ${url}`))
    return Q.Promise((resolve, reject) => {
      needle.get(url, (error, resp) => {
        if (error) return reject(error)
        assert(resp.body)
        resolve(resp.body)
      })
    })
  }

  async crawle() {
    const contractsDir = path.join(__dirname, '../../contracts')
    while (this.contractList.hasNext()) {
      const addresses = []
      const contractListURL = this.contractList.nextPage()
      const body = await this.httpGet(contractListURL)
      const $ = cheerio.load(body)
      /// latest smart contract addresses
      $('.hash-tag.text-truncate').each((idx, aTag) => addresses.push($(aTag).text()))
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i]
        const contractAssetURL = this.contractAsset.nextPageWithParam(address)
        const body = await this.httpGet(contractAssetURL)
        const $ = cheerio.load(body)
        const transactionIds = []
        /// latest transaction ids
        $('.hash-tag.text-truncate').each((id, aTag) => {
          const transactionId = $(aTag).text()
          if (transactionId.length == 66) {
            if (!transactionIds.includes(transactionId)) {
              transactionIds.push(transactionId)
            }
          }
        })
        /// access smart contract which has number of transactions <= 10
        if (transactionIds.length <= 10) {
          const writeContent = {
            address,
            transactions: [],
          }
          for (let j = 0; j < transactionIds.length; j++) {
            const transactionId = transactionIds[j]
            const transactionDetailURL = this.transactionDetail.nextPageWithParam(transactionId)
            const body = await this.httpGet(transactionDetailURL)
            const $ = cheerio.load(body)
            const transactionPayloads = []
            const payload = $('#rawinput').text()
            const value = parseFloat(
              $('.u-label--value')
              .text()
              .split(' ')[0]
            )
            assert(!isNaN(value))
            const gasLimit = parseFloat(
              $('#ContentPlaceHolder1_spanGasLimit')
              .text()
              .replace(/,/g, '')
            )
            assert(!isNaN(gasLimit))
            const gasUsed = parseFloat(
              $('#ContentPlaceHolder1_spanGasUsedByTxn')
              .text()
              .split(' ')[0]
              .replace(/,/g, '')
            )
            assert(!isNaN(gasUsed))
            const gasPrice = parseFloat(
              $('#ContentPlaceHolder1_spanGasPrice')
              .text()
              .split(' ')[0]
              .replace(/,/g, '')
            )
            assert(!isNaN(gasPrice))
            writeContent.transactions.unshift({
              payload,
              value,
              gasLimit,
              gasPrice,
              gasUsed,
            })
          }
          /// write file to contracts dir
          const jsonFormat = JSON.stringify(writeContent, null, 2)
          const filename = `${writeContent.address}.json`
          const filepath = path.join(contractsDir, filename)
          fs.writeFileSync(filepath, jsonFormat)
          console.log(chalk.green(`>> write to file ${filename}`))
        }
      }
    }
  }
}

module.exports = {
  Etherscan,
}
