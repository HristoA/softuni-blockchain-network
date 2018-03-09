# Own Blockchain Network

Implementation of simple fully functional blockchain network with:
* Nodes
* Miners
* Wallet
* Faucet
* Blockchain Explorer

The project is created for education and is not polished for production uses!

## Run Node
* Normal
```
cd ./Node
npm install
npm start
```
* Debug Mode
```
cd ./Node
npm install
npm test
```

## Run Peer Node
* Normal
```
cd ./Node
npm install
HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 npm start
```
* Debug Mode
```
cd ./Node
npm install
HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 npm test
```

## Run Wallet
* Normal
```
cd ./Wallet
npm install
npm start
```
* Debug Mode
```
cd ./Wallet
npm install
npm test
```

## Run Miner

* Normal
```
cd ./Wallet
npm install
MINNER_ADDR={AddressFromWallet} npm start
```
* Debug Mode
```
cd ./Wallet
npm install
MINNER_ADDR={AddressFromWallet} npm test
```

* Default Node Mode with reward for no one
```
cd ./Wallet
npm install
npm start
```

## Run Faucet
* Can be used miner with address from wallet to earn coins for every mined blocks
* Can be used default wallet of blockchain network with this run comand:
```
FAUCET=true npm start
```


## Run Block explorer
* Normal
```
cd ./BlockExplorer
npm install
npm start
```
* Debug Mode
```
cd ./BlockExplorer
npm install
npm test
```

## Available Endpoints

| URL | METHODS | DESCRIPTION |
| ------ | ------ | ------ |
|/peers  | GET  | Returns peers list |
|/peers  | POST | Add peer to list of peers |
|/blocks | GET  | Returns all blocks in network |
|/blocks/:index  | GET | Returns block for specific index |
|/blocks/:hash  | GET | Returns block for specific hash |
| /transaction | POST | Add transaction to pending list |
|/transaction/:hash | GET | Returns transaction info for specific transaction hash |
| /transactions/pending | GET | Returns all pending transactions |
| /balance/:addr | GET | Returns balances and transaction history for address |  
| /mining/:addr | GET | Return data for miners |
| /mining/:addr | POST | Send new mined block |

## Blocks
* Hashing

```
var blockDataHash = this.calculateSHA256([newBlockIndex, previousHash, timestamp, transactions]);
var nonce         = newBlock.nonce
var newBlockHash  = this.calculateSHA256([blockDataHash, nonce]);
```

* Example
```
{
    "index": 2,
    "previousHash": "00028168a1cf4944deed426db37b1e98ce92b8fa5755a345f6b3d774cf9e4845",
    "timestamp": 1520468444689,
    "transactions": [
      {
        "from": "coinbase",
        "to": "b43f5b7f4fe7aad669336b50c9757d7b19b23485",
        "value": 24,
        "fee": 0,
        "timestamp": 1520468444689,
        "pubKey": "coinbase",
        "signature": "coinbase",
        "hash": "367fd1e8caf0a106cbee49ef0850a1fe981e39dacf3f027547a6bd0e2167095e",
        "block": 2,
        "status": "confirmed"
      },
      {
        "from": "b43f5b7f4fe7aad669336b50c9757d7b19b23485",
        "to": "63afbbf1a0377a613970366cf9c65ec069e854f2",
        "value": 3,
        "fee": 0,
        "timestamp": 1520468424412,
        "pubKey": "04c601f63f7edc8272204d025b808f292d3899ffa7159986c57d250e72132be1925796de23fa7ebaa9ce8ef419f152722b67d963f62ebe3a52b0653da2a98fec23",
        "signature": "304502204649d7ebb4221a203a6620cb3d5b8c96a68a5a1e891775879acc6c117aba8100022100863c96de92f4dff7633fa588589c70f2d77907e399cddd5a9a6f659e060fc219",
        "hash": "d8281af6fe495e83b0a06be95a0b7ca4c66a1de40a4bfc3ce6b161c89c0ea966",
        "block": 2,
        "status": "confirmed"
      }
    ],
    "hash": "0036d99c18ff9a99356143384a5a143cc34bd0660e4f8287c1c10209e45c0373",
    "mynedBy": "b43f5b7f4fe7aad669336b50c9757d7b19b23485",
    "difficulty": 2,
    "nonce": 624
  },
```

## Transactions
* Hashing
```
this.calculateSHA256([
        from,
        to,
        value,
        fee,
        timestamp
    ]);
```

* Example
```
{
   "from": "b43f5b7f4fe7aad669336b50c9757d7b19b23485",
   "to": "63afbbf1a0377a613970366cf9c65ec069e854f2",
   "value": 3,
   "fee": 0,
   "timestamp": 1520468424412,
   "pubKey": "04c601f63f7edc8272204d025b808f292d3899ffa7159986c57d250e72132be1925796de23fa7ebaa9ce8ef419f152722b67d963f62ebe3a52b0653da2a98fec23",
   "signature": "304502204649d7ebb4221a203a6620cb3d5b8c96a68a5a1e891775879acc6c117aba8100022100863c96de92f4dff7633fa588589c70f2d77907e399cddd5a9a6f659e060fc219",
   "hash": "d8281af6fe495e83b0a06be95a0b7ca4c66a1de40a4bfc3ce6b161c89c0ea966",
   "block": "7",
   "status": "confirmed"
 }
 ```
