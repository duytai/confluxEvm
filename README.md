### 1. Inconsistent balance

Conflux node returns different balances of the same user
E.g.

- 1 request, balance is: `0xf684e5901f2b9f4fe79d3735cf7c`
- 2 request, balance is: `0xf684e5939be8cd6c547fc377cf7c`
- 3 request, balance is: `0xf684e59412d0e56feebfb3f5cf7c`

### 2. Conflux possibly does not charge failed transaction fee

When conflux evm reverts a transaction, the rpc api reports that gasUsed is `0`

### 3. User balance increases atfer a bunch of succesful transactions
```bash
0xf684e59c49315801a239ef39b28e
balance before: 5.000001940955514e+33
contract: 0x03b1565e070df392e48e7a8e01798C4B00E534A5.json
0x2a81e3
0xab52
contract: 0x04D4a97995EfE3E26A5AF389a4af82732964Bd31.json
0x0
contract: 0x06f41c1c8a9904cbcc9d5f9b6b0a025b82588039.json
0x0
contract: 0x0a1ab3441a56be6e5baa6cbb423e6cc66c951226.json
0x0
0x0
contract: 0x0e2EF074C1a772f93D57E199d3570daB67a37BF2.json
0x0
contract: 0x0fa8b36d8c2f47548778893fbb41a47a12bfda61.json
0x0
0x0
contract: 0x0fb87187b8f32af1113e514bd577a1acf3a19b46.json
0x0
0x0
0x0
contract: 0x104312cfa88b77304127f8033e4efa926ac5dacf.json
contract: 0x105c293880af722a8e79ca4611a4fe4f3760a13e.json
0x0
0x0
f: 0x11105d1fbc4c8ad6f0280a0b52b8091232fb7363.json
0x0
balance after: 5.000001941221885e+33
spend: -2.6637098442436593e+23
>> Done
```
After more than 10 transactions which cost `0x2a81e3 + 0xab52`, my balance increases from `5.000001940955514e+33` to `5.000001941221885e+33`
