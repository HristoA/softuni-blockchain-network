# Own Blockchain Network

Implementation of simple fully functional blockchain network with: nodes, miners, wallet, faucet and blockchain explorer
The project is created for education and is not polished for production uses.

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

## Available Endpoints

| URL | METHODS | DESCRIPTION |
| ------ | ------ | ------ |
|/peers  | GET  | Returns peers list |
|/peers  | POST | Add peer to list of peers |
|/blocks | GET  | Returns all blocks in network |
|/blocks/:index  | GET | Returns block for specific index |
|/blocks/:hash  | GET | Returns block for specific hash |
|/transaction/:hash | GET | Returns transaction info for specific transaction hash |
| /transactions/pending | GET | Returns all pending transactions |
| /balance/:addr | GET | Returns balances and transaction history for address |  
| /mining/:addr | GET | Return
