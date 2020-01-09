const { Etherscan } = require('./etherscan')

const mode = process.env.MODE

switch(mode) {
  case 'etherscan': {
    const etherscan = new Etherscan()
    etherscan.crawle().then(() => {
      console.log(chalk.green.bold('>> Done'))
    })
    break
  }
}
