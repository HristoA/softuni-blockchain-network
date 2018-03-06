module.exports = function(app, Node) {
    /**
     * Return all transaction for address and balances
     */
    app.get('/balance/:addr', function(req, res) {
        res.setHeader('Content-Type', 'application/json');

        var address         = req.params['addr'];
        var addrTransaction = [];//all transaction for address
        var balance         = 0;//Balance of address
        var balancePending  = 0;

        //@TODO: Optimisation and caching of this loop
        Node.blockchain.forEach( function(block){
            block.transactions.forEach(function(transaction){
                if(transaction.from == address || transaction.to == address) {
                    addrTransaction.push(transaction);

                    if(transaction.status == "confirmed")  {
                        if(transaction.from == address){
                            balance -= transaction.value;
                        } else {
                            balance += transaction.value;
                        }
                    } else {
                        if(transaction.from == address){
                            balancePending -= transaction.value;
                        } else {
                            balancePending += transaction.value;
                        }
                    }
                }
            })
        });

        res.status(200).json({
            "address" : address,
            "baalnce" : balance,
            "pendingBalance" : balancePending,
            "transactions" : addrTransaction,
        })
    })
}