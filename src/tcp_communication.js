"use strict";
import { addfunctions } from "./addfunctions.js"
import { classdata } from './main.js';
import { tcp_client_class, tcp_server_class } from "bubble_tcp_promise_library";
import { readFileSync } from 'node:fs'
import * as path from 'path';

class tcpcommuicationclass {
    constructor(config, log) {
        this.config = config;
        this.log = log,
            this.server = null,
            this.client = null
    }


    async create_server() {
        var that = this
        return new Promise(async (resolve, reject) => {

            var tcp_servercreation = new Promise(async (startupresolve, startupreject) => {
                try {
                    var config = {
                        "port": that.config.port,
                        "cert": readFileSync(path.resolve() + that.config.tls.server_cert),
                        "key": readFileSync(path.resolve() + that.config.tls.server_key),
                        "client": readFileSync(path.resolve() + that.config.tls.client_cert),
                        "authkey": 1234
                    }

                    that.server = new tcp_server_class(config)
                    await that.server.create_server()

                    that.server.em.on('command', async function (message) {
                        that.message_handler(message)
                    });

                    that.server.em.on('newclient', async function (connection) {
                        that.new_client_handler_server(connection)
                    });

                    that.server.em.on('end', async function (data) {
                        that.end_handler_server(data)
                        startupreject(data)
                    });

                    that.server.em.on('errorhandling', async function (data) {
                        that.error_handler_server(data)
                        startupreject(data)
                    });

                    startupresolve(`Communication-TCP-Server was started successfully and is listening on Port: ${that.config.port}/tcp`)
                }
                catch (err) {
                    startupreject(err)
                }
            });

            Promise.all([tcp_servercreation])
                .then(resolve)
                .catch(reject)

        });
    }

    //Connects to the Masterserver with the lowest ID that has Synctest=1;virtual=0 and is this_server;
    async create_client() {
        var that = this
        return new Promise(async (resolve, reject) => {
            var tcp_clientcreation = new Promise(async (startupresolve, startupreject) => {
                let masterservertoconnecto = classdata.db.routinedata.bubbledns_servers.filter(function (r) { if ((classdata.db.routinedata.this_server.id !== r.id) && (r.virtual == 0) && (r.masternode == 1) && (r.synctest == 1)) { return true } }).sort((a, b) => b.id - a.id);
                if (masterservertoconnecto.length) {
                    masterservertoconnecto = masterservertoconnecto[0]
                }
                var config = {
                    authkey: "1234",
                    "cert": readFileSync(path.resolve() + that.config.tls.client_cert),
                    "key": readFileSync(path.resolve() + that.config.tls.client_key),
                    "server": readFileSync(path.resolve() + that.config.tls.server_cert),
                    host: masterservertoconnecto.internal_ipv4,
                    port: that.config.port,
                    tcpoptions: {
                        checkServerIdentity: () => undefined,
                    }
                }

                that.client = new tcp_client_class(config)
                try {
                    await that.client.create_client()

                    that.client.em.on('command', async function (message) {
                        that.message_handler(message)
                    });

                    that.client.em.on('end', async function (data) {
                        that.end_handler_client(data)
                        startupreject(data)
                    });

                    that.client.em.on('errorhandling', async function (data) {
                        that.error_handler_client(data)
                        startupreject(data)
                    });

                    var answer = `Sucessfully connected to Server ${bubblednsserver.internal_ipv4}/${classdata.db.routinedata.bubbledns_servers[0].subdomainname}.${classdata.db.routinedata.bubbledns_settings.maindomain}\n`
                }
                catch (err) {
                    var answer = `Failed to connect to Server ${bubblednsserver.internal_ipv4}/${classdata.db.routinedata.bubbledns_servers[0].subdomainname}.${classdata.db.routinedata.bubbledns_settings.maindomain}\n`
                }
                startupresolve(answer);
            });

            Promise.all([tcp_clientcreation])
                .then(resolve)
                .catch(reject)

        });
    }

    //For Server and Client
    async message_handler(message) {

    }

    async end_handler_client(data) {

    }

    async error_handler_client(data) {

    }


    async end_handler_server(data) {

    }

    async error_handler_server(data) {

    }

    async new_client_handler_server(connection) {
        console.log("new client")
    }

}




export { tcpcommuicationclass }