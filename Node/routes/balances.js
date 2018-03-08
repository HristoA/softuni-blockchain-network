module.exports = function(app, Node) {
    /**
     * Return all transaction for address and balances
     */
    app.get('/balance/:addr', function(req, res) {
        res.setHeader('Content-Type', 'application/json');

        var response = Node.getBalance(req.params['addr']);

        res.status(200).json(response)
    })
}