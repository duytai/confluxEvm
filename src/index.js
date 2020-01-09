const chalk = require('chalk')
const { Etherscan } = require('./etherscan')
const { Ethereum } = require('./ethereum')
const { Conflux } = require('./conflux')

const mode = process.env.MODE

switch(mode) {
  case 'etherscan': {
    const etherscan = new Etherscan()
    etherscan.crawle().then(() => {
      console.log(chalk.green.bold('>> Done'))
    })
    break
  }
  case 'ethereum': {
    const ethereum = new Ethereum()
    ethereum.sendTransactions().then(() => {
      console.log(chalk.green.bold('>> Done'))
    })
    break
  }
  case 'conflux': {
    const conflux = new Conflux()
    conflux.sendTransactions().then(() => {
      console.log(chalk.green.bold('>> Done'))
    })
  }
}
