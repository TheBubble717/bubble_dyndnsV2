"use strict";
import { addfunctions } from "./addfunctions.js"
import fs from "fs"
import { mainlog, logclass } from "bubble_log_library"
import { mysqlclass } from "./database.js"
import { dnsclass } from "./dns_server.js"
import { webclass } from "./web_server.js"
import { mailclass } from "./mail_client.js"
import { tasks as web_tasks_admin } from "./web_tasks_admin.js"
import { tasks as web_tasks_dns } from "./web_tasks_dns.js"
import { tasks as web_tasks_acc } from "./web_tasks_acc.js"
import { apiclass_dns } from "./api_dns.js"
import { apiclass_acc } from "./api_acc.js"
import { apiclass_admin } from "./api_admin.js"
import { userclass } from "./classes.js"

var log = mainlog({ screenLogLevel: 1, addcallerlocation: true })
var classdata = {}
classdata.classes = {
    "userclass": userclass
}

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.emit('SIGINT');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log.addlog(reason.stack, { color: "red", warn: "Crash", level: 99 })
    process.emit('SIGINT');
    process.exit(1);
});

process.on('exit', (errorcode) => {
    log.addlog(`Program is exiting with eror Code ${errorcode}`, { color: "red", warn: "Crash", level: 99 })
    process.emit('SIGINT');
    process.exit(1);
});



async function bubbledns() {


    //Load configs,logs,...
    await log.activatestream("log/", addfunctions.unixtime_to_local() + " - Mainlog.log")
    var env = process.env.NODE_ENV || 'production';
    var configFileName = env === 'development' ? 'debugconfig.json' : 'config.json';
    let rawconfig = fs.readFileSync(`./${configFileName}`);
    let config = JSON.parse(rawconfig)
    log.addlog(`Starting in ${env} Mode using Config: ${configFileName}`, { color: "green", warn: "Startup-Info", level: 3 })


    //Activate MYSQL
    log.addlog("Activating Mysql-Connection", { color: "green", warn: "Startup-Info", level: 3 })
    var dblog = new logclass({ screenLogLevel: config.mysql.screenLogLevel, fileLogLevel: config.mysql.fileLogLevel, addcallerlocation: config.mysql.debug })
    await dblog.activatestream("log/", addfunctions.unixtime_to_local() + " - Database.log")
    classdata.db = new mysqlclass({ ...config.mysql, public_ip: config.public_ip }, dblog)
    await classdata.db.connect(async function (err, res) {
        if (err) {
            log.addlog(err, { color: "red", warn: "Startup-Error", level: 3 });
            process.exit(2)
        }
        log.addlog(res, { color: "green", warn: "Startup-Info", level: 3 })

    });
    await classdata.db.enable_routines()

    //Activate Mailservice
    log.addlog("Activating Mailserver-Connection", { color: "green", warn: "Startup-Info", level: 3 })
    var maillog = new logclass({ screenLogLevel: config.mailclient.screenLogLevel, fileLogLevel: config.mailclient.fileLogLevel, addcallerlocation: config.mailclient.debug })
    await maillog.activatestream("log/", addfunctions.unixtime_to_local() + " - Mail_Client.log")
    classdata.mail = new mailclass(config.mailclient, maillog)

    //Activate API & Tasks
    var apilog = new logclass({ screenLogLevel: config.api.screenLogLevel, fileLogLevel: config.api.fileLogLevel, addcallerlocation: config.api.debug })
    await apilog.activatestream("log/", addfunctions.unixtime_to_local() + " - APIlog.log")
    classdata.api = {
        "dns": new apiclass_dns(config.api, apilog),
        "account": new apiclass_acc(config.api, apilog),
        "admin": new apiclass_admin(config.api, apilog),
    }
    classdata.tasks = {
        "dns": web_tasks_dns,
        "account": web_tasks_acc,
        "admin": web_tasks_admin,
    }


    let existsindb = classdata.db.routinedata.bubbledns_servers.filter(function (r) { if (((r.public_ipv4 == config.public_ip) || (r.public_ipv6 == config.public_ip))) { return true } })
    let existsindb_enableweb = existsindb.filter(function (r) { if (r.enabled_web == true) { return true } })


    if (existsindb.length) {
        //Activate DNS-Server (Gets always activated if databseentry of it exists, even if it is not used; It doesn't get registered as nameservers; Needed for Synctest)
        log.addlog("Activating DNS-Server", { color: "green", warn: "Startup-Info", level: 3 })
        var dnslog = new logclass({ screenLogLevel: config.dnsserver.screenLogLevel, fileLogLevel: config.dnsserver.fileLogLevel, addcallerlocation: config.dnsserver.debug })
        await dnslog.activatestream("log/", addfunctions.unixtime_to_local() + " - DNS_Server.log")
        classdata.dnsserver = new dnsclass({ ...config.dnsserver, public_ip: config.public_ip }, dnslog)
        await classdata.dnsserver.createserver(async function (err, res) {
            if (err) {
                log.addlog(err, { color: "red", warn: "Startup-Error", level: 3 });
                process.exit(2)
            }
            log.addlog(res, { color: "green", warn: "Startup-Info", level: 3 })
        });

    }
    else {
        log.addlog("This BubbleDNS-Server is not found in the Database, waiting for Database-Update", { color: "yellow", warn: "Startup-Info", level: 3 })
    }


    //Check if Server should start Webserver
    if (existsindb_enableweb.length) {
        //Activate Web-Server
        log.addlog("Activating WEB-Server", { color: "green", warn: "Startup-Info", level: 3 })
        var weblog = new logclass({ screenLogLevel: config.webserver.screenLogLevel, fileLogLevel: config.webserver.fileLogLevel, addcallerlocation: config.webserver.debug })
        await weblog.activatestream("log/", addfunctions.unixtime_to_local() + " - WEB_Server.log")
        classdata.webserver = new webclass({ ...config.webserver, public_ip: config.public_ip }, weblog)
        await classdata.webserver.createserver(async function (err, res) {
            if (err) {
                log.addlog(err, { color: "red", warn: "Startup-Error", level: 3 });
                process.exit(2)
            }
            log.addlog(res, { color: "green", warn: "Startup-Info", level: 3 })
        });
    }

    if (classdata.db.routinedata.bubbledns_settings.newServer) {
        log.addlog("First Time Installer started!", { color: "green", warn: "FirstStartup", level: 3 })
        let randompassword = randompasswd()

        //Creating User and making to to an admin
        let newuser = await classdata.api.account.auth_register({ "mailaddress": `bubbledns@${classdata.db.routinedata.bubbledns_settings.maindomain}`, "password1": randompassword, "password2": randompassword, "useripv4": null, "useripv6": null });
        if (!newuser.success) {
            let err = `Error creating User: ${newuser.msg}`
            log.addlog(err, { color: "red", warn: "FirstStartup", level: 3 })
            process.exit(2)
        }
        let newuserdata = new classdata.classes.userclass(newuser.data)
        let downloaduserdatastatus = await newuserdata.get_user_from_id()
        if (!downloaduserdatastatus.success) {
            let err = `Error downloading Userdata: ${downloaduserdatastatus.msg}`
            log.addlog(err, { color: "red", warn: "FirstStartup", level: 3 })
            process.exit(2)
        }
        let updateusertoadmin = await classdata.api.account.update_user({ "id": newuserdata.get_user_public().id, "isactive": true, "confirmedmail": true, "isadmin": true, "maxdomains": 10, "maxentries": 100, "newpassword": false, "mailaddress": newuserdata.get_user_public().mailaddress, "password": null })
        if (!updateusertoadmin.success) {
            let err = `Error making User to Admin: ${updateusertoadmin.msg}`
            log.addlog(err, { color: "red", warn: "FirstStartup", level: 3 })
            process.exit(2)
        }
        log.addlog(`Admin "${newuserdata.get_user_public().mailaddress}" created with password "${randompassword}"`, { color: "green", warn: "FirstStartup", level: 3 })


        //Adding BubbleDNS-NameServer
        let ip = {
            "ipv4": function () { if (addfunctions.isIPv4(config.public_ip)) { return config.public_ip } else { return null } }(),
            "ipv6": function () { if (addfunctions.isIPv6(config.public_ip)) { return config.public_ip } else { return null } }()
        }
        let addingbubblednsserver = await classdata.api.admin.bubbledns_servers_create({ "subdomainname": "ns1", "enabled_dns": 1, "enabled_web": 1, "public_ipv4": ip.ipv4, "public_ipv6": ip.ipv6, "internal_ipv4": null, "internal_ipv6": null, "masternode": 1 })
        if (!addingbubblednsserver.success) {
            let err = `Error creating BubbleDNS_Server: ${addingbubblednsserver.msg}`
            log.addlog(err, { color: "red", warn: "FirstStartup", level: 3 })
            process.exit(2)
        }
        await classdata.db.databasequerryhandler_secure(`update bubbledns_servers set synctest=?`, [true], function (error, res) {
            if (error) {
                let err = `Error updating BubbleDNS_Server to synctest=1: ${error}`
                log.addlog(err, { color: "red", warn: "FirstStartup", level: 3 })
                process.exit(2)
            }
        });
        log.addlog(`Bubbledns-Server ns1.${classdata.db.routinedata.bubbledns_settings.maindomain} created and set to Main-Server`, { color: "green", warn: "FirstStartup", level: 3 })
        log.addlog(`Please add a second Bubbledns-Server nsX.${classdata.db.routinedata.bubbledns_settings.maindomain} for the functionality of the server`, { color: "green", warn: "FirstStartup", level: 3 })


        //Creating Main Domain
        let domaincreation = await classdata.api.dns.domain_create(newuserdata, { "domainname": classdata.db.routinedata.bubbledns_settings.maindomain })
        if (!domaincreation.success) {
            let err = `Error creating Main-Domain: ${domaincreation.msg}`
            log.addlog(err, { color: "red", warn: "FirstStartup", level: 3 })
            process.exit(2)
        }
        await classdata.db.databasequerryhandler_secure(`update domains set builtin=1, verified=1 where domainname=?`, [classdata.db.routinedata.bubbledns_settings.maindomain], function (error, res) {
            if (error) {
                let err = `Error creating Main-Domain: ${error}`
                log.addlog(err, { color: "red", warn: "FirstStartup", level: 3 })
                process.exit(2)
            }
        });
        log.addlog(`Domain ${classdata.db.routinedata.bubbledns_settings.maindomain} created as builtin and owner set to ${newuserdata.get_user_public().mailaddress}`, { color: "green", warn: "FirstStartup", level: 3 })



        //Disabling First Time Installer 
        await classdata.db.databasequerryhandler_secure(`update bubbledns_settings set variablevalue=? where variablename=?`, [false, "newServer"], function (error, res) {
            if (error) {
                let err = `Error creating Main-Domain: ${error}`
                log.addlog(err, { color: "red", warn: "FirstStartup", level: 3 })
                process.exit(2)
            }
        });
        log.addlog(`Disabling First Time Installer`, { color: "green", warn: "FirstStartup", level: 3 })
        log.addlog(`Killing Process`, { color: "green", warn: "FirstStartup", level: 3 })
        process.exit(2)
    }





}


export { bubbledns, classdata }


function randompasswd(length) {
    var length = 18
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}



