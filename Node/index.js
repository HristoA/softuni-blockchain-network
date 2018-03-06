'use strict';

var CryptoJS    = require("crypto-js");
var express     = require("express");
var bodyParser  = require('body-parser');
var WebSocket   = require("ws");
var fs          = require('fs');
var path        = require('path');
var debug       = require('debug');

var httpPort        = process.env.HTTP_PORT || 3001;
var p2pPort         = process.env.P2P_PORT  || 6001;
var initialPeers    = process.env.PEERS ? process.env.PEERS.split(',') : [];
var MessageType     = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};

class Node {
    constructor(setBlockchainId){
        this.blockchain = [];
        this.folder     = 'data';
        this.blockchain = [];
        this.sockets    = [];
        this.difficulty = 1;//Start difficulty of network
        this.blockReward= 24; //Reward coin for miners
        this.minersJobs = []; //Hold all miners address and him jobs
        this.pendingTransactions = [];
        this.setBlockchainId(setBlockchainId);//@TODO: Implement saving of blockchain and Peers list to file system

        //Make Genesis block. @TODO: Make genesis block only in first run and read from file system after that
        this.blockchain.push(this.getGenesisBlock());

        /**
         * Start main processes
         */
        this.connectToPeers(initialPeers);
        this.initP2P();
        this.initHttpServer();
    }
}

Node.prototype.initHttpServer = function(){
    var $this = this;
    var app   = express();

    app.use(bodyParser.urlencoded({ extended: false }))// Value can be string or array
    app.use(bodyParser.json()); //Support JSON encoded body

    /**
     * Load all routes files:
     * - Peers
     * - Blocks
     * - Transactions
     * - Balance
     * - Mining
     * - Version
     */
    this.recursiveRoutes('routes', app);

    app.listen(httpPort, function(){
        $this.console('initHttpServer', 'Server running on port: ' + httpPort + '...')
    });
};

/**
 * Connect to Peers
 * @param peers
 */
Node.prototype.connectToPeers = function(peers){
    var $this = this;

    peers.forEach(function(peer){
        var ws = new WebSocket(peer);
        ws.on('open',  function(){ $this.initConnection(ws) });
        ws.on('error', function(){
            $this.console('connectToPeers', 'connection failed')
        });
    });
};

/**
 * Initialize WebSocket connection
 * @param ws
 */
Node.prototype.initConnection = function(ws){
    var $this = this;
    this.sockets.push(ws);

    ws.on('message', function(data) {
        var message = JSON.parse(data);
        $this.console('initConnection', 'Received message' + JSON.stringify(message));

        switch (message.type) {
            case MessageType.QUERY_LATEST:
                ws.send(
                    JSON.stringify({
                        'type': MessageType.RESPONSE_BLOCKCHAIN,
                        'data': JSON.stringify($this.getLatestBlock())
                    })
                );
                break;
            case MessageType.QUERY_ALL:
                ws.send(
                    JSON.stringify({'type': MessageType.QUERY_LATEST})
                );
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                $this.handleBlockchainResponse(message);
                break;
        }
    });

    ws.on('close',  function() { $this.closeConnection(ws, 'close') });
    ws.on('error',  function() { $this.closeConnection(ws, 'error') });

    ws.send(JSON.stringify({'type': MessageType.QUERY_LATEST}));
}

Node.prototype.closeConnection = function(ws, type){
    this.console('initConnection', 'Connection ' + type + ' to peer' );
    this.sockets.splice(this.sockets.indexOf(ws), 1);
};

/**
 * Pear To Pear confection between Nodes
 */
Node.prototype.initP2P = function(){
    var $this = this;
    this.server = new WebSocket.Server({port: p2pPort});
    this.server.on('connection', function(ws){ $this.initConnection(ws) });

    this.console('initP2P', 'Listening websocket p2p port on: ' + p2pPort);
};

/**
 * Allow running #X number of blockchain network in local machine with using different blockchain IDs
 * @param blockchainId
 */
Node.prototype.setBlockchainId = function(blockchainId){
    this.blockchainId       = blockchainId ? blockchainId : 'default';
    this.blockchainFolder   = "'" + this.folder  + "/" + this.blockchainId +"'";
};

Node.prototype.handleBlockchainResponse = function(message){
    var receivedBlocks      = [JSON.parse(message.data)].sort(function(b1, b2){ (b1.index - b2.index) });
    var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    var latestBlockHeld     = this.getLatestBlock();

    if (latestBlockReceived.index > latestBlockHeld.index ) {
        this.console('handleBlockchainResponse', 'blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);

        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            this.console('handleBlockchainResponse', "We can append the received block to our chain");
            this.blockchain.push(latestBlockReceived);
            this.broadcast(this.responseLatestMsg());
        } else if (receivedBlocks.length === 1) {
            this.console('handleBlockchainResponse', "We have to query the chain from our peer");
            this.broadcast({'type': MessageType.QUERY_ALL});
        } else {
            this.console('handleBlockchainResponse', "Received blockchain is longer than current blockchain");

            if (this.isValidChain(receivedBlocks) && receivedBlocks.length > blockchain.length) {
                this.console('handleBlockchainResponse', 'Received blockchain is valid. Replacing current blockchain with received blockchain');
                this.blockchain = receivedBlocks;
                this.broadcast(this.responseLatestMsg());
            } else {
                this.console('handleBlockchainResponse', 'Received blockchain invalid');
            }
        }
    //Replace genesis block only in peers nodes not i master one
    }else if(latestBlockHeld.index == 0 && initialPeers.length != 0) {
        this.console('handleBlockchainResponse', 'Received blockchain is genesis and is valid. Replacing current blockchain with received blockchain');
        this.blockchain = receivedBlocks;
    } else {
        this.console('handleBlockchainResponse', 'received blockchain is not longer than current blockchain. Do nothing');
    }
};

/**
 * Validate chain of blocks
 *
 * @param blockchainToValidate
 * @returns {boolean}
 */
Node.prototype.isValidChain = function(blockchainToValidate){
    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(this.getGenesisBlock())) {
        return false;
    }

    var tempBlocks = [blockchainToValidate[0]];

    for (var i = 1; i < blockchainToValidate.length; i++) {
        if (this.isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
            tempBlocks.push(blockchainToValidate[i]);
        } else {
            return false;
        }
    }
    return true;
};

/**
 * Verify submitted new block to network
 * @param newBlock
 * @param previousBlock
 * @returns {boolean}
 */
Node.prototype.isValidNewBlock = function(newBlock, previousBlock){
    if (previousBlock.index + 1 !== newBlock.index) {
        this.console('isValidNewBlock', 'invalid index');
        return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
        this.console('isValidNewBlock', 'invalid previous hash');
        return false;
    } else if (this.calculateHashForBlock(newBlock) !== newBlock.hash) {
        this.console('isValidNewBlock', typeof (newBlock.hash) + ' ' + typeof this.calculateHashForBlock(newBlock));
        this.console('isValidNewBlock', 'invalid hash: ' + this.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
        return false;
    }
    return true;
};

/**
 * Send mining job to miner that request it
 * @param address
 * @returns {*}
 */
Node.prototype.getMiningJob = function(address){
    /**
     * Check if miner has old info and need upadate.
     */
    if(
        typeof this.minersJobs[address] != "undefined"
        && this.pendingTransactions.length == this.minersJobs[address].transCounter
        && (this.minersJobs[address].index -1) == this.getLatestBlock().index
    )
    {
        var response = this.minersJobs[address];
        delete response.transactions;

        return {
            "status" : "old",
            "data" : this.minersJobs[address]
        }
    }

    var blockReward     = this.blockReward;
    var newBlockIndex   = this.getLatestBlock().index + 1;

    var jobTrans        = this.pendingTransactions;
    var now             = new Date().getTime();
    var transactionHash = this.calculateSHA256([
        "network",
        address,
        blockReward,
        0,
        now,
        "network",
        "network",
    ]);

     jobTrans.unshift({
        "from"  : "network",
        "to"    : address,
        "value" : blockReward,
        "fee"   : 0,
        "timestamp" : now,
        "pubKey"    : "network",
        "signature" : "network",
        "hash"      : transactionHash,
        "block"     : newBlockIndex,
        "status"    : "confirmed"
    })
    this.pendingTransactions = this.pendingTransactions.filter(function(item){ item.status == 'pending'});

    var prevBlockHash = this.calculateHashForBlock(this.getLatestBlock());
    var difficulty    = this.difficulty;
    var blockDataHash = this.calculateSHA256({newBlockIndex, jobTrans, difficulty, prevBlockHash, address});

    this.minersJobs[address] = {
        "index"         : newBlockIndex, //Index of new block that are mined right now
        "transactions"  : jobTrans, // All the time will have transCounter + 1 here
        "transCounter"  : this.pendingTransactions.length, //Will be used from miner how many trans process and when to want new
        "difficulty"    : this.difficulty,
        "prevBlockHash" : prevBlockHash,
        "blockDataHash" : blockDataHash,
        "reward"        : blockReward
    };

    var response = this.minersJobs[address];
    delete response.transactions;

    return {
        "status" : "new",
        "data" : this.minersJobs[address]
    }
}


Node.prototype.submitBlock = function(nonce, timestamp, newBlockHash, minnerAddr){

    var job               = this.miningJobs[minnerAddr];
    var blockDataHash     = job.blockDataHash;
    var blockHashForCheck = this.calculateSHA256({blockDataHash, nonce});

    var blockStart        = newBlockHash.substr(0, job.difficulty);
    var validStartOfHash  = '0'.repeat(job.difficulty);

    /**
     * - Hash of the new block is the same as hash that we send to miner
     * - Validate that new Block start with needed difficulty
     * - Index of new block is correct
     */
    if(
        blockHashForCheck == blockDataHash
        && blockStart == validStartOfHash
        && job.index == (this.getLatestBlock().index + 1)
    ){
        var newBlock = {
            "index"         : job.index,
            "previousHash"  : job.prevBlockHash,
            "timestamp"     : timestamp,
            "transactions"  : job.transactions,
            "hash"          : newBlockHash,
            "mynedBy"       : minnerAddr,
            "difficulty"    : job.difficulty,
            "nonce"         : nonce,
        }

        newBlock.transactions.forEach(function(i, item){
            newBlock.transactions[i].block  = newBlock.index;
            newBlock.transactions[i].status = "confirmed";
        });

        var transactions = JSON.stringify(newBlock.transactions);

        //Remove mined transaction from list
        this.pendingTransactions = this.pendingTransactions.filter(function(trans) {
            if(transactions.indexOf(trans.hash) !== -1){
                return;
            }
        });

        this.blockchain.push(newBlock);

        this.broadcast(this.responseLatestMsg());

        return true;
    }

    return false;
}

/**
 * Send last block that are available in blockchain
 * @returns {{type: number, data: string}}
 */
Node.prototype.responseLatestMsg = function(){
    return {
        'type': MessageType.RESPONSE_BLOCKCHAIN,
        'data': JSON.stringify(this.getLatestBlock())
    };
};

/**
 * Send message to all sockets
 * @param message
 */
Node.prototype.broadcast = function(message){
    this.sockets.forEach(function(ws){
        ws.send(JSON.stringify(message));
    });
};

/**
 * Return last block from blockchain
 * @returns {*[]}
 */
Node.prototype.getLatestBlock = function(){
    return this.blockchain[this.blockchain.length - 1];
};

/**
 * SHA256 hash of given block
 * @param block
 */
Node.prototype.calculateHashForBlock = function(block){
    return CryptoJS.SHA256(block.index + block.previousHash + block.timestamp + JSON.stringify(block.transactions) +  block.hash +  block.difficulty +  block.nonce).toString();
};

Node.prototype.calculateSHA256 = function(object){
    return CryptoJS.SHA256(JSON.stringify(object).replace(/\s/g, "")).toString();
}

/**
 * Require all routes files from folder "routes"
 * @param folderName
 * @param app
 */
Node.prototype.recursiveRoutes = function(folderName, app) {
    var $this = this;

    fs.readdirSync(folderName).forEach(function(file) {

        var fullName = path.join(folderName, file);
        var stat     = fs.lstatSync(fullName);

        if (stat.isDirectory()) {
            $this.recursiveRoutes(fullName, app);
        } else if (file.toLowerCase().indexOf('.js')) {
            require('./' + fullName)(app, $this);
            $this.console("recursiveRoutes", "require('" + fullName + "')");
        }
    });
}

/**
 * Genesis block
 */
Node.prototype.getGenesisBlock = function(){
    var now = new Date().getTime();
    var transactionHash = this.calculateSHA256([
        "genesis",
        "genesis",
        69,
        0,
        now,
        "genesis",
        "genesis",
    ]);

    return {
        "index"         : 0, //Index of block
        "previousHash"  : "0", //Previous Hash
        "timestamp"     : now, //Timestamp
        "transactions"  : [{
            "from"  : "genesis",
            "to"    : "genesis",
            "value" : 69,
            "fee"   : 0,
            "timestamp" : now,
            "pubKey"    : "genesis",
            "signature" : "genesis",
            "hash"      : transactionHash,
            "block"     : 0,
            "status"    : "confirmed"
        }], //Transactions
        "hash"          : "aad1596846d2dda1591d92216029eb068c79c4a25f6d0a1ef37739d4af4cb3df", //Hash of current block: index, transactions, difficulty, prevBlockHash, mynedBy
        "mynedBy"       : "genesis",
        "difficulty"    : 0, //Difficulty
        "nonce"         : 0 //Nonce
    }
};

/**
 * Used to control and display debug information
 * @param type
 * @param message
 */
Node.prototype.console = function(type, message){
    debug(type)(message);
};

//Start Node
var node = new Node(1);

module.exports = Node;