const needle = require('needle')
const assert = require('assert')
const chalk = require('chalk')
const Q = require('q')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const sleep = require('sleep')
const abi = require('ethereumjs-abi')
const util = require('ethereumjs-util')
const Page = require('./page')

class Etherscan {
  constructor() {
    this.contractList = new Page({
      url: 'https://etherscan.io/contractsVerified/',
      curPageNumber: 0,
      lastPageNumber: 1,
    })
    this.contractAsset = new Page({
      url: 'https://etherscan.io/txs?a='
    })
    this.transactionDetail = new Page({
      url: 'https://etherscan.io/tx/'
    })
    this.contractReading = new Page({
      url: 'https://etherscan.io/readContract?a=',
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
        const transactionIds = []
          const contractAssetURL = this.contractAsset.nextPageWithParam(address)
          const body = await this.httpGet(contractAssetURL)
          const $ = cheerio.load(body)
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
        if (transactionIds.length >= 0) {
          const writeContent = {
            address,
            transactions: [],
            reading: [],
          }

          const contractReadingURL = this.contractReading.nextPageWithParam(address)
          const body = await this.httpGet(contractReadingURL)
          const $ = cheerio.load(body)
          $('.card').each((idx, card) => {
            const r = $(card).find('.py-2').text().split(' ')[1] + '()'
            const hasInput = $(card).find('input').length > 0
            console.log(r)
            if (!hasInput) {
              let d = util.keccak256(Buffer.from(r)).toString('hex').slice(0, 8)
              while (d.length < 64) d += '0'
              writeContent.reading.push(`0x${d}`)
            }
          })
          if (!writeContent.reading.length) continue
          for (let j = 0; j < transactionIds.length; j++) {
            sleep.sleep(1)
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
            if(isNaN(value)) continue
            const gasLimit = parseFloat(
              $('#ContentPlaceHolder1_spanGasLimit')
              .text()
              .replace(/,/g, '')
            )
            if(isNaN(gasLimit)) continue 
            const gasUsed = parseFloat(
              $('#ContentPlaceHolder1_spanGasUsedByTxn')
              .text()
              .split(' ')[0]
              .replace(/,/g, '')
            )
            if(isNaN(gasUsed)) continue
            const gasPrice = parseFloat(
              $('#ContentPlaceHolder1_spanGasPrice')
              .text()
              .split(' ')[0]
              .replace(/,/g, '')
            )
            if(isNaN(gasPrice)) continue
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
