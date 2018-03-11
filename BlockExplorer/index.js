'use strict';

var express     = require('express');
var bodyParser  = require('body-parser');
var path        = require('path');
var twig        = require('twig');
var request     = require('request');
var debug       = require('debug');

class BlockchainExplorer {
    constructor(){
        this.httpPort = process.env.HTTP_PORT || 9191;
        this.nodeURL = process.env.NODE_URL || "http://localhost:3001";

        this.init();
    }
}

BlockchainExplorer.prototype.init = function(){
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
        var uri = $this.nodeURL + '/blocks';
        $this.console("HOME", "Get blocks from NODE: " + uri);

        request({
            "uri": uri,
            "method": "GET",
            "json": true
        }, function(error, response, body) {

            if (error) {
                $this.console("HOME", "Node return error: " + error)
                return {};
            }

            res.render('index', { "blocksList" : body });
        });
    });

    app.get('/pending', function(req, res){

    });

    app.get('/view-accounts', function(req, res){

    });

    app.get('/view-peers', function(req, res){
        var uri = $this.nodeURL + '/peers';
        $this.console("VIEW_PEERS", "Get blocks from NODE: " + uri);

        request({
            "uri": uri,
            "method": "GET",
            "json": true
        }, function(error, response, body) {

            if (error) {
                $this.console("VIEW_PEERS", "Node return error: " + error)
                return {};
            }

            res.render('view-peers', { "peersList" : body });
        });
    });

    app.listen(this.httpPort);

    this.console("INIT", "Server listing on: " + this.httpPort)
}


/**
 * Used to control and display debug information
 * @param type
 * @param message
 */
BlockchainExplorer.prototype.console = function(type, message){
    debug(type)(message);
};

//Start Blockchain Explorer
var explorer = new BlockchainExplorer();

module.exports = BlockchainExplorer;