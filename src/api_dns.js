
"use strict";
import { addfunctions } from "./addfunctions.js"
import { classdata } from './main.js';

class apiclass_dns {
    constructor(config, log) {
        this.config = config;
        this.log = log
    }

    
    async dnsentry_update(user, dnsentry) {
        var that = this;
        //Check if everything that's needed in dnsentry is set
        {


            let requiredFields = { "entryname": "string", "entryvalue": ["string", "number"], "entrytype": "string", "domainid": "number", "id": "number" };
            dnsentry = addfunctions.objectconverter(dnsentry)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, dnsentry)
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        //Entryname is always lowercase
        dnsentry.entryname = dnsentry.entryname.toLowerCase()


        //Check if the dns_entry exists and user is it's owner
        {
            let dnsentryfromdb = await classdata.db.databasequerryhandler_secure(`select * from dns_entries where ownerid = ? and id = ?`, [user.get_user_public().id, dnsentry.id]);
            if (!dnsentryfromdb.length) {
                return ({ "success": false, "msg": "Error updating DNS-Entry, Entry not found" })
            }
        }

        //Check if DNS-Entry is free
        {
            let testvalue = await classdata.db.databasequerryhandler_secure(`select * from dns_entries where entryname = ? and domainid = ? and ownerid != ?`, [dnsentry.entryname, dnsentry.domainid, user.get_user_public().id]);
            if (testvalue.length) {
                return ({ "success": false, "msg": "DNS-Entry is already in use by a user" })
            }
        }

        //Check if there is already a CNAME Entry for the same dnsentry with a different id
        {
            let testvalue = await classdata.db.databasequerryhandler_secure(`select * from dns_entries where entryname = ? and entrytype=? and domainid = ? and id != ?`, [dnsentry.entryname, "CNAME", dnsentry.domainid, dnsentry.id]);
            if (testvalue.length) {
                return ({ "success": false, "msg": "A DNS-Entry already exists for this subdomain with a CNAME record!" })
            }
        }

        //Check if DNS-Entry is in banned
        {
            let domaindata = await classdata.db.databasequerryhandler_secure(`select * from domains where id = ?`, [dnsentry.domainid]);
            let banlist = []
            let banlist1 = await classdata.db.databasequerryhandler_secure(`select * from subdomains_banned_all`, []);
            let banlist2 = []
            //No Recursive Subdomains (like bubbledns.com.bubbledns.com)
            let banlist3 = [{ "subdomainname": domaindata[0].domainname }]

            if (domaindata[0].builtin) {
                banlist2 = await classdata.db.databasequerryhandler_secure(`select * from subdomains_banned_builtin`, [])
            }
            banlist = [...banlist1, ...banlist2, ...banlist3]
            //True=ban, false=OK
            let testvalue = banlist.some(banned => dnsentry.entryname.includes(banned.subdomainname))
            if (testvalue) {
                return ({ "success": false, "msg": "DNS-Entry-Name in banned list" })
            }

        }

        //Check if dnsentry.entryname is at least 4 characters long
        if (dnsentry.entryname.length < 4 && dnsentry.entryname !== "*" && dnsentry.entryname !== "@") {
            return ({ "success": false, "msg": "DNS-Entry-Name too short (4 is min)" });
        }
        //Check if dnsentry.entryname is max 19 characters long
        if (dnsentry.entryname.length > 20) {
            return ({ "success": false, "msg": "DNS-Entry-Name is too long (20 is max)" })
        }

        // Validate dnsentry.entryname to allow a-z, A-Z, 0-9, *, @, -, ., and _
        if (dnsentry.entryname.match(/^[a-zA-Z0-9*@\-._]+$/) === null) {
            return ({ "success": false, "msg": "DNS-Entry-Name contains unallowed characters" });
        }

        //Check if dnsentry.entryvalue is max 494 characters long
        if (dnsentry.entryvalue.length > 495) {
            return ({ "success": false, "msg": "DNS-Entry-Value is too long (495 is max)" })
        }

        if (!addfunctions.check_dns_entry_validation(dnsentry.entrytype, dnsentry.entryvalue)) {
            return ({ "success": false, "msg": "DNS-Type wouldn't work with DNS-Value" });
        }

        //Check if entrytype is allowed to save
        {
            let domain = await classdata.db.databasequerryhandler_secure(`select * from domains where id=?`, [dnsentry.domainid]);
            if (domain[0].builtin && !classdata.db.routinedata.bubbledns_settings.allowed_dnstype_entries_builtin.includes(dnsentry.entrytype)) {
                return ({ "success": false, "msg": "DNS-Type not allowed" });
            }
            else if (!domain[0].builtin && !classdata.db.routinedata.bubbledns_settings.allowed_dnstype_entries_custom.includes(dnsentry.entrytype)) {
                return ({ "success": false, "msg": "DNS-Type not allowed" });
            }
        }


        let time = addfunctions.current_time()
        let currenttime = `${time.year}-${time.month}-${time.day} ${time.hour}:${time.min}:${time.sec}`

        const databaseupdate = await classdata.db.databasequerryhandler_secure(`UPDATE dns_entries SET entryname = ?,entryvalue = ? ,entrytype = ? , lastchangedtime = ? where id = ? and ownerid = ?`, [dnsentry.entryname, dnsentry.entryvalue, dnsentry.entrytype, currenttime, dnsentry.id, user.get_user_public().id]);
        if (databaseupdate.affectedRows === 1) {
            return ({ "success": true, "data": "Done" })
        }
        else {
            return ({ "success": false, "msg": "Databaseupdate failed" })
        }
    }

    async dnsentry_delete(user, dnsentry) {
        var that = this;

        //Check if everything that's needed in dnsentry is set

        {
            let requiredFields = { "id": "number" };
            dnsentry = addfunctions.objectconverter(dnsentry)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, dnsentry)
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        const databaseupdate = await classdata.db.databasequerryhandler_secure(`DELETE FROM dns_entries where ownerid = ? and id = ?`, [user.get_user_public().id, dnsentry.id]);
        if (databaseupdate.affectedRows === 1) {
            return ({ "success": true, "data": "Done" })
        }
        else {
            return ({ "success": false, "msg": "Databaseupdate failed" })
        }
    }

    async dnsentry_list(user, dnsentry = null) {
        var that = this;

        if (dnsentry == null) {
            const databaseupdate = await classdata.db.databasequerryhandler_secure(`SELECT * FROM dns_entries where ownerid = ?`, [user.get_user_public().id]);
            return { "success": true, "data": databaseupdate }
        }
        else {

            //Check if everything that's needed in dnsentry is set
            {
                let requiredFields = { "id": "number" };
                dnsentry = addfunctions.objectconverter(dnsentry)
                let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, dnsentry)
                if (!check_for_correct_datatype.success) {
                    return ({ "success": false, "msg": check_for_correct_datatype.msg })
                }
            }

            const databaseupdate = await classdata.db.databasequerryhandler_secure(`SELECT * FROM dns_entries where ownerid = ? and id = ?`, [user.get_user_public().id, dnsentry.id]);
            return { "success": true, "data": databaseupdate }
        }
    }

    async dnsentry_create(user, dnsentry) {
        var that = this;

        //Check if everything that's needed in dnsentry is set
        {
            let requiredFields = { "entryname": "string", "entryvalue": ["string", "number"], "entrytype": "string", "domainid": "number" };
            dnsentry = addfunctions.objectconverter(dnsentry)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, dnsentry)
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        //Entryname is always lowercase
        dnsentry.entryname = dnsentry.entryname.toLowerCase()


        //Check if user is allowed to use the domainname or is the owner
        {
            let testvalue1 = await classdata.db.databasequerryhandler_secure(`select * from domains where id = ? AND (ownerid = ? OR builtin = ?) AND isregistered = ?;`, [dnsentry.domainid, user.get_user_public().id, true, true]);
            let testvalue2 = await classdata.db.databasequerryhandler_secure(`select * from domains_share where domainid = ? AND userid = ?`, [dnsentry.domainid, user.get_user_public().id]);
            let isallowedtouse = testvalue1.concat(testvalue2)
            if (!isallowedtouse.length) {
                return ({ "success": false, "msg": "Domain doesn't exist or user is not the owner / not shared with you" })
            }
        }


        //Check if DNS-Entry is free
        {
            let testvalue = await classdata.db.databasequerryhandler_secure(`select * from dns_entries where entryname = ? and domainid = ? and ownerid != ?`, [dnsentry.entryname, dnsentry.domainid, user.get_user_public().id]);
            if (testvalue.length) {
                return ({ "success": false, "msg": "DNS-Entry is already in use by a user" })
            }
        }

        //Check if there is already a CNAME Entry for the same dnsentry
        {
            let testvalue = await classdata.db.databasequerryhandler_secure(`select * from dns_entries where entryname = ? and entrytype=? and domainid = ?`, [dnsentry.entryname, "CNAME", dnsentry.domainid]);
            if (testvalue.length) {
                return ({ "success": false, "msg": "A DNS-Entry already exists for this subdomain with a CNAME record!" })
            }
        }

        //Check if DNS-Entry-limit isn't reached already
        {
            let testvalue = await classdata.db.databasequerryhandler_secure(`select * from dns_entries where ownerid = ?`, [user.get_user_public().id]);
            if (testvalue.length >= user.get_user_public().maxentries) {
                return ({ "success": false, "msg": "DNS-Entry-Limit reached" })
            }
        }

        //Check if DNS-Entry is in banned
        {
            let domaindata = await classdata.db.databasequerryhandler_secure(`select * from domains where id = ?`, [dnsentry.domainid]);
            let banlist = []
            let banlist1 = await classdata.db.databasequerryhandler_secure(`select * from subdomains_banned_all`, []);
            let banlist2 = []
            //No Recursive Subdomains (like bubbledns.com.bubbledns.com)
            let banlist3 = [{ "subdomainname": domaindata[0].domainname }]

            if (domaindata[0].builtin) {
                banlist2 = await classdata.db.databasequerryhandler_secure(`select * from subdomains_banned_builtin`, [])
            }
            banlist = [...banlist1, ...banlist2, ...banlist3]
            //True=ban, false=OK
            let testvalue = banlist.some(banned => dnsentry.entryname.includes(banned.subdomainname))
            if (testvalue) {
                return ({ "success": false, "msg": "DNS-Entry-Name in banned list" })
            }

        }

        //Check if dnsentry.entryname is at least 4 characters long
        if (dnsentry.entryname.length < 4 && dnsentry.entryname !== "*" && dnsentry.entryname !== "@") {
            return ({ "success": false, "msg": "DNS-Entry-Name too short (4 is min)" });
        }
        //Check if dnsentry.entryname is max 19 characters long
        if (dnsentry.entryname.length > 20) {
            return ({ "success": false, "msg": "DNS-Entry-Name is too long (20 is max)" })
        }

        // Validate dnsentry.entryname to allow a-z, A-Z, 0-9, *, @, -, ., and _
        if (dnsentry.entryname.match(/^[a-zA-Z0-9*@\-._]+$/) === null) {
            return ({ "success": false, "msg": "DNS-Entry-Name contains unallowed characters" });
        }

        //Check if dnsentry.entryvalue is max 494 characters long
        if (dnsentry.entryvalue.length > 495) {
            return ({ "success": false, "msg": "DNS-Entry-Value is too long (495 is max)" })
        }

        if (!addfunctions.check_dns_entry_validation(dnsentry.entrytype, dnsentry.entryvalue)) {
            return ({ "success": false, "msg": "DNS-Type wouldn't work with DNS-Value" });
        }


        //Check if entrytype is allowed to save
        {
            let domain = await classdata.db.databasequerryhandler_secure(`select * from domains where id=?`, [dnsentry.domainid]);
            if (domain[0].builtin && !classdata.db.routinedata.bubbledns_settings.allowed_dnstype_entries_builtin.includes(dnsentry.entrytype)) {
                return ({ "success": false, "msg": "DNS-Type not allowed" });
            }
            else if (!domain[0].builtin && !classdata.db.routinedata.bubbledns_settings.allowed_dnstype_entries_custom.includes(dnsentry.entrytype)) {
                return ({ "success": false, "msg": "DNS-Type not allowed" });
            }
        }


        //Find free id for the subdomain
        do {
            var randomid = addfunctions.randomidf()
            var answer = await classdata.db.databasequerryhandler_secure(`select * from dns_entries where id = ?`, [randomid]);
        }
        while (answer && answer.length)


        //Add
        //Get current time
        let time = addfunctions.current_time()
        let currenttime = `${time.year}-${time.month}-${time.day} ${time.hour}:${time.min}:${time.sec}`

        await classdata.db.databasequerryhandler_secure(`INSERT INTO dns_entries VALUES (?,?,?,?,?,?,?)`, [randomid, user.get_user_public().id, dnsentry.domainid, currenttime, dnsentry.entryname, dnsentry.entryvalue, dnsentry.entrytype]);
        return ({ "success": true, "data": "Done" })

    }

    async domain_list_owner(user, domain = null) //Domainnames the user is the owner of //If domainid is set, only query this specific domainid
    {
        var that = this;
        var shared_list_query = `select users.mailaddress,users.id from domains_share INNER JOIN users on domains_share.userid = users.id where domains_share.domainid = "?" `
        var dnsentry_list_qeury = `select dns_entries.* from dns_entries INNER JOIN domains ON domains.id = dns_entries.domainid where dns_entries.ownerid = ? AND domains.id=? `


        if (domain == null) {

            var databeentryofdomains = await classdata.db.databasequerryhandler_secure(`select * from domains where ownerid=? AND isregistered=?`, [user.get_user_public().id, true])

            for (let i = 0; i < databeentryofdomains.length; i++) {
                databeentryofdomains[i].shared_list = await classdata.db.databasequerryhandler_secure(shared_list_query, [databeentryofdomains[i].id])
                databeentryofdomains[i].dns_list = await classdata.db.databasequerryhandler_secure(dnsentry_list_qeury, [user.get_user_public().id, databeentryofdomains[i].id])
            }

            return ({ "success": true, "data": databeentryofdomains })
        }
        else {

            //Check if everything that's needed in dnsentry is set
            {
                let requiredFields = { "id": "number" };
                domain = addfunctions.objectconverter(domain)
                let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, domain)
                if (!check_for_correct_datatype.success) {
                    return ({ "success": false, "msg": check_for_correct_datatype.msg })
                }
            }

            var databeentryofdomains = await classdata.db.databasequerryhandler_secure(`select * from domains where ownerid=? AND id=? AND isregistered=?`, [user.get_user_public().id, domain.id, true])

            for (let i = 0; i < databeentryofdomains.length; i++) {
                databeentryofdomains[i].shared_list = await classdata.db.databasequerryhandler_secure(shared_list_query, [databeentryofdomains[i].id])
                databeentryofdomains[i].dns_list = await classdata.db.databasequerryhandler_secure(dnsentry_list_qeury, [user.get_user_public().id, databeentryofdomains[i].id])
            }

            return ({ "success": true, "data": databeentryofdomains })
        }

    }

    async domain_list_shared(user, domain = null) //Domainnames the user got share of
    {
        var that = this;
        var dnsentry_list_query = `select dns_entries.* from dns_entries INNER JOIN domains ON domains.id = dns_entries.domainid where dns_entries.ownerid = ? AND domains.id=?`


        if (domain == null) {
            //shared by someone
            var promise1 = classdata.db.databasequerryhandler_secure(`select domains.* from domains INNER JOIN domains_share on domains_share.domainid = domains.id where domains_share.userid=? AND domains.isregistered=?`, [user.get_user_public().id, true])
            var promise2 = classdata.db.databasequerryhandler_secure(`select domains.* from domains where builtin=?`, [true])
            databeentryofdomains = await Promise.all([promise1, promise2])
            var databeentryofdomains = [...databeentryofdomains[0], ...databeentryofdomains[1]]
            for (let i = 0; i < databeentryofdomains.length; i++) {
                databeentryofdomains[i].shared_list = []
                databeentryofdomains[i].dns_list = await classdata.db.databasequerryhandler_secure(dnsentry_list_query, [user.get_user_public().id, databeentryofdomains[i].id])
            }
            return ({ "success": true, "data": databeentryofdomains })

        }
        else {

            //Check if everything that's needed in dnsentry is set
            {
                let requiredFields = { "id": "number" };
                domain = addfunctions.objectconverter(domain)
                let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, domain)
                if (!check_for_correct_datatype.success) {
                    return ({ "success": false, "msg": check_for_correct_datatype.msg })
                }
            }

            var promise1 = classdata.db.databasequerryhandler_secure(`select domains.* from domains INNER JOIN domains_share on domains_share.domainid = domains.id where domains_share.userid=? AND domains.isregistered=?`, [user.get_user_public().id, domain.id, true])
            databeentryofdomains = await Promise.all([promise1])
            for (let i = 0; i < databeentryofdomains.length; i++) {
                databeentryofdomains[i].shared_list = []
                databeentryofdomains[i].dns_list = await classdata.db.databasequerryhandler_secure(dnsentry_list_query, [user.get_user_public().id, databeentryofdomains[i].id])
            }
            return ({ "success": true, "data": databeentryofdomains })

        }
    }

    async domain_create(user, domain) {
        var that = this;
        {
            let requiredFields = { "domainname": "string" };
            domain = addfunctions.objectconverter(domain)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, domain)
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        //Domainname is always lowercase
        domain.domainname = domain.domainname.toLowerCase()

        //Check if domainname is a valid Domain
        if (!addfunctions.isTLDomain(domain.domainname)) {
            return ({ "success": false, "msg": "Domainname is not a valid name" })
        }

        var reregistering = false //if the domain already exists in the database and gets reactivated!

        //Check if domain is free
        {
            let testvalue = await classdata.db.databasequerryhandler_secure(`select * from domains where domainname = ?`, [domain.domainname]);
            if (testvalue.length) {
                if (!testvalue[0].isregistered && (testvalue[0].ownerid == user.get_user_public().id)) {
                    reregistering = true;
                }
                else {
                    return ({ "success": false, "msg": "Domain is already registered" })
                }

            }
        }
        if (!reregistering) {

            //Check if domain-limit isn't reached already
            {
                let testvalue = await classdata.db.databasequerryhandler_secure(`select * from domains where ownerid = ?`, [user.get_user_public().id]);
                if (testvalue.length >= user.get_user_public().maxdomains) {
                    return ({ "success": false, "msg": "Domain-Limit reached" })
                }
            }

            //Find free id for the domain
            do {
                var randomid = addfunctions.randomidf()
                var answer = await classdata.db.databasequerryhandler_secure(`select * from domains where id = ?`, [randomid]);
            }
            while (answer && answer.length)

            //Add
            let domaindata = { "id": randomid, "ownerid": user.get_user_public().id, "name": domain.domainname, "verified": 0, verificationdate: null }
            var databaseupdate = await classdata.db.databasequerryhandler_secure(`INSERT INTO domains VALUES (?,?,?,?,?,?,?,?,?)`, [domaindata.id, false, domaindata.ownerid, domaindata.name, domaindata.verified, domaindata.verificationdate, null, null, true]);
            return ({ "success": true, "data": domaindata })
        }
        else {

            //Get old Data from Database and update the entry
            {
                var olddomaindata = await classdata.db.databasequerryhandler_secure(`select * from domains where domainname = ?`, [domain.domainname]);
                let domaindata = { "id": olddomaindata[0].id, "ownerid": olddomaindata[0].ownerid, "name": olddomaindata[0].domainname, "verified": olddomaindata[0].verified, verificationdate: olddomaindata[0].verified }
                var databaseupdate = await classdata.db.databasequerryhandler_secure(`update domains set isregistered =? where id= ?`, [true, olddomaindata[0].id]);
                if (databaseupdate.affectedRows === 1) {
                    return ({ "success": true, "data": domaindata })
                }
                else {
                    return ({ "success": false, "msg": "Databaseupdate failed" })
                }
            }
        }

    }

    async domain_delete(user, domaintodelete) {
        var that = this;

        {
            let requiredFields = { "id": "number" };
            domaintodelete = addfunctions.objectconverter(domaintodelete)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, domaintodelete)
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        var domainfromdbtodelete = await classdata.db.databasequerryhandler_secure(`select * from domains where ownerid = ? and id = ?`, [user.get_user_public().id, domaintodelete.id]);
        if (domainfromdbtodelete.length) {
            const promise1 = classdata.db.databasequerryhandler_secure(`update domains set isregistered =? where id= ? AND ownerid = ?`, [false, domaintodelete.id, user.get_user_public().id,]);
            const promise2 = classdata.db.databasequerryhandler_secure(`DELETE FROM domains_share where domainid = ?`, [domaintodelete.id]);
            const promise3 = classdata.db.databasequerryhandler_secure(`DELETE FROM dns_entries where domainid = ?`, [domaintodelete.id]);
            var databaseupdate = await Promise.all([promise1, promise2, promise3])
            return ({ "success": true, "data": "Done" })
        }
    }

    async domain_verify(user, domaintoverify)  //Verify
    {
        var that = this;

        {
            let requiredFields = { "id": "number" };
            domaintoverify = addfunctions.objectconverter(domaintoverify)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, domaintoverify)
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        //Check if specific domain exists, user is the owner and the domain is currently registered -> Get the data of it.
        var domainfromdatabase = await this.domain_list_owner(user, { id: domaintoverify.id })
        if (!domainfromdatabase.success || domainfromdatabase.data.length === 0) {
            return ({ "success": false, "msg": "Can't get Database-Entry of Domain with ID: " + domaintoverify.id })
        }

        //If you want to verify the maindomain, drop the test to prevent that the domain fails
        if (classdata.db.routinedata.bubbledns_settings.maindomain == domainfromdatabase.data[0].domainname) {
            return ({ "success": false, "msg": "Can't verify the maindomain!" })
        }

        try {
            const promise1 = classdata.dnsserver.askrealdns(`${domainfromdatabase.data[0].domainname}`, "NS");
            const promise2 = that.dns_get_bubblednsservers()
            var dnsresponse = await Promise.all([promise1, promise2])

        }
        catch (err) {
            return ({ "success": false, "msg": "Error Verifying Domain" })
        }

        if (!dnsresponse[1].success) {
            return ({ "success": false, "msg": "Unable to resolve the dnsserver-Settings" })
        }

        for (let i = 0; i < dnsresponse[0].data.length; i++) {
            if (!addfunctions.isIPv4(dnsresponse[0].data[i])) {
                try {
                    let answer = await classdata.dnsserver.askrealdns(`${dnsresponse[0].data[i]}`, "A")
                    dnsresponse[0].data[i] = answer.data[0]
                }
                catch (err) {
                    that.log.addlog("Error Verifying Domain:" + err.err.code, { color: "yellow", warn: "API-DNS-Warning", level: 2 })
                    return ({ "success": false, "msg": "Error Verifying Domain" })
                }
            }
        }

        // Extract the data we need to check
        const dnsResponseData = dnsresponse[0].data;
        const ipv4Addresses = dnsresponse[1].data.ip.ipv4.filter(ip => ip !== null); // Filter out null values
        const ipv6Addresses = dnsresponse[1].data.ip.ipv6.filter(ip => ip !== null); // Filter out null values

        // Combine both IPv4 and IPv6 addresses
        const allIpAddresses = [...ipv4Addresses, ...ipv6Addresses];

        // Function to check if an element is in an array
        const isInArray = (item, array) => array.includes(item);

        // Check each IP address in dnsResponseData and report if it is not in allIpAddresses
        const incorrectIps = dnsResponseData.filter(ip => !isInArray(ip, allIpAddresses));

        // Print results
        if (incorrectIps.length === 0) {
            var verified = 1;
        } else {
            var verified = 0;
        }

        var verificationresult = dnsResponseData.map(function (r) {
            if (allIpAddresses.includes(r)) {
                return { "ip": r, "status": "(✓)" }
            }
            else {
                return { "ip": r, "status": "(X)" }
            }
        })

        let time = addfunctions.current_time()
        var currenttime = `${time.year}-${time.month}-${time.day} ${time.hour}:${time.min}:${time.sec}`

        //Get old Data from Database and update the entry
        var databaseupdate = await classdata.db.databasequerryhandler_secure(`UPDATE domains set verified = ?, verificationdate= ?, lastverificationresult1= ?, lastverificationresult2= ? where id = ? and ownerid = ?`, [verified, currenttime, `${verificationresult[0].ip} - ${verificationresult[0].status}`, `${verificationresult[1].ip} - ${verificationresult[1].status}`, domaintoverify.id, user.get_user_public().id]);
        if (databaseupdate.affectedRows > 0) {
            return ({ "success": true, "data": { "ns1": `${verificationresult[0].ip} - ${verificationresult[0].status}`, "ns2": `${verificationresult[1].ip} - ${verificationresult[0].status}`, "verificationsuccess": verified, "verificationdate": currenttime } })
        }
        else {
            return ({ "success": false, "msg": "Unable to update the verification updates" })
        }

    }

    async domain_share_adduser(user, domainid, mailaddress) { //Add the mailaddress to the allowed list of the domain
        var that = this;

        {
            let requiredFields = { "domainid": "number", "mailaddress": "string" };
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, { "domainid": domainid, "mailaddress": mailaddress })
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        //Check if user is the owner of the domain
        {
            let testvalue = await classdata.db.databasequerryhandler_secure(`select * from domains where ownerid = ? AND id = ? AND isregistered=?`, [user.get_user_public().id, domainid, true]);
            if (!testvalue.length) {
                return ({ "success": false, "msg": "Domain was not found!" })
            }
        }



        //Fetch the userdata from the userid
        {
            var toadduser = await classdata.db.databasequerryhandler_secure(`select * from users where mailaddress=?`, [mailaddress]);
            if (!toadduser.length) {
                return ({ "success": false, "msg": "User not found!" })
            }
        }


        //Check if user is already in the shared list
        {
            let testvalue = await classdata.db.databasequerryhandler_secure(`select * from domains_share where domainid = ? and userid = ?`, [domainid, toadduser[0].id]);
            if (testvalue.length) {
                return ({ "success": false, "msg": "User already in Share List" })
            }
        }

        //Check if toadduser is the owner of the domain
        if (user.get_user_public().id === toadduser[0].id) {
            return ({ "success": false, "msg": "You can't add yourself" })
        }

        await classdata.db.databasequerryhandler_secure(`INSERT INTO domains_share VALUES (?,?)`, [domainid, toadduser[0].id]);
        return { "success": true, "data": "Done" }
    }

    async domain_share_deleteuser(user, domainid, useridtodelete) {
        var that = this;

        {
            let requiredFields = { "domainid": "number", "useridtodelete": "number" };
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, { "domainid": domainid, "useridtodelete": useridtodelete })
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        //Check if User is the owner
        try {
            let ownercheck = await classdata.db.databasequerryhandler_secure(`select domains_share.* from domains_share INNER JOIN domains ON domains_share.domainid = domains.id where domains_share.domainid = ? AND domains_share.userid = ? AND domains.ownerid = ? AND domains.isregistered = ?`, [domainid, useridtodelete, user.get_user_public().id, true]);
            if (!ownercheck.length) {
                return ({ "success": false, "msg": "Error deleting User from Share" })
            }
        }
        catch (err) {

        }


        try {
            const promise1 = classdata.db.databasequerryhandler_secure(`DELETE FROM domains_share where domainid = ? and userid = ?`, [domainid, useridtodelete]);
            const promise2 = classdata.db.databasequerryhandler_secure(`DELETE FROM dns_entries where domainid = ? and ownerid = ?`, [domainid, useridtodelete]);
            await Promise.all([promise1, promise2])
            return ({ "success": true, "data": "Done" })

        }
        catch (err) {
            return ({ "success": false, "msg": "Error deleting User from Share" })
        }
    }

    async dns_get_bubblednsservers() {
        var that = this;
        var dnsservers = {
            "domain": [],
            "ip": {
                "ipv4": [],
                "ipv6": []
            }
        }
        for (let i = 0; i < classdata.db.routinedata.bubbledns_servers.length; i++) {
            if (classdata.db.routinedata.bubbledns_servers[i].enabled_dns && classdata.db.routinedata.bubbledns_servers[i].synctest) {
                dnsservers.domain.push(`${classdata.db.routinedata.bubbledns_servers[i].subdomainname}.${classdata.db.routinedata.bubbledns_settings.maindomain}`)
                dnsservers.ip.ipv4.push(classdata.db.routinedata.bubbledns_servers[i].public_ipv4)
                dnsservers.ip.ipv6.push(classdata.db.routinedata.bubbledns_servers[i].public_ipv6)
            }
        }
        return ({ "success": true, "data": dnsservers })
    }

    async dns_get_allowed_dnstype_entries() {
        return ({ "success": true, "data": { "bulitin": classdata.db.routinedata.bubbledns_settings.allowed_dnstype_entries_builtin, "custom": classdata.db.routinedata.bubbledns_settings.allowed_dnstype_entries_custom } })

    }

}

export { apiclass_dns }