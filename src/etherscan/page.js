const assert = require('assert')

class Page {
  constructor({ url, curPageNumber = 0, lastPageNumber = 0}) {
    this.url = url
    this.curPageNumber = curPageNumber
    this.lastPageNumber = lastPageNumber
  }

  hasNext() {
    return this.curPageNumber < this.lastPageNumber
  }

  nextPage() {
    this.curPageNumber ++
    assert(this.curPageNumber <= this.lastPageNumber)
    return `${this.url}${this.curPageNumber}`
  }

  nextPageWithParam(param) {
    return `${this.url}${param}`
  }

}

module.exports = Page
