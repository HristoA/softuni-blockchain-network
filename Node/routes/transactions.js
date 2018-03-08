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
     * Return pending transactions
     */
    app.get('/transactions/pending', function(req, res) {
            res.status(200).json(Node.pendingTransactions)
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
        var hash        = req.body.hash;

        var receivedTransHash = Node.calculateSHA256([from, to, value, fee, timestamp]);

        /**
         * Verify transaction
         * - Transaction hash that is received is the same as calculated one of bock
         * -
         */
        if( receivedTransHash != hash || !Node.isValidSignature(hash, signature, pubKey) ){
            res.status(409)//Conflict with server logic
            res.send({
                "error"             : "Transaction verification fail",
                "receivedTransHash" : receivedTransHash,
                "hash"              : hash,
                "signature"         : signature,
                "pubKey"            : pubKey
            })
            res.end()
        } else {
            //Check for duplicates transaction
            const transactionExist = Node.pendingTransactions.find(function (transaction) {
                return transaction.hash == receivedTransHash
            });

            if (transactionExist) {
                res.status(409)//Conflict with server logic
                res.send({
                    "status" : "error",
                    "message": "The same transaction already exist"
                })
                res.end()
            } else {
                var balanceData = Node.getBalance(from);

                //Verify that sender have the money in balance
                if(balanceData.balance < value){
                    res.status(409)//Conflict with server logic
                    res.send({
                        "status" : "error",
                        "message": "You only have: " + balanceData.balance + " and try to send: " + value + " coins!"
                    })
                    res.end()
                } else {
                    //Add to pending transaction that will be included in next block
                    Node.pendingTransactions.push({
                        "from"      : from,
                        "to"        : to,
                        "value"     : value,
                        "fee"       : fee,
                        "timestamp" : timestamp,
                        "pubKey"    : pubKey,
                        "signature" : signature,
                        "hash"      : hash,
                        "block"     : "undefined",
                        "status"    : "pending",
                    })

                    res.status(201).json({
                        "status"  : "success",
                        "message" : "Successful create transaction with hash: " + hash,
                    })
                    res.end()
                }
            }
        }
    })
}