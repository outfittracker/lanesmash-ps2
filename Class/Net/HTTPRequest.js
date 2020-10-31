/*
 * Aurelien Munoz <munoz.aurelien@gmail.com>
 * Twitter : @aurelien_munoz
 * LaneSmash Script for PS2 10/2020
 */
'use strict';

const Requestify = require('requestify');
const JSONStream = require('json-stream');

class HTTPRequest {

    /**
     *
     * @param url
     * @returns {Promise<Object>}
     */
    static request(url){
        console.log("Call "+url);
        return new Promise((resolve,reject) => {

            return Requestify.get(url).then(response => {
                const stream = JSONStream();
                stream.on('data',resolve);
                return stream.write(response.body);

            }).catch(err => {
                reject(err);
            });
        });
    }

    /**
     *
     * @param url
     * @param data
     * @returns {Promise<unknown>}
     */
    static post(url,data){
        return new Promise((resolve,reject) => {
            return Requestify.post(url,data).then(response => {
                const stream = JSONStream();
                stream.on('data',resolve);
                stream.on('error',reject);
                return stream.write(response.body);
            }).catch(err => {
                reject(err);
            });
        });
    }
}

module.exports = HTTPRequest;