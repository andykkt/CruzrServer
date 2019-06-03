// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-robot';

// Port where we'll run the websocket server
var webSocketsServerPort = 1337;

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');

/**
 * Global variables
 */
// latest 100 messages
var history = [ ];
// list of currently connected clients (users)
var clients = [ ];
var remotes = [ ];
var robots = [ ];

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
    // Not important for us. We're writing WebSocket server, not HTTP server
});
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

    // accept connection - you should check 'request.origin' to make sure that
    // client is connecting from your website
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    var connection = request.accept(null, request.origin); 
    // we need to know client index to remove them on 'close' event
    var index = clients.push(connection) - 1;
    var userName = false;
    var userType = false;
    var typeIndex = false;

    console.log((new Date()) + ' Connection accepted.');

    // send back chat history
    if (history.length > 0) {
        connection.sendUTF(JSON.stringify( { type: 'history', data: history} ));
    }

    // user sent some message
    connection.on('message', function(message) {
        console.log('message.type' + message.type);
        if (message.type === 'utf8') { // accept only text
            let command = JSON.parse(message.utf8Data);
            let commandId = command.commandId
            let parameters = command.parameters

            console.log(command);
            console.log('commandId: ' + commandId);
            
            switch (commandId) {
                case 1: // Add User
                    let user = parameters[0]
                    userName = user.name
                    userType = user.type
                    var obj = {
                        client: clients[index],
                        user: user
                    }
                    typeIndex = remotes.push(obj) - 1
                    console.log('Added remote: ' + userName);
                    break;
                case 2: // Add Robot
                    let robot = parameters[0]
                    userName = robot.name
                    userType = robot.type
                    var obj = {
                        client: clients[index],
                        user: robot
                    }
                    typeIndex = robots.push(obj) - 1
                    console.log('Added robot: ' + userName);
                    break;
                default:
                    console.log('Unknown command Id: ' + commandId);
                    console.log(' Received Message from '
                            + userName + ': ' + message.utf8Data);

                    // we want to keep history of all sent messages
                    var obj = {
                        time: (new Date()).getTime(),
                        author: userName,
                        text: message.utf8Data
                    };
                    // broadcast message to all connected clients
                    var json = JSON.stringify({ type:'command', data: obj });

                    if (userType === "remote") {
                        for (var i=0; i < robots.length; i++) {
                            robots[i].client.sendUTF(json);
                        }
                    } else {
                        for (var i=0; i < remotes.length; i++) {
                            remotes[i].client.sendUTF(json);
                        }
                    }
            }
        }
    });

    // user disconnected
    connection.on('close', function(connection) {
        if (userName !== false) {
            console.log((new Date()) + " Peer "
                + connection.remoteAddress + " disconnected.");
            // remove user from the list of connected clients
            clients.splice(index, 1);
            if (userType === "remote") {
                remotes.splice(typeIndex, 1);
            } else {
                robots.splice(typeIndex, 1);
            }
        }
    });

});