"use strict";
import { addfunctions } from "./addfunctions.js"
import { classdata } from './main.js';
import { dnsserverclass, dnsPacket } from 'bubble_ezdns_server_library'
import { Resolver } from "node:dns/promises"
import { EventEmitter } from "node:events"


class dnsclass extends EventEmitter {
    constructor(config, log) {
        super();
        this.em = null;
        this.config = config;
        this.server = {
            "tcp4": null,
            "udp4": null,
        };
        this.log = log
    }

    async createserver(callback) {
        var that = this;


        //UDP SERVER
        var udp4serverpromise = new Promise(async (startupresolve, startupreject) => {
            try
            {
                that.server.udp4 = new dnsserverclass({
                    "type": "udp4",
                    "port": that.config.port,
                    "address": "0.0.0.0",
                    "handle": (request, responseclass) =>
                        that.dnshandler(request, responseclass)
                })
                that.server.udp4.createserver()
    
                that.server.udp4.server.on('listening', async function () {
                    const answer = `Dns-Server-UDP4 was started successfully and is listening on Port: ${that.config.port}/udp`;
                    startupresolve(answer);
                });
        
                that.server.udp4.server.on('close', function () {
                    const error = "Dns-Server-UDP4 closed";
                    that.log.addlog(error, { color: "red", warn: "DNS-Error", level: 3 })
                    startupreject(error);
                    process.exit(1007);
                });
        
                that.server.udp4.server.on('error', function (err) {
                    const error = `Dns-Server-UDP4 Error: ${err.message}`
                    that.log.addlog(error, { color: "red", warn: "DNS-Error", level: 3 })
                    startupreject(error);
                    process.exit(1008);
                });

    
                that.server.udp4.listen()
            }
            catch(err)
            {
                startupreject(err)
            }


        });

        //TCP SERVER
        var tcp4serverpromise = new Promise(async (startupresolve, startupreject) => {
            try
            {
                that.server.tcp4 = new dnsserverclass({
                    "type": "tcp4",
                    "maxtime":5,
                    "port": that.config.port,
                    "address": "0.0.0.0",
                    "handle": (request, responseclass) =>
                        that.dnshandler(request, responseclass)
                })
                that.server.tcp4.createserver()
    
                that.server.tcp4.server.on('listening', async function () {
                    const answer = `Dns-Server-UDP4 was started successfully and is listening on Port: ${that.config.port}/tcp`;
                    startupresolve(answer);
                });
    
                that.server.tcp4.server.on('close', async function () {
                    const error = "Dns-Server-TCP4 closed"
                    that.log.addlog(error, { color: "red", warn: "DNS-Error", level: 3 })
                    startupreject(error);
                    process.exit(1009)
                });

                that.server.tcp4.server.on('error', function (err) {
                    const error = `Dns-Server-TCP4 Error: ${err.message}`
                    that.log.addlog(error, { color: "red", warn: "DNS-Error", level: 3 })
                    startupreject(error);
                    process.exit(1010);
                });
    
    
                that.server.tcp4.listen()
            }
            catch(err)
            {
                startupreject(err)
            }

        });

        Promise.all([udp4serverpromise,tcp4serverpromise])
        .then(async function(response){
            if (callback && typeof callback == 'function') {
                await callback("", response);
            }
        })
        .catch(async function(err){
            if (callback && typeof callback == 'function') {
                await callback(err, "");
            }
            throw(err)

        })
    }

    async dnshandler(request, responseclass) {
        try {
            var timetocomplete = {
                "start": new Date().getTime(),
                "stop": null
            }
            var that = this
            const [question] = request.questions;
            var response = {};

            var extractDomain = function (inputUrl) {
                inputUrl = inputUrl.toLowerCase()
                // If the input URL does not have a protocol, assume 'http://' as default
                const fullUrl = inputUrl.startsWith('http') ? inputUrl : `http://${inputUrl}`;

                const parsedUrl = new URL(fullUrl);
                const hostname = parsedUrl.hostname;

                // Split the hostname into parts using '.' as the separator
                const parts = hostname.split('.');

                // The last two parts are the top-level domain and domain
                const tld = parts.pop();
                const domain = `${parts.pop()}.${tld}`;

                // The remaining parts are the subdomain
                var subdomain = parts.join('.');
                //If the requested subdomain is "" (wanting the main address), change the subdomain to "@"
                if (subdomain == "") { subdomain = "@" }

                return { "subdomain": subdomain, "domain": domain };
            }
            var requested_domain = extractDomain(question.name)

            //SYNCTEST
            if (question.name.toLowerCase() == "synctest" && question.type == "TXT") {

                let synctestdata = await classdata.db.databasequerryhandler_secure("select * from bubbledns_servers_testvalues where testedid=?", [classdata.db.routinedata.this_server.id])
                response = { "type": question.type, "data": synctestdata.map(function (r) { return r.testvalue }), "server": "SELFANSWER", "dnsflags": dnsPacket.AUTHORITATIVE_ANSWER }
            }



            //No Answer if synctest=0
            else if (!classdata.db.routinedata.this_server?.synctest == 1) {
                response = { "type": question.type, "data": [], "server": "SELFANSWER", "dnsflags": 5 } //Query refused
            }

            //Only Specific Questions are allowed
            else if ((classdata.db.routinedata.bubbledns_settings.allowed_dnstype_questions.indexOf(question.type) > -1)) {
                var domain_unverified = classdata.db.routinedata.domains.filter(function (r) { if (r.domainname == requested_domain.domain && (r.verified == 0 && r.builtin == 0)) { return true } });
                var domain_verified = classdata.db.routinedata.domains.filter(function (r) { if (r.domainname == requested_domain.domain && (r.verified == 1 || r.builtin == 1)) { return true } });

                //Only unverified domains! (ONLY NS of @.domain)
                if (domain_unverified.length && question.type == "NS" && requested_domain.subdomain == "@") {
                    //Want the nameserver of a domain
                    response = {
                        "type": "NS", "data": classdata.db.routinedata.bubbledns_servers.filter(item => item.enabled_dns === 1 && item.synctest === 1).map(function (item) {
                            return (`${item.subdomainname}.${classdata.db.routinedata.bubbledns_settings.maindomain}`)
                        }), "server": "SELFANSWER", "dnsflags": dnsPacket.AUTHORITATIVE_ANSWER
                    }
                }

                //Only verified domains!
                else if (domain_verified.length) {
                    //Want the nameserver of a domain
                    if (question.type == "NS" && requested_domain.subdomain == "@") {

                        response = {
                            "type": "NS", "data": classdata.db.routinedata.bubbledns_servers.filter(item => item.enabled_dns === 1 && item.synctest === 1).map(function (item) {
                                return (`${item.subdomainname}.${classdata.db.routinedata.bubbledns_settings.maindomain}`)
                            }), "server": "SELFANSWER", "dnsflags": dnsPacket.AUTHORITATIVE_ANSWER
                        }
                    }

                    else if (requested_domain.subdomain.startsWith("ns") && requested_domain.subdomain.length === 3 && (question.type == "A" || question.type == "AAAA")) {
                        let dnsserverdata = classdata.db.routinedata.bubbledns_servers
                            .filter(item => item.subdomainname === requested_domain.subdomain && item.synctest === 1)
                            .map(item => {
                                if (question.type == "A") {
                                    return item.public_ipv4;
                                } else {
                                    return item.public_ipv6;
                                }
                            })
                            .filter(address => address != null);
                        if (dnsserverdata.length) {
                            response = { "type": question.type, "data": dnsserverdata, "server": "SELFANSWER", "dnsflags": dnsPacket.AUTHORITATIVE_ANSWER }
                        }
                        else {
                            response = { "type": question.type, "data": [], "server": "SELFANSWER", "dnsflags": dnsPacket.AUTHORITATIVE_ANSWER } //NameServer not found
                        }
                    }
                    //Main @.bubbledns.com A & AAAA request
                    else if ((requested_domain.subdomain == "@" || requested_domain.subdomain == "www") && requested_domain.domain == classdata.db.routinedata.bubbledns_settings.maindomain && (question.type == "A" || question.type == "AAAA")) {
                        var bubblednsserversweb = classdata.db.routinedata.bubbledns_servers.filter(r => r.enabled_web == 1 && r.synctest === 1 && r.virtual === 0)
                        if (question.type == "A") {
                            var dataresponse = bubblednsserversweb.filter(item => item != null && item.public_ipv4 != null).map(item => item.public_ipv4);
                        }
                        else {
                            var dataresponse = bubblednsserversweb.filter(item => item != null && item.public_ipv6 != null).map(item => item.public_ipv6);
                        }
                        response = { "type": question.type, "data": dataresponse, "server": "SELFANSWER", "dnsflags": dnsPacket.AUTHORITATIVE_ANSWER }
                    }

                    //Rest of the dns_entries fetched by the database
                    else {
                        await classdata.db.dns_lookup(requested_domain.subdomain, question.type, domain_verified[0].id)
                            .then(function (res) {
                                let data = {}
                                if (res[0].entrytype == "MX") {
                                    data = res.map(function (r) { return { "exchange": r.entryvalue, "priority": 1 } })
                                }
                                else {
                                    data = res.map(function (item) { return item.entryvalue })
                                }
                                response = { "type": res[0].entrytype, "data": data, "server": "SELFANSWER", "dnsflags": dnsPacket.AUTHORITATIVE_ANSWER }
                            })
                            .catch(function (err) {
                                response = { "type": question.type, "data": [], "server": "SELFANSWER", "dnsflags": dnsPacket.AUTHORITATIVE_ANSWER } //DNSentry not found
                            })
                    }
                }

                //Not one of my Domains
                else {
                    //Fetch DNS-Entry from Upstream_Servers if allowed
                    if (classdata.db.routinedata.bubbledns_settings.allowuseageasrealproxy) {

                        await that.askrealdns(question.name.toLowerCase(), question.type, function (err, answer) {
                            if (err) {
                                that.log.addlog(`Error requesting DNS-Entry for ${err.err.hostname} on server ${err.server} with code: ${err.err.code}`, { color: "yellow", warn: "DNS-Warning", level: 2 })

                                response = { "type": question.type, "data": [], "server": err.server, "dnsflags": 3 } //DNSentry not found
                            }
                            else {
                                response = answer
                            }
                        })
                    }
                    else {
                        response = { "type": question.type, "data": [], "server": "SELFANSWER", "dnsflags": 5 } //Query refused
                    }
                }
            }


            else {

                var domain_verified = classdata.db.routinedata.domains.filter(function (r) { if (r.domainname == requested_domain.domain && (r.verified == 1 || r.builtin == 1)) { return true } });
                //If unallowed Question, but domain is verified, send authority back!
                if (domain_verified.length) {
                    response = { "type": "SOA", "data": [{ mname: `${classdata.db.routinedata.bubbledns_servers[0].subdomainname}.${classdata.db.routinedata.bubbledns_settings.maindomain}`, rname: `hostmaster.${classdata.db.routinedata.bubbledns_settings.maindomain}`, serial: addfunctions.unixtime_to_local().replace("-", "").slice(0, 10), refresh: 10800, retry: 3600, expire: 1209600, minimum: 3600 }], "server": "SELFANSWER", "dnsflags": dnsPacket.AUTHORITATIVE_ANSWER }
                }
                else {
                    response = { "type": question.type, "data": [], "server": "SELFANSWER", "dnsflags": 5 } //Query refused
                }

            }

            var replyvariable = []
            if (typeof response.data !== "undefined") {
                for (let i = 0; i < response.data.length; i++) {
                    replyvariable.push({
                        name: question.name,
                        type: response.type,
                        class: 'IN',
                        ttl: 120,
                        data: response.data[i]
                    });
                }
            }

            await responseclass.send(replyvariable, response.dnsflags).catch(function (err) { that.log.addlog(err, { color: "red", warn: "DNS-Error", level: 3 }) });
            if ((response.type == "SOA") || (response.type == "CAA") || (response.type == "MX")) {
                var formattingofresponse = JSON.stringify(response.data)
            } else {
                var formattingofresponse = response.data.toString()
            }
            timetocomplete.stop = new Date().getTime();
            that.log.addlog(`Who:${responseclass.rinfo.address} Sel.Server:${response.server} ----- Domain:${question.name}  ----- Flags:${response.dnsflags}   ----- Performance: ${timetocomplete.stop - timetocomplete.start}ms  ----- Type:(${question.type}->${response.type}) --> ${formattingofresponse}`, { color: "white", warn: "DNS-Log", level: 1 })

        }
        catch (err) {
            that.log.addlog("Fatal Error inside dnshandler:" + err, { color: "red", warn: "DNS-Error", level: 3 })
            return;
        }

    }

    async askrealdns(domain, type, callback) {
        var that = this;
        return new Promise(async (resolve, reject) => {

            const resolver = new Resolver();
            var randomserver = []
            var zw = []

            let get_random_dns_server = async function () {
                let realdnsserver = await classdata.db.databasequerryhandler_secure(`select * from dns_upstreamservers where enabled = true AND (lasttimebanned <= ? OR lasttimebanned IS NULL);`, [new Date().getTime() + classdata.db.routinedata.bubbledns_settings.realdns_bantime]);
                if (realdnsserver.length == 0) {
                    return []
                }
                else {
                    let randomserver = realdnsserver[Math.floor(Math.random() * realdnsserver.length)]
                    return randomserver
                }
            }

            randomserver.push(await get_random_dns_server())
            if (randomserver[0].length == 0) {
                let err = { "code": "NO Server available", "hostname": domain }
                if (callback && typeof callback == 'function') {
                    await callback({ "err": err, "server": "NO-Server-available" }, "");
                    resolve();
                }
                else {
                    reject({ "err": err, "server": "NO-Server-available" });
                }
                return;
            }
            resolver.setServers([randomserver[0].address])
            await resolver.resolve(domain, type)
                .then(async function (addresses) {
                    //SOA doesnt answer as an array
                    if (!Array.isArray(addresses)) {
                        //My DNS Server needs different variable names
                        if (type == "SOA") {
                            addresses = {
                                mname: addresses.nsname,
                                rname: addresses.hostmaster,
                                serial: addresses.serial,
                                refresh: addresses.refresh,
                                retry: addresses.retry,
                                expire: addresses.expire,
                                minimum: addresses.minttl
                            }
                        }
                        zw = { "type": type, "data": [addresses], "server": randomserver[0].address, "dnsflags": dnsPacket.RECURSION_DESIRED }
                    }
                    else {
                        zw = { "type": type, "data": addresses, "server": randomserver[0].address, "dnsflags": dnsPacket.RECURSION_DESIRED }
                    }

                    if (callback && typeof callback == 'function') {
                        await callback("", zw);
                        resolve();
                        return;
                    }
                    else {
                        resolve(zw);
                        return;
                    }

                })
                .catch(async function (err) {
                    that.log.addlog(`Error in DNS-Request:  Message: "${err.message}" - Errorcode: "${err.code}" - Server: "${randomserver[0].address}"  `, { color: "yellow", warn: "DNS-Warning", level: 2 });
                    if (err.code == "ETIMEOUT") // If Timeout, ban the server to prevent further timeouts
                    {
                        let banned_until = new Date().getTime() + classdata.db.routinedata.bubbledns_settings.realdns_bantime * 1000
                        var localerrormessage = "";

                        //Only Masternode bans the Server
                        if (classdata.db.routinedata.this_server?.masternode) {
                            await classdata.db.databasequerryhandler_secure(`UPDATE dns_upstreamservers SET lasttimebanned = ? , amountbanned = amountbanned + 1 where id = ?`, [banned_until, randomserver[0].id])
                            localerrormessage = `Banned ${randomserver[0].address} for ${classdata.db.routinedata.bubbledns_settings.realdns_bantime}`
                        }
                        else {
                            localerrormessage = `Unable to Ban ${randomserver[0].address} for ${classdata.db.routinedata.bubbledns_settings.realdns_bantime} Reason: DNS-Server not Mainserver`
                        }

                        that.log.addlog(localerrormessage, { color: "red", warn: "DNS-BAN", level: 3 });
                        let errorresponse = { "code": err.code, "hostname": domain }


                        if (callback && typeof callback == 'function') {
                            await callback({ "err": errorresponse, "server": randomserver[0].address }, "");
                            resolve();
                        }
                        else {
                            reject({ "err": errorresponse, "server": randomserver[0].address });
                        }
                        return;

                    }
                    else {

                        let errorresponse = { "code": err.message, "hostname": domain }
                        if (callback && typeof callback == 'function') {
                            await callback({ "err": errorresponse, "server": randomserver[0].address }, "");
                            resolve();
                        }
                        else {
                            reject({ "err": errorresponse, "server": randomserver[0].address });
                        }
                        return;
                    }
                })


        });

    }

    async askrealdns_customserver(domain, type, dnsserveraddress, callback) {
        var that = this;
        return new Promise(async (resolve, reject) => {

            const resolver = new Resolver();
            var zw = []

            resolver.setServers([dnsserveraddress])
            await resolver.resolve(domain, type)
                .then(async function (addresses) {
                    //SOA doesnt answer as an array
                    if (!Array.isArray(addresses)) {
                        //My DNS Server needs different variable names
                        if (type == "SOA") {
                            addresses = {
                                mname: addresses.nsname,
                                rname: addresses.hostmaster,
                                serial: addresses.serial,
                                refresh: addresses.refresh,
                                retry: addresses.retry,
                                expire: addresses.expire,
                                minimum: addresses.minttl
                            }
                        }
                        zw = { "type": type, "data": [addresses], "server": dnsserveraddress, "dnsflags": dnsPacket.RECURSION_DESIRED }
                    }
                    else {
                        zw = { "type": type, "data": addresses, "server": dnsserveraddress, "dnsflags": dnsPacket.RECURSION_DESIRED }
                    }

                    if (callback && typeof callback == 'function') {
                        await callback("", zw);
                        resolve();
                        return;
                    }
                    else {
                        resolve(zw);
                        return;
                    }

                })
                .catch(async function (err) {
                    if (callback && typeof callback == 'function') {
                        await callback({ "err": err, "server": dnsserveraddress }, "");
                        resolve();
                    }
                    else {
                        reject({ "err": err, "server": dnsserveraddress });
                    }
                    return;
                })


        });

    }
}



export { dnsclass }