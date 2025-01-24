"use strict";
import { addfunctions } from "./addfunctions.js";
import { classdata } from './main.js';
import https from 'node:https'
import * as mysql from "mysql"

class mysqlclass {
    constructor(config, log, packageJson) {
        this.config = config;
        this.pool = null;
        this.log = log;
        this.packageJson = packageJson;

        this.routinedata = {
            "domains": [],
            "bubbledns_settings": [],
            "bubbledns_servers": [],
            "cluster_status": null,
            "this_server": null,
            "mailserver_settings": [],
        },
            this.routinecaches = {
                dnsentries: [],
                dnsentries_locks: {}
            }
        this.routinemanger = new RoutineManager()
    }

    async connect() {
        var that = this

        ///Need a better solution than copying the function
        var check_cluster = async function () {

            let ispartofcluster = await classdata.db.databasequerryhandler_secure(`SHOW VARIABLES LIKE 'wsrep_on';`, [])
            if (ispartofcluster[0].Value == "ON") {

                //Check myself, if I am in the cluster right now!
                {
                    let testvalue = await classdata.db.databasequerryhandler_secure(`SHOW STATUS LIKE 'wsrep_cluster_status';`, [])
                    if (testvalue[0].Value != "Primary") {
                        that.routinedata.cluster_status = { "status": false, "clustertype": 1, "err": `Galera Cluster Node not functional, ${testvalue[0].Variable_name} = ${testvalue[0].Value}` }
                        that.log.addlog(`Cluster Error: ${that.routinedata.cluster_status.err}`, { color: "red", warn: "Startup-Error", level: 3 })
                        return false;
                    }
                }

                //Check myself, if I am in sync with the cluster right now!
                {
                    let testvalue = await classdata.db.databasequerryhandler_secure(`SHOW STATUS LIKE 'wsrep_local_state_comment';`, [])
                    if (testvalue[0].Value != "Synced") {
                        that.routinedata.cluster_status = { "status": false, "clustertype": 1, "err": `Galera Cluster Node not functional, ${testvalue[0].Variable_name} = ${testvalue[0].Value}` }
                        that.log.addlog(`Cluster Error: ${that.routinedata.cluster_status.err}`, { color: "red", warn: "Startup-Error", level: 3 })
                        return false;
                    }
                }
                return true;
            }
            //No Cluster -> Always OK //// cluster_status.clustertype=0 -> NO CLUSTER , cluster_status.clustertype=1 -> Working Cluster
            else {
                return true;
            }
        }

        try {
            that.pool = mysql.createPool(that.config.connectiondata);
            await new Promise((resolve, reject) => {
                that.pool.getConnection(async function (err, connection) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(connection);
                });
            });

            var clusterstatus = false
            do {
                clusterstatus = await check_cluster()
                if (!clusterstatus) {
                    await addfunctions.waittime(5)
                }

            }
            while (!clusterstatus)

            let answer = `Successfully connected to Mysql-Database`
            return (answer);

        } catch (err) {
            const error = `Error connecting to database! Message: ${err}`
            throw new Error(error);
        }


    }

    async databasequerryhandler_unsecure(querry, callback) {
        var that = this;

        try {
            // Execute the query using the connection pool
            const result = await new Promise((resolve, reject) => {
                that.pool.query(querry, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(res);
                });
            });

            if (callback && typeof callback == 'function') {
                await callback("", result);
            }
            return (result);

        } catch (err) {
            const error = `Error in databasequerryhandler: ${err}`;
            if (callback && typeof callback === 'function') {
                await callback(error, null);
            }
            throw new Error(error);
        }


    }

    async databasequerryhandler_secure(query, values, callback) {
        const that = this;

        try {
            // Execute the query using the connection pool
            const result = await new Promise((resolve, reject) => {
                that.pool.query(query, values, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(res);
                });
            });

            return (result);

        } catch (err) {
            const error = `Error in databasequerryhandler: ${err}`;
            throw new Error(error);
        }
    }

    dns_lookup(entryname, entrytype, domainid) {
        var that = this;

        // Initialize a lock system for handling concurrency
        if (!that.routinecaches.dnsentries_locks) {
            that.routinecaches.dnsentries_locks = {};
        }

        const lockKey = `${entryname}:${entrytype}:${domainid}`;

        return new Promise(async (resolve, reject) => {
            // Check if there's an ongoing request for the same key
            if (that.routinecaches.dnsentries_locks[lockKey]) {
                that.routinecaches.dnsentries_locks[lockKey].then(resolve).catch(reject);
                return;
            }

            // Create a new lock for this request
            const locking_promise = new Promise(async (lockResolve, lockReject) => {
                var cached_no_data = 0; //4 Means everything exists with noDATA
                try {

                    //Checked for cached entry exactly
                    const locallysavedexact = that.routinecaches.dnsentries.filter(function (r) { return r.entryname === entryname && (r.entrytype === entrytype || r.entrytype === "CNAME") && r.domainid === domainid; })
                    if (locallysavedexact.length) {

                        //CNAME exists, and has DATA
                        const locallysavedexact_cname = locallysavedexact.filter(function (r) { return r.entrytype === "CNAME" })
                        if (locallysavedexact_cname.length) {
                            if (!locallysavedexact_cname[0].noData) {
                                lockResolve(locallysavedexact_cname)
                                return;
                            }
                            cached_no_data++
                        }

                        //Entry with Entrytype exists, and has DATA
                        const locallysavedexact_entrytype = locallysavedexact.filter(function (r) { return r.entrytype === entrytype })
                        if (locallysavedexact_entrytype.length) {
                            if (!locallysavedexact_entrytype[0].noData) {
                                lockResolve(locallysavedexact_entrytype)
                                return;
                            }
                            cached_no_data++
                        }
                    }


                    //Checked for cached entry exactly
                    const locallysavedstar = that.routinecaches.dnsentries.filter(function (r) { return r.entryname === "*" && (r.entrytype === entrytype || r.entrytype === "CNAME") && r.domainid === domainid; })
                    if (locallysavedstar.length) {


                        //CNAME exists, and has DATA
                        const locallysavedstar_cname = locallysavedstar.filter(function (r) { return r.entrytype === "CNAME" })
                        if (locallysavedstar_cname.length) {
                            if (!locallysavedstar_cname[0].noData) {
                                lockResolve(locallysavedstar_cname)
                                return;
                            }
                            cached_no_data++
                        }



                        //Entry with Entrytype exists, and has DATA
                        const locallysavedexact_entrytype = locallysavedstar.filter(function (r) { return r.entrytype === entrytype })
                        if (locallysavedexact_entrytype.length) {
                            if (!locallysavedexact_entrytype[0].noData) {
                                lockResolve(locallysavedexact_entrytype)
                                return;
                            }
                            cached_no_data++
                        }
                    }

                    //If cached Data of all of them exist(cname_exactly,entrytype_exactly,cname_star,entrytype_star) -> Reject
                    if (cached_no_data === 4) {
                        lockReject("No Data found! (Cached)");
                        return;
                    }

                    // If "@" (main entry) is requested
                    if (entryname === "@") {
                        const response = await that.databasequerryhandler_secure(
                            `select * FROM dns_entries where entryname = ? and (entrytype = ? or entrytype =?) and domainid = ?`,
                            ["@", entrytype, "CNAME", domainid]
                        );

                        if (response.length) {
                            that.routinecaches.dnsentries = that.routinecaches.dnsentries.concat(response);
                            lockResolve(response);
                        } else {
                            that.routinecaches.dnsentries.push({ entryname, entrytype, domainid, noData: true });
                            if (entrytype !== "CNAME") { that.routinecaches.dnsentries.push({ entryname, entrytype: "CNAME", domainid, noData: true }); }
                            lockReject("No Data found! (Requested)");
                        }
                        return;
                    }

                    // Database query for both exact and wildcard entries
                    const [exactResponse, wildcardResponse] = await Promise.all([
                        that.databasequerryhandler_secure(
                            `select * FROM dns_entries where entryname = ? and (entrytype = ? or entrytype =?)  and domainid = ?`,
                            [entryname, entrytype, "CNAME", domainid]
                        ),
                        that.databasequerryhandler_secure(
                            `select * FROM dns_entries where entryname = ? and (entrytype = ? or entrytype =?) and domainid = ?`,
                            ["*", entrytype, "CNAME", domainid]
                        ),
                    ]);

                    if (exactResponse.length) {
                        that.routinecaches.dnsentries = that.routinecaches.dnsentries.concat(exactResponse);
                        lockResolve(exactResponse);
                        return;
                    } else {
                        that.routinecaches.dnsentries.push({ entryname, entrytype, domainid, noData: true });
                        if (entrytype !== "CNAME") { that.routinecaches.dnsentries.push({ entryname, entrytype: "CNAME", domainid, noData: true }); }
                    }

                    if (wildcardResponse.length) {
                        const existingWildcard = that.routinecaches.dnsentries.filter(function (r) {
                            return r.entryname === "*" && r.entrytype === entrytype && r.domainid === domainid;
                        });
                        if (!existingWildcard.length) {
                            that.routinecaches.dnsentries = that.routinecaches.dnsentries.concat(wildcardResponse);
                        }
                        lockResolve(wildcardResponse);
                        return;
                    } else {
                        const existingWildcard = that.routinecaches.dnsentries.filter(function (r) {
                            return r.entryname === "*" && r.entrytype === entrytype && r.domainid === domainid;
                        });
                        if (!existingWildcard.length) {
                            that.routinecaches.dnsentries.push({ entryname: "*", entrytype, domainid, noData: true });
                            if (entrytype !== "CNAME") { that.routinecaches.dnsentries.push({ entryname: "*", entrytype: "CNAME", domainid, noData: true }); }
                        }
                    }

                    lockReject("No Data found! (Requested)");
                } catch (err) {
                    lockReject(err);
                }
            });

            that.routinecaches.dnsentries_locks[lockKey] = locking_promise;
            // Wait for the lock's result
            await that.routinecaches.dnsentries_locks[lockKey].then(resolve).catch(reject);
            delete that.routinecaches.dnsentries_locks[lockKey];

        });
    }

    async enable_routines() {
        var that = this;

        var once_startup_masternode = async function () {
            try {
                //Delete old expired testvalues
                var test = await that.databasequerryhandler_secure("delete from bubbledns_servers_testvalues where expirationtime <=?", [addfunctions.unixtime_to_local(new Date().valueOf())]);
            }
            catch (err) {
                that.log.addlog("Error deleting old testvalues", { color: "red", warn: "Routine-Error", level: 3 })
                process.exit(1000)
            }
        }

        var routine_check_cluster_status = async function () {

            let ispartofcluster = await classdata.db.databasequerryhandler_secure(`SHOW VARIABLES LIKE 'wsrep_on';`, [])
            if (ispartofcluster[0].Value == "ON") {

                //Check myself, if I am in the cluster right now!
                {
                    let testvalue = await classdata.db.databasequerryhandler_secure(`SHOW STATUS LIKE 'wsrep_cluster_status';`, [])
                    if (testvalue[0].Value != "Primary") {
                        that.routinedata.cluster_status = { "status": false, "clustertype": 1, "err": `Galera Cluster Node not functional, ${testvalue[0].Variable_name} = ${testvalue[0].Value}` }
                        that.log.addlog(`Cluster Error: ${that.routinedata.cluster_status.err}`, { color: "red", warn: "Routine-Error", level: 3 })
                        process.exit(1023)
                    }
                }

                //Check myself, if I am in sync with the cluster right now!
                {
                    let testvalue = await classdata.db.databasequerryhandler_secure(`SHOW STATUS LIKE 'wsrep_local_state_comment';`, [])
                    if (testvalue[0].Value != "Synced") {
                        that.routinedata.cluster_status = { "status": false, "clustertype": 1, "err": `Galera Cluster Node not functional, ${testvalue[0].Variable_name} = ${testvalue[0].Value}` }
                        that.log.addlog(`Cluster Error: ${that.routinedata.cluster_status.err}`, { color: "red", warn: "Routine-Error", level: 3 })
                        process.exit(1024)
                    }
                }

                that.routinedata.cluster_status = { "status": true, "clustertype": 1, "err": "" }
                return;
            }
            //No Cluster -> Always OK //// cluster_status.clustertype=0 -> NO CLUSTER , cluster_status.clustertype=1 -> Working Cluster
            else {
                that.routinedata.cluster_status = { "status": true, "clustertype": 0, "err": "" }
                return;
            }
        }

        var routine_fetch_domains = async function () {
            try {
                var domains = await that.databasequerryhandler_secure("select * from domains where isregistered=?", [true]);
                that.routinedata.domains = domains;
            }
            catch (err) {
                that.log.addlog("Error fetching Domains", { color: "red", warn: "Routine-Error", level: 3 })
                process.exit(1001)
            }
        }

        var routine_fetch_bubbledns_settings = async function () {
            try {
                var settingsraw = await that.databasequerryhandler_secure("select * from bubbledns_settings", [true]);
                var settings = {}
                for (let i = 0; i < settingsraw.length; i++) {
                    settingsraw[i].variablevalue = settingsraw[i].variablevalue.replace(/`/g, '"'); //JSON.parse requires " instead of `
                    try {
                        settings[settingsraw[i].variablename] = JSON.parse(settingsraw[i].variablevalue);
                    }
                    catch (err) {
                        settings[settingsraw[i].variablename] = settingsraw[i].variablevalue
                    }
                }
                that.routinedata.bubbledns_settings = settings;
            }
            catch (err) {
                that.log.addlog("Error fetching Bubbledns_settings", { color: "red", warn: "Routine-Error", level: 3 })
                process.exit(1002)
            }

        }

        var routine_fetch_bubbledns_servers = async function () {
            try {
                var bubbledns_servers_from_db = await that.databasequerryhandler_secure("select * from bubbledns_servers", []);
                for (let i = 0; i < bubbledns_servers_from_db.length; i++) {
                    bubbledns_servers_from_db[i].virtual = 0
                }

                //Check if something changed on this instance (f.e activating WEB) except synctest
                if (that.routinedata.bubbledns_servers.length) //Ignore if empty
                {
                    let thisserver_old = [that.routinedata.this_server]
                    if (thisserver_old[0] == null) { thisserver_old = [] }
                    let thisserver_new = bubbledns_servers_from_db.filter(function (r) { if (((r.public_ipv4 == that.config.public_ip) || (r.public_ipv6 == that.config.public_ip)) && r.virtual == 0) { return true } })
                    if (JSON.stringify(thisserver_old) != JSON.stringify(thisserver_new)) {

                        //Don't kill if only synctest changes!
                        //Prevent from touching both of the variables
                        let shallowcopy_thisserver_old = [...thisserver_old]
                        shallowcopy_thisserver_old[0] = { ...shallowcopy_thisserver_old[0] };
                        let shallowcopy_thisserver_new = [...thisserver_new]
                        shallowcopy_thisserver_new[0] = { ...shallowcopy_thisserver_new[0] };
                        delete shallowcopy_thisserver_old[0].synctest
                        delete shallowcopy_thisserver_new[0].synctest

                        if (JSON.stringify(shallowcopy_thisserver_old) != JSON.stringify(shallowcopy_thisserver_new)) {
                            that.log.addlog("SERVER UPDATE DETECTED, KILLING PROGRAM", { color: "red", warn: "Routine-Error", level: 3 })
                            process.exit(1003)
                        }
                    }
                }

                //Add the virtual Servers too
                var bubbledns_servers_from_db_virtual = await that.databasequerryhandler_secure("select * from bubbledns_servers_virtual", []);
                bubbledns_servers_from_db_virtual.forEach(virtual_server => {
                    let exists = bubbledns_servers_from_db.filter(r => r.id === virtual_server.bubblednsserverid)
                    if (exists.length) {
                        delete virtual_server.bubblednsserverid
                        virtual_server.virtual = 1
                        bubbledns_servers_from_db.push({ ...exists[0], ...virtual_server })
                    }
                    else {
                        that.log.addlog(`Real BubbleDNS-Server ${virtual_server.bubblednsserverid} of the virtual BubbleDNS-Server ${virtual_server.id} was not found!`, { color: "red", warn: "Routine-Error", level: 3 })
                    }

                });

                //Set this_server
                let this_server = bubbledns_servers_from_db.filter(function (r) { if (((r.public_ipv4 == that.config.public_ip) || (r.public_ipv6 == that.config.public_ip)) && r.virtual == 0) { return true } })
                if (this_server.length) {
                    that.routinedata.this_server = this_server[0]
                }
                else {
                    that.routinedata.this_server = null;
                }
                that.routinedata.bubbledns_servers = bubbledns_servers_from_db;
                return;

            }
            catch (err) {
                that.log.addlog("Error fetching Bubbledns_servers", { color: "red", warn: "Routine-Error", level: 3 })
                process.exit(1004)
            }
        }

        var routine_synctest_bubbledns_servers = async function () {
            try {
                return new Promise(async (resolve, reject) => {
                    resolve() //Don't wait for test to finish
                    await addfunctions.waittime(20); //Wait for the whole server to be initialized

                    //Only Synctest if the server self as Synctest =1
                    if (!that.routinedata.this_server.synctest) { return }

                    for (let i = 0; i < that.routinedata.bubbledns_servers.length; i++) {

                        //Don't test the yourself (to test IPV4 == this server) & Don't test virtual servers
                        if (!((that.routinedata.bubbledns_servers[i] === that.routinedata.this_server) || (that.routinedata.bubbledns_servers[i].virtual === 1))) {
                            try {
                                var synctestresult = await classdata.api.admin.bubbledns_servers_synctest({ "id": that.routinedata.bubbledns_servers[i].id })
                                if (that.config.debug && synctestresult.success === false) {
                                    that.log.addlog(`Synctest ${that.routinedata.bubbledns_servers[i].subdomainname}.${that.routinedata.bubbledns_settings.maindomain} failed with error: ${synctestresult.msg}`, { color: "red", warn: "Routine-Error", level: 3 })
                                }
                            }
                            catch (err) {
                                that.log.addlog(`Synctest ${that.routinedata.bubbledns_servers[i].subdomainname}.${that.routinedata.bubbledns_settings.maindomain} failed with FATAL ERROR: ${err.message}`, { color: "red", warn: "Routine-Error", level: 3 })
                            }

                        }
                    }
                    return;
                })
            }
            catch (err) {
                that.log.addlog("Error Routine routine_synctest_bubbledns_servers", { color: "red", warn: "Routine-Error", level: 3 })
                process.exit(1005)
            }

        }

        var routine_fetch_mailserver_settings = async function () {
            try {
                var mailserver_settings = await that.databasequerryhandler_secure("select * from mailserver_settings", []);
                that.routinedata.mailserver_settings = mailserver_settings;
            }
            catch (err) {
                that.log.addlog("Error fetching mailserver_settings", { color: "red", warn: "Routine-Error", level: 3 })
                process.exit(1006)
            }
        }

        var routine_delete_cache_dnsentry = async function () {
            that.routinecaches.dnsentries = [];
            return;
        }

        var routine_check_updates = async function () {
            return new Promise((resolve) => {

                var url = "https://version.bubbledns.com/version.json"
                let data = '';

                https.get(url, (response) => {
                    if (response.statusCode !== 200) {
                        that.log.addlog(`Failed to check for Updates! Status code: ${response.statusCode}`, { color: "red", warn: "Routine-Error", level: 3 })
                        resolve()
                        return;
                    }

                    response.setEncoding('utf8');

                    response.on('data', (chunk) => {
                        data += chunk;
                    });

                    response.on('end', () => {
                        try {
                            const json = JSON.parse(data);
                            if (json.version.localeCompare(that.packageJson.version, undefined, { numeric: true }) === 1) {
                                that.log.addlog(`New Version available! Please download ${json.version} from Github.`, { color: "yellow", warn: "Routine-Info", level: 2 })
                                resolve()
                            }
                            else {
                                that.log.addlog(`BubbleDNS is at the newest version available.`, { color: "green", warn: "Routine-Info", level: 2 })
                                resolve()
                            }
                            return;
                        } catch (err) {
                            that.log.addlog(`Failed to parse JSON: ${err.message}!`, { color: "red", warn: "Routine-Error", level: 3 })
                            resolve()
                            return;
                        }
                    });

                    response.on('error', (err) => {
                        that.log.addlog(`Failed to check for Updates!`, { color: "red", warn: "Routine-Error", level: 3 })
                        resolve()
                        return;
                    });
                }).on('error', (err) => {
                    that.log.addlog(`Failed to check for Updates!`, { color: "red", warn: "Routine-Error", level: 3 })
                    resolve()
                    return;
                });
            });
        }

        if (that.routinemanger.listRoutines().length) {
            throw new Error("Already active!")
        }

        await that.routinemanger.addRoutine(0, routine_check_cluster_status, 10)
        that.log.addlog("Routine: routine_check_cluster_status enabled", { color: "green", warn: "Routine-Info", level: 3 })
        await that.routinemanger.addRoutine(1, routine_fetch_domains, 30)
        that.log.addlog("Routine: Fetch_Domains enabled", { color: "green", warn: "Routine-Info", level: 3 })
        await that.routinemanger.addRoutine(2, routine_fetch_bubbledns_settings, 60)
        that.log.addlog("Routine: Fetch_Bubbledns_settings enabled", { color: "green", warn: "Routine-Info", level: 3 })
        await that.routinemanger.addRoutine(3, routine_fetch_bubbledns_servers, 30)
        that.log.addlog("Routine: Fetch_Bubbledns_servers enabled", { color: "green", warn: "Routine-Info", level: 3 })
        await that.routinemanger.addRoutine(4, routine_fetch_mailserver_settings, 30)
        that.log.addlog("Routine: Fetch_mailserver_settings enabled", { color: "green", warn: "Routine-Info", level: 3 })
        await that.routinemanger.addRoutine(5, routine_delete_cache_dnsentry, 90)
        that.log.addlog("Routine: Delete_cache_dnsentry enabled", { color: "green", warn: "Routine-Info", level: 3 })

        if(that.config.check_updates)
        {
            await that.routinemanger.addRoutine(6, routine_check_updates, 86400)
            that.log.addlog("Routine: routine_check_updates enabled", { color: "green", warn: "Routine-Info", level: 3 })
        }
        else
        {
            that.log.addlog("Routine: routine_check_updates is disabled in the Configuration File", { color: "yellow", warn: "Routine-Warning", level: 3 })
        }


        //Only Masternode
        if (classdata.db.routinedata.this_server?.masternode) {

            await that.routinemanger.addRoutine(8, routine_synctest_bubbledns_servers, 180)
            that.log.addlog("Routine: Synctest from Masternode to Slaves/Other Masters enabled", { color: "green", warn: "Routine-Info", level: 3 })
            await once_startup_masternode()
            that.log.addlog("ONCE: Startup-Commands enabled", { color: "green", warn: "Routine-Info", level: 3 })

        }

        return
    }


}

class RoutineManager {
    constructor() {
        this.routines = new Map(); // Store routines with unique identifiers
    }

    /**
     * Add a routine
     * @param {string} id - Unique identifier for the routine
     * @param {function} process - Function to be executed
     * @param {number} interval - Time in seconds between executions
     */
    async addRoutine(id, process, interval) {
        var that = this;
        if (that.routines.has(id)) {
            throw (`Routine with id "${id}" already exists.`)
        }

        const executeRoutine = async function () {
            try {
                await process();
                return;
            } catch (err) {
                throw Error(`Error in routine "${id}": ${err.message}`)
            }
        };

        try {
            await executeRoutine(); // Execute the routine immediately
            const timer = setInterval(executeRoutine, interval * 1000); // Schedule subsequent executions
            this.routines.set(id, { process, interval, timer }); // Save routine metadata
            return `Routine "${id}" added.`;
        } catch (err) {
            throw new Error(`Failed to add routine "${id}": ${err.message}`);
        }
    }

    /**
     * Remove a routine
     * @param {string} id - Unique identifier for the routine
     */
    async removeRoutine(id) {
        const routine = this.routines.get(id);
        if (!routine) {
            throw Error(`Routine with id "${id}" does not exist.`)
        }

        clearInterval(routine.timer); // Stop the routine
        this.routines.delete(id); // Remove it from the map
        return (`Routine "${id}" removed.`)
    }

    /**
     * List all active routines
     */
    listRoutines() {
        if (this.routines.size === 0) {
            return []
        }
        return (this.routines)
    }


    /**
     * Update an existing routine's interval
     * @param {string} id - Unique identifier for the routine
     * @param {number} newInterval - New interval time in milliseconds
     */
    updateRoutineInterval(id, newInterval) {
        const routine = this.routines.get(id);
        if (!routine) {
            throw Error(`Routine with id "${id}" does not exist.`)
        }

        clearInterval(routine.timer); // Clear the existing interval
        routine.timer = setInterval(routine.process, newInterval); // Set a new interval
        routine.interval = newInterval; // Update the interval

        return (`Routine "${id}" updated with new interval: ${newInterval}ms.`)
    }
}



export { mysqlclass }