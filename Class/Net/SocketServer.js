/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const ws      = require('websocket').server;
const http    = require('http');
const https   = require('https');
const fs       = require('fs');
const ScreenLog = require("../ScreenLog");


class SocketServer {

    /**
     *
     */
    static getPort(){
        return process.env.SOCKETPORT;
    }

    /**
     *
     * @param messageCallback
     * @param closeCallback
     */
    static start(messageCallback,closeCallback){

        try {

            const keyFile = process.env.KEY_PATH;
            const certFile = process.env.CERTIFICATE_PATH;

            if(fs.existsSync(keyFile)){
                ScreenLog.log("Starting server in SECURE mode");
                SocketServer.serverEndpoint = https.createServer({
                    key:    fs.readFileSync(keyFile),
                    cert:   fs.readFileSync(certFile)
                },function(request,response){

                });
            }
            else{
                ScreenLog.log("Starting server in INSECURE mode");
                SocketServer.serverEndpoint = http.createServer();
            }


        }
        catch(error) {
            ScreenLog.log("Failed to start server: "+error);
            return false;
        }



        let port = SocketServer.getPort();

        ScreenLog.log("Starting port "+port);
        SocketServer.serverEndpoint.listen(port,() => {
            ScreenLog.log("Socket server port "+port+" open");
        });

        SocketServer.socketEndpoint  = new ws({httpServer: SocketServer.serverEndpoint});

        SocketServer.socketEndpoint.on('request',(request) => {

            const cn = request.accept(null,request.origin);
            const pathx = request.resourceURL.pathname.substr(1,request.resourceURL.pathname.length-1);
            cn.identifier = SocketServer.connectionId;
            SocketServer.connectionId++;

            if(messageCallback) messageCallback(cn,pathx,null);

            cn.on('message',(message) => {
                if(message.type === 'utf8'){
                    try {
                        let json = JSON.parse(message.utf8Data);
                        if(messageCallback) return messageCallback(cn,pathx,json);
                    }
                    catch(err) {
                        ScreenLog.log(message.utf8Data);
                        cn.send(JSON.stringify({error: err}));
                    }
                }
            });

            cn.on('close',(con,closeReason,description) => {
                ScreenLog.log("Server connection close "+closeReason+" "+description);
                return closeCallback(cn,pathx);
            });

            cn.on('error',(err) => {
                ScreenLog.log("Server connection error "+err);
                return closeCallback(cn,pathx);
            });
        });


        return true;
    }

    static stop(){
        return SocketServer.socketEndpoint ? SocketServer.socketEndpoint.closeAllConnections() : true;
    }


}
SocketServer.serverEndpoint = null;
SocketServer.socketEndpoint = null;
SocketServer.connectionId = 1;
module.exports = SocketServer;