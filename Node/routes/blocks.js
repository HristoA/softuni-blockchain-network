module.exports = function(app, Node) {
    /**
     * Return all blocks from network
     */
    app.get('/blocks', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(Node.blockchain)
    })

    /**
     * Return block by index or hash
     */
    app.get('/blocks/:index', function(req, res) {
        index = req.params['index'];
        const block = Node.blockchain.find(function(block){ return block.index == index.toString() ||  block.hash == index });
        res.setHeader('Content-Type', 'application/json');

        if(block){
            res.status(200).json(block)
        }else{
            res.status(404)
            res.end()
        }
    })
}