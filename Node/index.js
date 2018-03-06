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
        ws.on('open', $this.initConnection(ws));
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

    var closeConnection = function(ws) {
        $this.console('initConnection', 'connection failed to peer: ' + ws.url);
        $this.sockets.splice($this.sockets.indexOf(ws), 1);
    };

    ws.on('close', closeConnection(ws));
    ws.on('error', closeConnection(ws));

    ws.send(JSON.stringify({'type': MessageType.QUERY_LATEST}));
}

/**
 * Pear To Pear confection between Nodes
 */
Node.prototype.initP2P = function(){
    var $this = this;
    this.server = new WebSocket.Server({port: p2pPort});
    this.server.on('connection', function(ws) { $this.initConnection(ws) });

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
    var receivedBlocks      = JSON.parse(message.data).sort(function(b1, b2){ (b1.index - b2.index) });
    var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    var latestBlockHeld     = this.getLatestBlock();

    if (latestBlockReceived.index > latestBlockHeld.index) {
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
    return [ this.blockchain[this.blockchain.length - 1] ];
};

/**
 * SHA256 hash of given block
 * @param block
 */
Node.prototype.calculateHashForBlock = function(block){
    return CryptoJS.SHA256(block.index + block.previousHash + block.timestamp + block.data +  block.hash +  block.difficulty +  block.nonce).toString();
};

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
    return {
        "index"         : "0", //Index of block
        "previousHash"  : "0", //Previous Hash
        "timestamp"     : (new Date().getTime()), //Timestamp
        "data"          : "Genesis block!!!", //Data
        "hash"          : "aad1596846d2dda1591d92216029eb068c79c4a25f6d0a1ef37739d4af4cb3df", //Hash
        "difficulty"    : "0", //Difficulty
        "nonce"         : "0" //Nonce
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