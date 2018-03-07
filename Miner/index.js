'use strict';

var CryptoJS  = require("crypto-js");
var request   = require('request');
var debug     = require('debug');

var minerAddr = process.env.MINNER_ADDR || "default";
var nodeUrl   = process.env.NO_URL || "http://localhost:3001";

var syncInterval = null;
var lastHashSpeedTiemstamp = null;

class Miner {
    constructor(){
        this.nodeUrl            = nodeUrl;
        this.minerAddr          = minerAddr;
        this.syncInterval       = 1000;
        this.hashSpeedInterval  = 10000;
        this.mineInterval       = 10;
        this.nonce              = 0;
        this.minerJob           = [];

        this.hashesToNow        = 0; //Number of processed hash
        this.lastHashes         = 0; //Number of hash proces last time when monitor of hash speed is run
        this.lastHashesTimestamp= (new Date()).getTime(); //Timestamp of last measurment

        this.sync();
        this.console("MINE", "Start mining...");
        this.mine();
        this.hashSpeed();
    }
}

/**
 * Sync miner withh node
 */
Miner.prototype.sync = function(loop = true){
    this.console("SYNC", "Start SYNC process")
    var $this = this;

    request({
        uri: this.nodeUrl + '/mining/' + this.minerAddr ,
        method: "GET",
        json: true
    }, function(error, response, body) {

        if (error && response.statusCode != 200) {
            $this.console("SYNC", "Node return error: " + error)
            return;
        }

        //Reset nonce on new transaction in block
        if(body.status == "new"){
            $this.nonce = 0;
        }

        $this.minerJob = body.data;

        $this.console("SYNC", "Success");
    });

    if(loop){
        setTimeout(function(){
            $this.sync();
        }, this.syncInterval)
    }
}


Miner.prototype.mine = function(){
    var $this = this;

    if(Object.keys($this.minerJob).length > 0)
    {
        var blockDataHash     = $this.minerJob.blockDataHash;
        var nonce             = $this.nonce;

        var blockHash         = this.calculateSHA256({blockDataHash, nonce});
        var blockStart        = blockHash.substr(0, $this.minerJob.difficulty);
        var validStartOfHash  = '0'.repeat($this.minerJob.difficulty);

        if( blockStart == validStartOfHash){
            //New block found!
            this.submitNewBlock($this.minerJob, blockHash, $this.nonce);
            $this.sync(false);
            $this.nonce = 0;
        }

        this.nonce++;
        this.hashesToNow++;
    }

    setTimeout(function(){
        $this.mine();
    }, this.mineInterval)
}

/**
 * Hash speed of miner
 */
Miner.prototype.hashSpeed = function(){
    var $this        = this;
    var now          = new Date().getTime();
    var timeInterval = (now - this.lastHashesTimestamp) / 1000;
    var hashSpeed    = Math.round((this.hashesToNow - this.lastHashes) / timeInterval );

    this.console("HASH_SPEED",  Math.round((this.hashesToNow - this.lastHashes) / timeInterval ) + " hash/s");

    this.lastHashes          = this.hashesToNow
    this.lastHashesTimestamp = now

    setTimeout(function(){
        $this.hashSpeed();
    }, this.hashSpeedInterval)
}

/**
 * Submit
 * @param minerJob
 * @param newBlockHash
 * @param nonce
 */
Miner.prototype.submitNewBlock = function(minerJob, newBlockHash, nonce){
    this.console("NEW_BLOCK", "Block found: | " + newBlockHash + " | nonce: " + nonce + " | difficulty: " + minerJob.difficulty)

    var $this = this;

    request({
        uri: this.nodeUrl + '/mining/' + this.minerAddr ,
        method: "POST",
        json: {
            "blockHash": newBlockHash,
            "nonce": nonce,
        }
    }, function(error, response, body) {

        $this.console("NEW_BLOCK", body);
    });
}

Miner.prototype.calculateSHA256 = function(object){
    return CryptoJS.SHA256(JSON.stringify(object).replace(/\s/g, "")).toString();
}

/**
 * Used to control and display debug information
 * @param type
 * @param message
 */
Miner.prototype.console = function(type, message){
    debug(type)(message);
};

//Start
new Miner();

module.exports = Miner;