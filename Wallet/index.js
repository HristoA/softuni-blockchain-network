'use strict';

var CryptoJS    = require("crypto-js");
var express     = require('express');
var bodyParser  = require('body-parser');
var twig        = require('twig');
var path        = require('path');
var fs          = require('fs');
var ec          = require('elliptic').ec;
var request     = require('request');
var debug       = require('debug');

var EC          = ec('secp256k1');

class Wallet {
    constructor(){
        this.httpPort           = process.env.HTTP_PORT || 9090;
        this.nodeURL            = process.env.NODE_URL || "http://localhost:3001";
        this.privateKeyLocation = "wallets/" + (process.env.PRIVATE_KEY_LOCATION || 'wallet');
        this.isFaucetWallet     = process.env.FAUCET || false;
        this.walletBalanceCache = 0;
        this.initWallet();
        this.init();
    }
} 

Wallet.prototype.init = function(){
    var $this = this;
    var app   = express();

    twig.cache(false)
    app.set('view engine', 'twig');
    app.set('views', path.join(__dirname, 'views'));
    app.set('view cache', false);
    app.set("twig options", { strict_variables: false });
    app.use(express.static('public'))
    app.use(bodyParser.urlencoded({ extended: false }))// Value can be string or array
    app.use(bodyParser.json()); //Support JSON encoded body

    app.get('/', function(req, res){
        var uri = $this.nodeURL + '/balance/' + $this.getAddress();
        $this.console("getBalance", "Get balance from NODE for: " + uri);

        request({
            "uri": uri,
            "method": "GET",
            "json": true
        }, function(error, response, body) {

            if (error) {
                $this.console("getBalance", "Node return error: " + error)
                return {};
            }
            $this.console("getBalance", "Data" + JSON.stringify(body))

            $this.walletBalanceCache = body.balance;

            res.render('index', {
                "isFaucet"       : $this.isFaucetWallet,
                "address"        : body.address,
                "balance"        : body.balance,
                "pendingBalance" : body.pendingBalance,
                "transactions"   : body.addrTransaction,
            });
        });
    });

    app.post('/send', function(req, res){

        var toAddress       = req.body.address;
        var valueToAddress  = req.body.value;
        var uri             = $this.nodeURL + '/transaction';
        var timestamp       = (new Date).getTime();
        var transactionHash = $this.calculateSHA256([$this.getAddress(), toAddress, parseInt(valueToAddress), 0, timestamp]);

        if($this.isFaucetWallet == "true" && parseInt(valueToAddress) > 10) {
            res.status(200)
            res.send({
                "status": "error",
                "message": "Faucet limit is 10 coins"
            })
            res.end()
        } else if($this.walletBalanceCache <  parseInt(valueToAddress)){
            res.status(200)
            res.send({
                "status": "error",
                "message": "Wallet not have enough coins!"
            })
            res.end()
        } else {
            request({
                "uri": uri,
                "method": "POST",
                "json": {
                    "from": $this.getAddress(),
                    "to": toAddress,
                    "value": parseInt(valueToAddress),
                    "fee": 0,
                    "timestamp": timestamp,
                    "pubKey": $this.getPublicFromWallet(),
                    "signature": $this.getSignature(transactionHash),
                    "hash": transactionHash
                }
            }, function (error, response, body) {

                if (error) {
                    $this.console("getBalance", "Node return error: " + error)
                    return {};
                }

                $this.console("getBalance", "Get data: " + JSON.stringify(body));

                res.status(200)
                res.send({
                    "status" : body.status,
                    "message": body.message
                })
                res.end()
            });
        }
    })

    app.listen(this.httpPort);

    this.console("INIT", "Server listing on: " + this.httpPort)
}


Wallet.prototype.getAddress = function(){
    return CryptoJS.RIPEMD160(this.getPublicFromWallet()).toString();
}

Wallet.prototype.getSignature = function(hashString){
    var key = EC.keyFromPrivate(this.getPrivateFromWallet());
    return key.sign(hashString).toDER('hex');
}

Wallet.prototype.getPrivateFromWallet = function(){
    var buffer = fs.readFileSync(this.privateKeyLocation, 'utf8');
    return buffer.toString();
}

Wallet.prototype.getPublicFromWallet = function(){
    var privateKey = this.getPrivateFromWallet();
    var key        = EC.keyFromPrivate(privateKey, 'hex');

    return key.getPublic().encode('hex');
}

Wallet.prototype.generatePrivateKey = function(){
    var keyPair    = EC.genKeyPair();
    var privateKey = keyPair.getPrivate();

    return privateKey.toString(16);
}

Wallet.prototype.initWallet = function(){
    //Will not override existing wallet
    if (fs.existsSync(this.privateKeyLocation)) {
        return;
    }

    var newPrivateKey = this.generatePrivateKey();

    fs.writeFileSync(this.privateKeyLocation, newPrivateKey);
    this.console('initWallet', 'New wallet with private key created: %s', this.privateKeyLocation);
}

Wallet.prototype.calculateSHA256 = function(object){
    return CryptoJS.SHA256(JSON.stringify(object).replace(/\s/g, "")).toString();
}

/**
 * Used to control and display debug information
 * @param type
 * @param message
 */
Wallet.prototype.console = function(type, message){
    debug(type)(message);
};

//Start Wallet
var wallet = new Wallet();

module.exports = Wallet;