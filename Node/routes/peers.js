module.exports = function(app, Node) {
    /**
     * Get Peers
     */
    app.get('/peers', function(req, res){
        res.send(
            Node.sockets.map(function(s) { return s._socket.remoteAddress + ':' + s._socket.remotePort})
        );
    });

    /**
     * Add new peer
     */
    app.post('/peers', function(req, res){
        Node.connectToPeers([req.body.peer]);
        res.send();
    });
}