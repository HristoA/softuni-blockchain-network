module.exports = function(app, Node) {
    /**
     * Return transaction info by hash of transaction
     */
    app.get('/transaction/:hash', function(req, res) {
        hash = req.params['hash'];
        const transaction = Node.pendingTransactions.find(function(transaction){ return transaction.hash == hash });
        res.setHeader('Content-Type', 'application/json');

        if(transaction){
            res.status(200).json(transaction)
        }else{
            res.status(404)
            res.send({"error" : "Not Found"})
            res.end()
        }
    })

    /**
     * Return transaction info by hash of transaction
     */
    app.get('/transactions/pending', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
            "count" : Node.pendingTransactions.length,
            "transactions" : Node.pendingTransactions,
        })
    })

    /**
     * Make transaction
     */
    app.post('/transaction', function(req, res) {
        res.setHeader('Content-Type', 'application/json');

        var from        = req.body.from;
        var to          = req.body.to;
        var value       = req.body.value;
        var fee         = req.body.fee;
        var timestamp   = req.body.timestamp;
        var pubKey      = req.body.pubKey;
        var signature   = req.body.signature;

        var transactionHash = Node.calculateSHA256({from, to, value, fee, timestamp, pubKey, signature});

        //Check for doblicates transaction
        const transactionExist = Node.pendingTransactions.find(function(transaction){ return transaction.hash == transactionHash });

        if(transactionExist) {
            res.status(409)//Conflict with server logic
            res.send({"error" : "The same transaction already exist"})
            res.end()
        } else {
            //Add to pending transaction that will be included in next block
            Node.pendingTransactions.push({
                "from"  : from,
                "to"    : to,
                "value" : value,
                "fee"   : fee,
                "timestamp" : timestamp,
                "pubKey"    : pubKey,
                "signature" : signature,
                "hash"      : transactionHash,
                "block"     : "undefined",
                "status"    : "pending",
            })

            res.status(201).json({
                "message"   : "success",
                "hash"      : transactionHash
            })
            res.end()
        }
    })
}