# Own Blockchain Network

Implementation of simple fully functional blockchain network with: nodes, miners, wallet, faucet and blockchain explorer
The project is created for education and is not polished for production uses.

## Run Node

```
cd ./Node
npm install
npm start
```

## Run Node in DEBUG mode

```
cd ./Node
npm install
npm startInDebug
```

## Available Endpoints

| URL | METHODS | DESCRIPTION |
| ------ | ------ | ------ |
|/peers  | GET  | Returns array of peers |
|/peers  | POST | Add peer to array of peers |
|/blocks | GET  | Returns all blocks in network |
|/blocks/:index  | GET | Returns block for specific index |
|/blocks/:hash  | GET | Returns block for specific hash |
