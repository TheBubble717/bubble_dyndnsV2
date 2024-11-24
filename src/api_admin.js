
"use strict";
import { addfunctions } from "./addfunctions.js"
import { classdata } from './main.js';

class apiclass_admin {
    constructor(config, log) {
        this.config = config;
        this.log = log
    }

    dns_upstream_servers_list() {
        var that = this;
        return new Promise(async (resolve) => {
            classdata.db.databasequerryhandler_secure(`select * from dns_upstreamservers`, [], function (err, results) {
                if (err) {
                    if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                }

                resolve({ "success": true, "data": results })
                return;

            });
        });
    }

    dns_upstream_servers_enabledisable(dnsupstreamserver) {
        var that = this;
        return new Promise(async (resolve) => {

            let requiredFields = { "id": "number" };
            dnsupstreamserver = addfunctions.objectconverter(dnsupstreamserver)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, dnsupstreamserver)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }

            classdata.db.databasequerryhandler_secure(`UPDATE dns_upstreamservers SET enabled = NOT enabled where id=?`, [dnsupstreamserver.id], function (err, results) {
                if (err) {
                    if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                }

                if (results.affectedRows == 1) {
                    resolve({ "success": true, "data": "Done" })
                    return;
                }
                else {
                    resolve({ "success": false, "msg": "Databaseupdate failed" })
                    return;
                }


            });


        });
    }

    dns_upstream_servers_delete(dnsupstreamserver) {
        var that = this;
        return new Promise(async (resolve) => {

            let requiredFields = { "id": "number" };
            dnsupstreamserver = addfunctions.objectconverter(dnsupstreamserver)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, dnsupstreamserver)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }


            classdata.db.databasequerryhandler_secure(`DELETE FROM dns_upstreamservers where id=?`, [dnsupstreamserver.id], function (err, results) {
                if (err) {
                    if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                }

                if (results.affectedRows == 1) {
                    resolve({ "success": true, "data": "Done" })
                    return;
                }
                else {
                    resolve({ "success": false, "msg": "Databaseupdate failed" })
                    return;
                }


            });


        });
    }

    dns_upstream_servers_create(dnsupstreamserver) {
        var that = this;
        return new Promise(async (resolve) => {

            let requiredFields = { "address": "string" };
            dnsupstreamserver = addfunctions.objectconverter(dnsupstreamserver)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, dnsupstreamserver)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }

            if (!addfunctions.isIPv4(dnsupstreamserver.address)) {
                resolve({ "success": false, "msg": "Address not a valid IPV4-Adress" })
                return;
            }

            //Find free id for the server
            try {
                do {
                    var randomid = addfunctions.randomidf()
                    var answer = await classdata.db.databasequerryhandler_secure(`select * from dns_upstreamservers where id=?`, [randomid]);
                }
                while (answer && answer.length)

            }
            catch (err) {
                if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                resolve({ "success": false, "msg": "Unknown Error" })
                return;
            }

            //Check if Upstreamserver with that IP allready exists
            try {
                let results = await classdata.db.databasequerryhandler_secure(`select * from dns_upstreamservers where address = ?`, [dnsupstreamserver.address]);
                if (results.length !== 0) {
                    resolve({ "success": false, "msg": "IP-Address already exists" })
                    return;
                }
            }
            catch (err) {
                if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                resolve({ "success": false, "msg": "Unknown Error" })
                return;
            }

            classdata.db.databasequerryhandler_secure(`INSERT into dns_upstreamservers values (?,true,?,NULL,0)`, [randomid, dnsupstreamserver.address], function (err, results) {
                if (err) {
                    if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                }

                if (results.affectedRows == 1) {
                    resolve({ "success": true, "data": "Done" });
                    return;
                }
                else {
                    resolve({ "success": false, "msg": "Databaseupdate failed" })
                    return;
                }

            });


        });
    }

    bubbledns_servers_list() {
        var that = this;
        return new Promise(async (resolve) => {
            classdata.db.databasequerryhandler_secure(`select * from bubbledns_servers`, [], function (err, results) {
                if (err) {
                    if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                }

                resolve({ "success": true, "data": results })
                return;

            });
        });
    }

    bubbledns_servers_synctest(bubblednsservertotest) {
        var that = this;
        return new Promise(async (resolve) => {

            let requiredFields = { "id": "number" };
            bubblednsservertotest = addfunctions.objectconverter(bubblednsservertotest)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, bubblednsservertotest)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }

            //Search BubbleDNS_SERVER
            var bubblednsserver = classdata.db.routinedata.bubbledns_servers.filter(r => r.id == bubblednsservertotest.id)[0]
            if (typeof bubblednsserver == "undefined") {
                resolve({ "success": false, "msg": `BubbleDNS_Server with ID ${bubblednsservertotest.id} not found` })
                return;
            }


            //No good idea to check itself
            if (bubblednsserver.ipv4address === classdata.db.config.public_ip || bubblednsserver.ipv6address === classdata.db.config.public_ip) {

                //Should be looked in the future with multiple Masternodes
                await classdata.db.databasequerryhandler_secure(`UPDATE bubbledns_servers set synctest =? where id = ? `, [true, bubblednsservertotest.id], function (err, res) {
                    if (err) {
                        if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                        resolve({ "success": false, "msg": "Unknown Error" })
                        return;
                    }
                });

                resolve({ "success": false, "msg": "Server can't check itself, forcing Synctest=1!" })
                return;

            }


            var testdata = addfunctions.randomapif()
            var synctestresult = false;
            try {
                await classdata.db.databasequerryhandler_secure("insert into bubbledns_servers_testvalues values (?);", [testdata])
                await addfunctions.waittime(3);
                var requesteddnsentry = await classdata.dnsserver.askrealdns_customserver("synctest", "TXT", function () { if (bubblednsserver.ipv4address != null) { return bubblednsserver.ipv4address } else { return bubblednsserver.ipv6address } }())
                    .then(function (data) {
                        data.data = data.data.map(function (r) { return r[0] })
                        return data;
                    })
                    .catch(function (err) {
                        resolve({ "success": false, "msg": `Synctest failed! Got Code ${err.err.code} from DNS-Query` })
                        return undefined;
                    })

            }
            catch (err) {
                if (that.config.debug) { that.log.addlog("Unknown ERROR:" + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                resolve({ "success": false, "msg": "Unknown Error" })
                //NO RETURN!!!!
            }

            if (requesteddnsentry !== undefined) {
                synctestresult = requesteddnsentry.data.includes(testdata);
            }



            //Update Entry
            var promise1 = classdata.db.databasequerryhandler_secure(`UPDATE bubbledns_servers set synctest =? where id = ? `, [synctestresult, bubblednsservertotest.id]);
            var promise2 = classdata.db.databasequerryhandler_secure(`DELETE from bubbledns_servers_testvalues where testvalue = ?`, [testdata]);
            Promise.all([promise1, promise2])
                .then(function (res) {
                    if (synctestresult) {
                        resolve({ "success": true, "data": "Done" })
                        return;
                    }
                    else {
                        resolve({ "success": false, "msg": "Synctest failed! Testvalue not returned!" })
                        return;
                    }

                })
                .catch(function (err) {
                    if (that.config.debug) { that.log.addlog("Unknown ERROR:" + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                })



        });
    }

    bubbledns_servers_create(bubblednsserver) {
        var that = this;
        return new Promise(async (resolve) => {

            let requiredFields = { "subdomainname": "string", "enabled_dns": ["boolean", "number"], "enabled_web": ["boolean", "number"], "ipv4address": ["string", "null"], "ipv6address": ["string", "null"], "masternode": ["boolean", "number"] };
            bubblednsserver = addfunctions.objectconverter(bubblednsserver)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, bubblednsserver)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }

            //IPV4 & IPV6 check
            if (!addfunctions.isIPv4(bubblednsserver.ipv4address) && !((bubblednsserver.ipv4address === null) || (bubblednsserver.ipv4address === "null"))) 
                {
                resolve({ "success": false, "msg": "IPV4-Address is neither a IPV4-Address nor 'null'" })
                return;
            }
            else if (!addfunctions.isIPv6(bubblednsserver.ipv6address) && !((bubblednsserver.ipv6address === null) || (bubblednsserver.ipv6address === "null"))) {
                resolve({ "success": false, "msg": "IPV6-Address is neither a IPV6-Address nor 'null'" })
                return;
            }
            else if (((bubblednsserver.ipv4address === null) || (bubblednsserver.ipv4address === "null")) && ((bubblednsserver.ipv6address === null) || (bubblednsserver.ipv6address === "null"))) {
                resolve({ "success": false, "msg": "IPV4-Address or IPV6-Address needs to be used" })
                return;
            }
            bubblednsserver.ipv4address = addfunctions.isIPv4(bubblednsserver.ipv4address) === true ? bubblednsserver.ipv4address : null;
            bubblednsserver.ipv6address = addfunctions.isIPv6(bubblednsserver.ipv6address) === true ? bubblednsserver.ipv6address : null;


            //Subdomainname always lowercase
            bubblednsserver.subdomainname = bubblednsserver.subdomainname.toLowerCase()

            //Find free id for the server
            try {
                do {
                    var randomid = addfunctions.randomidf()
                    var answer = await classdata.db.databasequerryhandler_secure(`select * from bubbledns_servers where id=?`, [randomid]);
                }
                while (answer && answer.length)

            }
            catch (err) {
                if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                resolve({ "success": false, "msg": "Unknown Error" })
                return;
            }

            //Check if subdomainname is still free
            try {
                let preventdouble = await classdata.db.databasequerryhandler_secure(`select * from bubbledns_servers where subdomainname = ?`, [bubblednsserver.subdomainname])
                if (preventdouble.length) {
                    resolve({ "success": false, "msg": "Subdomainname already in use" })
                    return
                }
            }
            catch (err) {
                if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                resolve({ "success": false, "msg": "Unknown Error" })
                return;
            }

            classdata.db.databasequerryhandler_secure(`INSERT into bubbledns_servers values (?,?,?,?,?,?,0,?)`, [randomid, bubblednsserver.subdomainname, bubblednsserver.enabled_dns, bubblednsserver.enabled_web, bubblednsserver.ipv4address, bubblednsserver.ipv6address, bubblednsserver.masternode], function (err, results) {
                if (err) {
                    if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                }

                if (results.affectedRows == 1) {
                    resolve({ "success": true, "data": "Done" });
                    return;
                }
                else {
                    resolve({ "success": false, "msg": "Databaseupdate failed" })
                    return;
                }

            });

        });
    }

    bubbledns_servers_update(bubblednsserver) {
        var that = this;
        return new Promise(async (resolve) => {

            let requiredFields = { "subdomainname": "string", "enabled_dns": ["boolean", "number"], "enabled_web": ["boolean", "number"], "ipv4address": ["string", "null"], "ipv6address": ["string", "null"], "masternode": ["boolean", "number"], "id": "number" };
            bubblednsserver = addfunctions.objectconverter(bubblednsserver)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, bubblednsserver)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }

            //IPV4 & IPV6 check
            if (!addfunctions.isIPv4(bubblednsserver.ipv4address) && !((bubblednsserver.ipv4address === null) || (bubblednsserver.ipv4address === "null"))) {
                resolve({ "success": false, "msg": "IPV4-Address is neither a IPV4-Address nor 'null'" })
                return;
            }
            else if (!addfunctions.isIPv6(bubblednsserver.ipv6address) && !((bubblednsserver.ipv6address === null) || (bubblednsserver.ipv6address === "null"))) {
                resolve({ "success": false, "msg": "IPV4-Address is neither a IPV4-Address nor 'null'" })
                return;
            }
            else if (((bubblednsserver.ipv4address === null) || (bubblednsserver.ipv4address === "null")) && ((bubblednsserver.ipv6address === null) || (bubblednsserver.ipv6address === "null"))) {
                resolve({ "success": false, "msg": "IPV4-Address or IPV6-Address needs to be used" })
                return;
            }
            bubblednsserver.ipv4address = addfunctions.isIPv4(bubblednsserver.ipv4address) === true ? bubblednsserver.ipv4address : null;
            bubblednsserver.ipv6address = addfunctions.isIPv6(bubblednsserver.ipv6address) === true ? bubblednsserver.ipv6address : null;



            //Subdomainname always lowercase
            bubblednsserver.subdomainname = bubblednsserver.subdomainname.toLowerCase()

            //enabled_web only available together with masternode
            if (!bubblednsserver.masternode && bubblednsserver.enabled_web) {
                resolve({ "success": false, "msg": "Enabled_web requires that the server runs as a masternode" })
                return;
            }

            //Check if subdomainname is still free
            try {
                let preventdouble = await classdata.db.databasequerryhandler_secure(`select * from bubbledns_servers where subdomainname = ? AND id != ?`, [bubblednsserver.subdomainname, bubblednsserver.id])
                if (preventdouble.length) {
                    resolve({ "success": false, "msg": "Subdomainname already in use" })
                    return
                }
            }
            catch (err) {
                if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                resolve({ "success": false, "msg": "Unknown Error" })
                return;
            }


            classdata.db.databasequerryhandler_secure(`UPDATE bubbledns_servers set subdomainname=?,enabled_dns=?,enabled_web=?,ipv4address=?,ipv6address=?,masternode=? where id =? `, [bubblednsserver.subdomainname, bubblednsserver.enabled_dns, bubblednsserver.enabled_web, bubblednsserver.ipv4address, bubblednsserver.ipv6address, bubblednsserver.masternode, bubblednsserver.id], function (err, results) {
                if (err) {
                    if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                }

                if (results.affectedRows == 1) {
                    resolve({ "success": true, "data": "Done" });
                    return;
                }
                else {
                    resolve({ "success": false, "msg": "Databaseupdate failed" })
                    return;
                }

            });

        });
    }

    bubbledns_servers_delete(bubblednsserver) {
        var that = this;
        return new Promise(async (resolve) => {

            let requiredFields = { "id": "number" };
            bubblednsserver = addfunctions.objectconverter(bubblednsserver)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, bubblednsserver)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }

            classdata.db.databasequerryhandler_secure(`DELETE FROM bubbledns_servers where id =?`, [bubblednsserver.id], function (err, results) {
                if (err) {
                    if (that.config.debug) { that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-ADMIN-Warning" }) }
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                }

                if (results.affectedRows == 1) {
                    resolve({ "success": true, "data": "Done" });
                    return;
                }
                else {
                    resolve({ "success": false, "msg": "Databaseupdate failed" })
                    return;
                }

            });

        });
    }

}

export { apiclass_admin }
