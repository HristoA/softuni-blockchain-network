module.exports = function(app, Node) {
    /**
     * Return block for mining
     * - addr: Address of miner where reward will be gain
     */
    app.get('/mining/:addr', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(
            Node.getMiningJob(req.params['addr'])
        )
    })

    app.post('/mining/:addr', function(req, res) {
        res.setHeader('Content-Type', 'application/json');

        const minerAddr = req.params['addr'];
        const status    = Node.submitBlock(req.body.nonce, req.body.blockHash, minerAddr);

        if(status) {
            res.status(200).json({
                "status"    : "accepted",
                "message"   : "Block accepted. You get: " + Node.minersJobs[minerAddr].reward + " coins."
            })
        } else {
            res.status(400).json({"message": "error"})
        }
    })
}