/*
 *
 *     Aurelien Munoz <aurelien@boreal-business.net>
 *     Twitter : @aurelien_munoz
 *     Copyright 2017
 *
 */

/**
 * Created by debian on 24/01/17.
 */
'use strict';

const WebSocketClient     = require('websocket').client;
const schedule            = require('node-schedule');

class SocketClient {

    /**
     *
     * @param ocb
     * @param mcb
     * @param ccb
     * @param env
     */
    constructor(ocb,mcb,ccb,env){
        this.client = null;
        this.openCb = ocb;
        this.messageCb = mcb;
        this.closeCb = ccb;
        this.ready = false;
        this.connector = null;
        this.buffer = [];
        this.env = env;
    }

    /**
     *
     * @returns {String}
     */
    getEndPoint(){
        switch(this.env){
            case 'ps2:v2':       return 'wss://push.planetside2.com/streaming?environment=ps2&service-id=s:auraxisnetwork';
            case 'ps2ps4eu:v2':  return 'wss://push.planetside2.com/streaming?environment=ps2ps4eu&service-id=s:auraxisnetwork';
            case 'ps2ps4us:v2':  return 'wss://push.planetside2.com/streaming?environment=ps2ps4us&service-id=s:auraxisnetwork';
        }
    }

    /**
     *
     * @returns {*}
     */
    connect(){

        console.log("Connecting WSClient to daybreak server ...");
        this.startScheduler();

        if(this.client){
            this.connector.close();
            this.connector = null;
            this.client = null;
        }

        const timeout = setTimeout(() => {
            console.error("Connection timeout :(");
            process.exit();
        },2000);

        this.client = new WebSocketClient();
        this.client.on('connect',(wsCon) => {

            clearTimeout(timeout);
            this.connector = wsCon;
            this.ready = true;
            this.sendBuffer();

            console.log("WS Socket connected");

            if(this.openCb) this.openCb(this.connector);

            this.connector.on('message',(msg) => {
                if(this.messageCb) return this.messageCb(JSON.parse(msg.utf8Data));
            });

            this.connector.on('close',(reasonCode,description) => {
                console.log("Socket closed "+reasonCode+" "+description);
                this.ready = false;
                if(this.closeCb) this.closeCb();
                setTimeout(() => {
                    process.exit();
                },10000);
            });

            this.connector.on('error',(error) => {
                console.log("Socket client error "+error);
                this.ready = false;
                this.reconnect();
                if(this.closeCb) return this.closeCb();
            });

            return true;
        });

        const endpoint = this.getEndPoint();
        console.log("Connecting to "+endpoint+"... ");

        return this.client.connect(endpoint,null,null,null,{});
    }

    close(){
        console.log("Closing daybreak connection");
        return this.connector.close();
    }

    reconnect(){
        return setTimeout(() => {
            console.log("Socked closed, reconnecting ...");
            this.connect();
        },2000);
    }

    /**
     *
     */
    startScheduler(){
        return schedule.scheduleJob('*/20 0 * * * *',() => {
            if(this.ready) this.connector.ping("hello");
        });
    }

    /**
     *
     */
    sendBuffer(){
        this.buffer.forEach(buffer => {
            this.send(buffer);
        });
        this.buffer.length = 0;
        return true;
    }

    /**
     *
     * @param msg
     * @returns {boolean}
     */
    send(msg){
        const json = JSON.stringify(msg);
        if(!this.ready){
            this.buffer.push(json);
            return false;
        }
        return this.ready ? (this.connector.sendUTF(json)) !== false : false;
    }

}

module.exports = SocketClient;