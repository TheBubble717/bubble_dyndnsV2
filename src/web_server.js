"use strict";
import { addfunctions } from "./addfunctions.js"
import { classdata } from './main.js';
import { createRequire } from "module"
import https from "node:https"
import fs from "fs"
const require = createRequire(import.meta.url)
var bodyParser = require("body-parser");
var express = require('express');
var cookieParser = require('cookie-parser')
var path = require('path');
import { escape as expressescape, objectsanitizer } from "./bubble_expressescape_library.js"
const rateLimit = require('express-rate-limit')
import { EventEmitter } from "node:events"

class webclass extends EventEmitter {
    constructor(config, log) {
        super();
        this.em = null;
        this.config = config;
        this.expressserver = null;
        this.http_s_server = null;
        this.log = log
        this.locks = {}
    }

    createserver(callback) {
        var that = this;
        return new Promise(async (resolve, reject) => {

            that.expressserver = express();

            if (that.config.enable_ssl) {
                let ssloptions = {
                    cert: fs.readFileSync(path.resolve() + that.config.ssl.cert),
                    key: fs.readFileSync(path.resolve() + that.config.ssl.key),
                }

                that.http_s_server = https.createServer(ssloptions, that.expressserver);

                that.http_s_server.listen(that.config.port, that.config.hostname, async function () {
                    var answer = "WEB-SSL-Server was started successfully and is listening on Port: " + that.config.port + "/tcp"
                    if (callback && typeof callback == 'function') {
                        await callback("", answer);
                        resolve();
                    }
                    else {
                        resolve(answer);
                    }
                    return;
                });
            }
            else {

                that.http_s_server = that.expressserver.listen(that.config.port, that.config.hostname, async function () {
                    var answer = "WEB-Server was started successfully and is listening on Port: " + that.config.port
                    if (callback && typeof callback == 'function') {
                        await callback("", answer);
                        resolve();
                    }
                    else {
                        resolve(answer);
                    }
                    return;


                });

            }

            that.http_s_server.on('error', async function (e) {
                if (callback && typeof callback == 'function') {
                    await callback(e.message, "");
                    resolve();
                }
                else {
                    reject(e.message);
                }
                return;
            });


            const apilimiter = rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 120, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
                standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
                legacyHeaders: false, // Disable the `X-RateLimit-*` headers
            })

            that.expressserver.use(bodyParser.urlencoded({ extended: false }))
            that.expressserver.use(bodyParser.json())
            that.expressserver.use(cookieParser())
            that.expressserver.use(expressescape)

            that.expressserver.use('/website/admin', apilimiter, async function (req, res, next) {
                try
                {
                    let isadmin = await classdata.api.account.auth_isadmin_cookie(req.cookies.cookie)
                    if (isadmin) {
                        next();
                    } else {
                        res.status(403).send('Forbidden: You do not have access to this resource.');
                        res.end();
                    }
                }
                catch(err)
                {
                    res.status(403).send('Forbidden: You do not have access to this resource.');
                    res.end();
                }

            }, express.static(path.resolve('website/admin/')));
            that.expressserver.use('/website', express.static(path.resolve('website')))
            that.expressserver.use(function (err, req, res, next) { console.error(err.stack); res.status(500).send('Something broke!'); });
            that.expressserver.set('trust proxy', 1)



            
            that.expressserver.post('/accapi*', apilimiter, async function (req, res) {
                var responseclass = new api_responseclass(req, res)

                //Check if apikey and task is string
                let requiredFields = { "task": "string" };
                req.body = addfunctions.objectconverter(req.body)
                let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, req.body, false)
                if (!check_for_correct_datatype.success) {
                    responseclass.send({ "success": false, "msg": "Task not given!" })
                    return;
                }

                var ipv4 = addfunctions.getclientipv4(req)

                const lockKey = `${ipv4}:${req.body.task}`;
                if (classdata.tasks.account[req.body.task]) {
                    var taskProcessor = classdata.tasks.account[req.body.task]
                } else {
                    responseclass.send({ "success": false, "msg": "Task unclear" });
                    return;
                }
                that.processWithLock(lockKey, taskProcessor, res, req, responseclass)

            });

            
            that.expressserver.post('/dnsapi*', apilimiter, async function (req, res) {
                const responseclass = new api_responseclass(req, res);

                // Validate if apikey and task are strings
                const requiredFields = { "apikey": "string", "task": "string" };
                req.body = addfunctions.objectconverter(req.body);
                const check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, req.body, false);
                if (!check_for_correct_datatype.success) {
                    responseclass.send({ "success": false, "msg": "Task not given!" });
                    return;
                }

                const lockKey = `${req.body.apikey}:${req.body.task}`;
                if (classdata.tasks.dns[req.body.task]) {
                    var taskProcessor = classdata.tasks.dns[req.body.task]
                } else {
                    responseclass.send({ "success": false, "msg": "Task unclear" });
                    return;
                }
                that.processWithLock(lockKey, taskProcessor, res, req, responseclass)


            });

            
            that.expressserver.post('/adminapi*', apilimiter, async function (req, res) {
                var responseclass = new api_responseclass(req, res)

                //Check if apikey and task is string
                let requiredFields = { "apikey": "string", "task": "string" };
                req.body = addfunctions.objectconverter(req.body)
                let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, req.body, false)
                if (!check_for_correct_datatype.success) {
                    responseclass.send({ "success": false, "msg": "Task not given!" })
                    return;
                }

                const lockKey = `${req.body.apikey}:${req.body.task}`;
                if (classdata.tasks.admin[req.body.task]) {
                    var taskProcessor = classdata.tasks.admin[req.body.task]
                } else {
                    responseclass.send({ "success": false, "msg": "Task unclear" });
                    return;
                }
                that.processWithLock(lockKey, taskProcessor, res, req, responseclass)
            });

            
            that.expressserver.post('/autologin/', apilimiter, async function (req, res) {
                var responseclass = new api_responseclass(req, res)

                //Only continue if cookie is defined
                if (req.body.cookie === undefined) {
                    responseclass.send({ "success": false, "msg": "Cookie not given!" })
                    return;
                }

                //Actual Auto-login
                var cookie = req.body.cookie;

                await classdata.api.account.auth_cookie(cookie)
                .then(function(user){
                    if (user.success) {
                        user.data = user.data.get_user_personal()
                    }
                    responseclass.send(user)
                })
                .catch(function (err) {responseclass.send({ success: false, msg: "Error Autologin, 500 Error" }, { statuscode: 500, err: err })})
                return;

            });

            
            that.expressserver.get('/update*', apilimiter, async function (req, res) //Only works with IPV4 to be set automatically
            {

                var responseclass = new api_responseclass(req, res)

                if (req.query.id === undefined || req.query.apikey === undefined) {
                    responseclass.send({ "success": false, "msg": "Data not complete" })
                    return;
                }

                //Set IPV4 if not given
                if (req.query.value === undefined) {
                    req.query.value = addfunctions.getclientipv4(req);
                }


                try {
                    let user = await classdata.api.account.auth_api(req.query.apikey)
                    if (user.success) {
                        let dnsentry = await classdata.api.dns.dnsentry_list(user.data, { "id": req.query.id })
                        if (dnsentry.success && dnsentry.data.length) {
                            dnsentry.data[0].entryvalue = req.query.value;
                            let updateddnsentry = await classdata.api.dns.dnsentry_update(user.data, dnsentry.data[0])
                            responseclass.send(updateddnsentry);
                            return;
                        }
                        else {
                            responseclass.send({ success: false, msg: "Can't find DNS-Entry" });
                            return;
                        }
                    }
                    else {
                        responseclass.send(user);
                        return;
                    }
                }
                catch (err) {
                    responseclass.send({ "success": false, "msg": "Error updating DNS-Entry, 500 Error" }, { statuscode: 500, err: err })
                    return;
                }
            });

            
            that.expressserver.get('/confirm*', apilimiter, async function (req, res) {
                var responseclass = new api_responseclass(req, res)

                if (req.query.keytext === undefined) {
                    responseclass.send({ "success": false, "msg": "Data not complete" })
                    return;
                }

                const { keytext, ...data } = req.query;
                var answer = await classdata.mail.mailconfirmation_processing({ "keytext": req.query.keytext }, data) //the whole req.query becomes data
                if (!answer.success) {
                    responseclass.send(null, { statuscode: 302, statusmessage: { 'Location': '/404.html' } })
                    return;
                }
                else {
                    if (answer.data.completed) {
                        if (answer.data.keytype == 1) {
                            responseclass.send(answer)
                            return;
                        }
                        else if (answer.data.keytype == 2) {
                            responseclass.send(null, { statuscode: 302, statusmessage: { 'Location': '/' } })
                            return;
                        }
                    }
                    else {
                        if (answer.data.keytype == 1) {
                            responseclass.send(null, { statuscode: 302, statusmessage: { 'Location': `/resetpasswd?keytext=${answer.data.keytext}` } })
                            return;
                        }
                        else {
                            responseclass.send(null, { statuscode: 302, statusmessage: { 'Location': '/404.html' } })
                            return;
                        }
                    }
                }

            });

            
            that.expressserver.get(['*'], apilimiter, async function (req, res) {
                let content = await addfunctions.read_file("./website/index.html")
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(content);
                res.end();
            });

        });
    }

    
    async processWithLock(lockKey, taskProcessor, res, req, responseclass) {
        var that = this;
        const createLock = async () => {
            try {
                var timetocomplete = {
                    "start": new Date().getTime(),
                    "stop": null
                }
                await taskProcessor.process(req, res, responseclass);
                timetocomplete.stop = new Date().getTime();
                that.log.addlog(`Task: ${req.body.task} Performance: ${timetocomplete.stop - timetocomplete.start}ms`, { color: "white", warn: "Webserver-Log", level: 1 })
            } catch (err) {
                that.log.addlog(`Error processing task for lockKey ${lockKey}: ${err.message}`, { color: "red", "warn": "Webserver-Error", level: 3 }); //Shouldn't be able to be thrown!
            } finally {
                delete that.locks[lockKey]; // Clean up the lock
                if (that.lockQueues[lockKey] && that.lockQueues[lockKey].length > 0) {
                    // Resolve the next promise in the queue
                    const nextResolve = that.lockQueues[lockKey].shift();
                    nextResolve(); // Allow the next request to proceed

                }
            }
        };

        // Ensure lock queues are initialized
        that.lockQueues = that.lockQueues || {};
        that.locks = that.locks || {};

        if (!that.lockQueues[lockKey]) {
            that.lockQueues[lockKey] = [];
        }

        if (that.locks[lockKey]) {
            // Wait in the queue if a lock exists
            await new Promise((resolve) => {
                that.lockQueues[lockKey].push(resolve);
            });
        }

        // Acquire the lock and process the request
        that.locks[lockKey] = createLock();
        await that.locks[lockKey];
    }

}

class api_responseclass {
    constructor(req, res) {
        this.req = req,
            this.res = res
        this.alreadysent = false
    }

    //Sets the rest of the override settings to null
    send = (unfilteredanswer = null, override = { statuscode: null, statusmessage: null, err: null }) => {
        override = { statuscode: null, statusmessage: null, err: null, ...override, };

        var filteredanswer = function () {
            if (typeof unfilteredanswer === "object" && unfilteredanswer !== null) {
                if (unfilteredanswer.success === true) {
                    let sanitizeddata = objectsanitizer(unfilteredanswer.data);
                    return { success: unfilteredanswer.success, data: sanitizeddata }
                }
                else {
                    let sanitizedmsg = objectsanitizer(unfilteredanswer.msg);
                    return { success: unfilteredanswer.success, msg: sanitizedmsg }
                }
            }
            return null;

        }()
        var statuscode = function () {
            if (override.statuscode !== null) {
                return override.statuscode
            }
            else if (unfilteredanswer === null) {
                return 200;
            }
            else if (typeof unfilteredanswer === "object" && unfilteredanswer !== null) {
                if (typeof unfilteredanswer.success == "boolean" && unfilteredanswer.success) {
                    return 200;
                }
                else {
                    return 403;
                }
            }
            else {
                return 200;
            }
        }()
        var statusmessage = function () {
            if (override.statusmessage !== null) {
                return override.statusmessage
            }
            else {
                return { 'Content-Type': 'text/html' }
            }
        }()

        if (this.alreadysent) {
            classdata.webserver.log.addlog(`api_responseclass wanted to write to res altough it is already sent!`, { color: "red", "warn": "Webserver-Error", level: 3 });
            return;
        }
        this.alreadysent = true

        this.res.writeHead(statuscode, statusmessage);
        if (filteredanswer !== null) {
            this.res.write(JSON.stringify(filteredanswer))
        }

        if (statuscode === 500) {
            //Find where the error occured!
            var errorlocation = ""
            let stack = new Error().stack;
            let stackLines = stack.split("\n");
            let callerLine = stackLines[2];

            let match = callerLine.match(/([\/\\]([^\/\\]+\.js:\d+:\d+))/);

            if (match) {
                errorlocation = `${match[1].replace(/^.*[\/\\]/, '')} --- `
            }

            //Check if override.error exists, set to "NOT SET" if not
            if (typeof override.err == "undefined") { override.err = "NOT SET" }

            classdata.webserver.log.addlog(`Error ${override.statuscode} happened in "${errorlocation} with the error:\n ${override.err.stack || override.err}`, { color: "red", "warn": "Webserver-Error", level: 3 });
        }

        this.res.end();
        return;

    }
}







export { webclass }