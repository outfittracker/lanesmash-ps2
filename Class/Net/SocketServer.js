/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */

const ws      = require('websocket').server;
const http    = require('http');
const https   = require('https');
const fs       = require('fs');


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
                console.info("Starting server in SECURE mode");
                SocketServer.serverEndpoint = https.createServer({
                    key:    fs.readFileSync(keyFile),
                    cert:   fs.readFileSync(certFile)
                },function(request,response){

                });
            }
            else{
                console.info("Starting server in INSECURE mode");
                SocketServer.serverEndpoint = http.createServer();
            }


        }
        catch(error) {
            console.info("Failed to start server: "+error);
            return false;
        }



        let port = SocketServer.getPort();

        console.info("Starting port "+port);
        SocketServer.serverEndpoint.listen(port,() => {
            console.info("Socket server port "+port+" open");
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
                        console.log(message.utf8Data);
                        console.error(err);
                        cn.send(JSON.stringify({error: 'Not JSON'}));
                    }
                }
            });

            cn.on('close',(con,closeReason,description) => {
                console.info("Server connection close "+closeReason+" "+description);
                return closeCallback(cn,pathx);
            });

            cn.on('error',(err) => {
                console.info("Server connection error "+err);
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