### Conflux Installation

These following documents might help you to setup Conflux Chain

- Build project from source:  https://conflux-chain.github.io/conflux-doc/install/. 
- If you don't want to edit Conflux source code, just download the latest executable files at https://github.com/Conflux-Chain/conflux-rust/releases2.

To test Conflux we need to setup private test network which has low difficulty and an account with high balance to send transactions. By right, you should have 2 conflux nodes which are connected
together.
- Instruction: https://github.com/Conflux-Chain/conflux-rust/issues/792
- Private key of genesis account is: `46b9e861b63d3509c88b7817275a30d22d62c8cd8fa6486ddee35ef0d8e0495f`

To interact with conflux chain, you have two options:
- Use conflux web library: https://github.com/Conflux-Chain/ConfluxWeb
- Use conflux rpc api: https://conflux-chain.github.io/conflux-doc/json-rpc/


### Ethereum Installation

Ganache (https://www.trufflesuite.com/ganache) is highly recommended. Download and install ganache is easy.

To interact with ethereum chain, `web3js` (https://github.com/ethereum/web3.js/) is the best option. It is stable and easy to use.

