const HTTPS_PORT = 9443;
const express = require('express');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');



// ========================================================

const app = express();
const server = https.createServer(options, app);
const expressWs = require('express-ws')(app, server);
const wss = expressWs.getWss();
const config = require('./webpack.config.js');
const compiler = webpack(config);

// Tell express to use the webpack-dev-middleware and use the webpack.config.js
// configuration file as a base.
app.use(webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
}));

app.ws('/', function(ws, req) {
    ws.on('message', function(message) {
        // Broadcast any received message to all clients
        console.log('received: %s', message);
        broadcast(message);
    });
});

const broadcast = function(data) {
    wss.clients.forEach(function(client) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

// Serve the files on port 3000.
server.listen(HTTPS_PORT, function () {
    console.log('Example app listening on port '+ HTTPS_PORT +' !\n');
});
