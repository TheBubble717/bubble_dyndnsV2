
"use strict";
import { addfunctions } from "./addfunctions.js"
import * as crypto from 'crypto';
import { classdata } from './main.js';

class apiclass_acc {
    constructor(config, log) {
        this.config = config;
        this.log = log
    }

    
    async auth_cookie(cookie) //Login with the Cookie, Returns the userclass
    {
        var result = await classdata.db.databasequerryhandler_secure(`select users.*,users_sessions.cookie from users INNER JOIN users_sessions ON users.id = users_sessions.userid where users_sessions.cookie = ? AND users.isactive = ? AND users.confirmedmail = ? AND users_sessions.active_until >= ?`, [cookie, true, true, addfunctions.unixtime_to_local(new Date().valueOf())])
        if (result.length) {
            return { success: true, data: new classdata.classes.userclass(result[0]) };
        } else {

            return { success: false, msg: "No user found!" };
        }
    }

    async auth_api(apikey) //Login with the APIKEY, Returns the userclass
    {
        var result = await classdata.db.databasequerryhandler_secure(`select users.*,users_sessions.cookie from users INNER JOIN users_sessions ON users.id = users_sessions.userid where users.api = ? AND users.isactive = ? AND users.confirmedmail = ?`, [apikey, true, true])
        if (result.length) {
            return { success: true, data: new classdata.classes.userclass(result[0]) };
        } else {
            return { success: false, msg: "No user found!" };
        }
    }

    async auth_isadmin_cookie(cookie)//Check if Cookie belongs to an admin, returns true(admin) or false
    {
        var that = this;
        let user = await that.auth_cookie(cookie)
        if (user.success) {
            return (user.data.get_user_personal().isadmin)
        }
        else {
            return (false)
        }
    }

    async auth_isadmin_api(apikey)//Check if Cookie belongs to an admin, returns true(admin) or false
    {
        var that = this;
        let user = await that.auth_api(apikey)
        if (user.success) {
            return (user.data.get_user_personal().isadmin)
        }
        else {
            return (false)
        }
    }

    async auth_login(logindata) //Login with mailaddress and Passwort, returns Cookie, API key and userid
    {
        var that = this;

        //Check if everything that's needed in logindata is set
        {
            let requiredFields = { "mailaddress": "string", "password": "string", "useripv4": ["string", "null"], "useripv6": ["string", "null"] };
            logindata = addfunctions.objectconverter(logindata)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, logindata)
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        //IPV4 & IPV6 check
        logindata.useripv4 = addfunctions.isIPv4(logindata.useripv4) === true ? logindata.useripv4 : null;
        logindata.useripv6 = addfunctions.isIPv6(logindata.useripv6) === true ? logindata.useripv6 : null;


        //Mailaddress & Password check
        let checkeduserdata = await addfunctions.check_for_valid_user_entries({ "mailaddress": logindata.mailaddress, "password1": logindata.password })
        if (!checkeduserdata.success) {
            return (checkeduserdata)
        }

        //Download Salt from the Database
        {
            let getsaltfromdb = await classdata.db.databasequerryhandler_secure(`select passwordsalt from users where mailaddress= ?`, [logindata.mailaddress]);
            if (getsaltfromdb.length) {
                var passwordsalt = getsaltfromdb[0].passwordsalt
            }
            else {
                return ({ "success": false, "msg": "Password or mailaddress wrong!" })
            }
        }

        //Login User using the Password, the Salt and the Mailaddress
        {
            let passwordhash = await auth_getpwhash(passwordsalt, logindata.password)
            var user = await classdata.db.databasequerryhandler_secure(`select * from users where mailaddress = ? AND passwordhash = ? AND isactive = ?`, [logindata.mailaddress, passwordhash, true]);
            if (!user.length) {
                return ({ "success": false, "msg": "Password or mailaddress wrong!" })
            }
        }

        //Get free Cookie for user
        do {
            var randomcookie = addfunctions.randomcookief()
            var answer = await classdata.db.databasequerryhandler_secure(`select * from users_sessions where cookie = ?`, [randomcookie]);
        }
        while (answer && answer.length)

        //Get free id for the session
        do {
            var randomid = addfunctions.randomidf()
            var answer = await classdata.db.databasequerryhandler_secure(`select * from users_sessions where cookie = ?`, [randomid]);
        }
        while (answer && answer.length)

        if (!user[0].confirmedmail) {
            return ({ "success": false, "msg": "Mailaddress not confirmed, please confirm to login" })
        }



        //UPDATE-DB (New time + new cookie)
        user[0].sessionid = randomid;
        user[0].cookie = randomcookie;
        user[0].ipv4 = logindata.useripv4;
        user[0].ipv6 = logindata.useripv6;
        user[0].active_until = addfunctions.unixtime_to_local(new Date().valueOf() + 30 * 24 * 60 * 60 * 1000)
        user[0].logintime = addfunctions.unixtime_to_local()


        const databaseupdate = await classdata.db.databasequerryhandler_secure(`insert into users_sessions values (?,?,?,?,?,?,?);`, [user[0].sessionid, user[0].id, user[0].cookie, user[0].ipv4, user[0].ipv6, user[0].active_until, user[0].logintime]);
        if (databaseupdate.affectedRows === 1) {
            return ({ "success": true, "data": { cookie: user[0].cookie, api: user[0].api, id: user[0].id } })
        }
        else {
            return ({ "success": false, "msg": "Databaseupdate failed" })
        }

    }

    async auth_register(registerdata) //Returns Cookie, API key and userid
    {
        var that = this

        //Check if everything that's needed in logindata is set
        {
            let requiredFields = { "mailaddress": "string", "password1": "string", "password2": "string", "useripv4": ["string", "null"], "useripv6": ["string", "null"] };
            registerdata = addfunctions.objectconverter(registerdata)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, registerdata)
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        if (!classdata.db.routinedata.bubbledns_settings.enable_register) {
            return ({ "success": false, "msg": "Registration is disabled!" })
        }

        //IPV4 & IPV6 check
        registerdata.useripv4 = addfunctions.isIPv4(registerdata.useripv4) === true ? registerdata.useripv4 : null;
        registerdata.useripv6 = addfunctions.isIPv6(registerdata.useripv6) === true ? registerdata.useripv6 : null;


        //Find free id for the user
        do {
            var randomid = addfunctions.randomidf()
            var answer = await classdata.db.databasequerryhandler_secure(`select * from users where id = ?`, [randomid]);
        }
        while (answer && answer.length)


        //Find free apikey for the user
        do {
            var randomapi = addfunctions.randomapif()
            var answer = await classdata.db.databasequerryhandler_secure(`select * from users where api = ?`, [randomapi]);
        }
        while (answer && answer.length)


        //Find free Cookie for the user
        do {
            var randomcookie = addfunctions.randomcookief()
            var answer = await classdata.db.databasequerryhandler_secure(`select * from users_sessions where cookie = ?`, [randomcookie]);
        }
        while (answer && answer.length)


        //Get free id for the session
        do {
            var randomsessionid = addfunctions.randomidf()
            var answer = await classdata.db.databasequerryhandler_secure(`select * from users_sessions where cookie = ?`, [randomsessionid]);
        }
        while (answer && answer.length)


        //Check if mailaddress is still free
        let preventdouble = await classdata.db.databasequerryhandler_secure(`select * from users where mailaddress = ?`, [registerdata.mailaddress])
        if (preventdouble.length) {
            return ({ "success": false, "msg": "mailaddress already in use" })
        }

        //Mailaddress & Password check
        let checkeduserdata = await addfunctions.check_for_valid_user_entries({ "mailaddress": registerdata.mailaddress, "password1": registerdata.password1, "password2": registerdata.password2 })
        if (!checkeduserdata.success) {
            return (checkeduserdata)
        }

        let currenttime = addfunctions.unixtime_to_local()

        let randomsalt = auth_getrandomsalt();
        let user = { "id": randomid, "sessionid": randomsessionid, "mailaddress": registerdata.mailaddress, "passwordsalt": randomsalt, "passwordhash": await auth_getpwhash(randomsalt, registerdata.password1), "cookie": randomcookie, "api": randomapi, "ipv4": registerdata.useripv4, "ipv6": registerdata.useripv6, "isadmin": false, "isactive": true, "maxentries": classdata.db.routinedata.bubbledns_settings.standardmaxentries, "maxdomains": classdata.db.routinedata.bubbledns_settings.standardmaxdomains, "active_until": addfunctions.unixtime_to_local(new Date().valueOf() + 30 * 24 * 60 * 60 * 1000), "logintime": currenttime, "confirmedmail": false, "registrationdate": currenttime }


        var promise1 = classdata.db.databasequerryhandler_secure("INSERT INTO users values (?,?,?,?,?,?,?,?,?,?,?)", [user.id, user.mailaddress, user.passwordhash, user.passwordsalt, user.api, user.isadmin, user.isactive, user.maxentries, user.maxdomains, user.confirmedmail, user.registrationdate]);
        var promise2 = classdata.db.databasequerryhandler_secure("INSERT INTO users_sessions values (?,?,?,?,?,?,?);", [user.sessionid, user.id, user.cookie, user.ipv4, user.ipv6, user.active_until, user.logintime]);
        const databaseupdate = await Promise.all([promise1, promise2])
        classdata.mail.mailconfirmation_create({ "keytype": 2, "userid": user.id })
        return ({ "success": true, "data": { cookie: user.cookie, api: user.api, id: user.id } })

    }

    async get_user_full(usertoinspect)  //Returns all details of a specific user [0] = user_sessions, [1] = user_data(as userclass), [2] = domains_owner,[3] = domains_shared
    {
        //Check if everything that's needed in usertoinspect is set
        {
            let requiredFields = { "id": "number" };
            usertoinspect = addfunctions.objectconverter(usertoinspect)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, usertoinspect)
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        var user_data = function (userid) {
            return new Promise(async (resolve, reject) => {
                classdata.db.databasequerryhandler_secure(`select * from users where id=? `, [userid])
                .then(function(res){resolve(new classdata.classes.userclass(res[0]))})
                .catch(reject)
            });
        }

        try {
            var promise1 = classdata.db.databasequerryhandler_secure(`select * from users_sessions where userid=? `, [usertoinspect.id])
            var promise2 = user_data(usertoinspect.id)
            var promise3 = classdata.api.dns.domain_list_owner(new classdata.classes.userclass({ "id": usertoinspect.id }))
            var promise4 = classdata.api.dns.domain_list_shared(new classdata.classes.userclass({ "id": usertoinspect.id }))
            var databasrequest = await Promise.all([promise1, promise2, promise3, promise4])
            return ({ "success": true, "data": databasrequest })
        }
        catch (err) {
            that.log.addlog("Unknown ERROR:" + err, { color: "yellow", warn: "API-ACC-Warning", level: 2 })
            return ({ "success": false, "msg": "Error inspecting User" })
        }
    }

    async get_user_all()  //Returns all users as userclass
    {
        var users_array = await classdata.db.databasequerryhandler_secure(`select * from users`, [])
        var users = []
        users_array.forEach(singleuser => { users.push(new classdata.classes.userclass(singleuser)) })
        return ({ "success": true, "data": users })
    }

    async update_user(data) {
        var that = this;

        //Check if everything that's needed in data is set
        {
            let requiredFields = { "id": "number", "isactive": ["boolean", "number"], "confirmedmail": ["boolean", "number"], "isadmin": ["boolean", "number"], "maxdomains": "number", "maxentries": "number", "password": ["string", "null"], "newpassword": "boolean", "mailaddress": "string" };
            data = addfunctions.objectconverter(data)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, data)
            if (!check_for_correct_datatype.success) {
                return ({ "success": false, "msg": check_for_correct_datatype.msg })
            }
        }

        //Mailaddress & Password check
        let checkeduserdata1 = await addfunctions.check_for_valid_user_entries({ "mailaddress": data.mailaddress })
        if (!checkeduserdata1.success) {
            return (checkeduserdata1)
        }

        if (data.newpassword) {

            //Password check
            let checkeduserdata2 = await addfunctions.check_for_valid_user_entries({ "password1": data.password })
            if (!checkeduserdata2.success) {
                return (checkeduserdata2)
            }
            var getsaltfromdb = await classdata.db.databasequerryhandler_secure(`select passwordsalt from users where id= ?`, [data.id]);
            if (getsaltfromdb.length) {
                var databaseupdate = await classdata.db.databasequerryhandler_secure(`UPDATE users SET mailaddress = ?, passwordhash =?,isadmin = ?,confirmedmail = ?, isactive=?, maxentries =?, maxdomains =? where id= ?`, [data.mailaddress, await auth_getpwhash(getsaltfromdb[0].passwordsalt, data.password), data.isadmin, data.confirmedmail, data.isactive, data.maxentries, data.maxdomains, data.id]);
            }
            else {
                return ({ "success": false, "msg": "Databaseupdate failed" })
            }


        }
        else {
            var databaseupdate = await classdata.db.databasequerryhandler_secure(`UPDATE users SET mailaddress = ?,isadmin = ?,confirmedmail = ?, isactive=?, maxentries =?, maxdomains =? where id= ?`, [data.mailaddress, data.isadmin, data.confirmedmail, data.isactive, data.maxentries, data.maxdomains, data.id]);
        }

        if (databaseupdate.affectedRows == 1) {
            return ({ "success": true, "data": "Userupdate saved" })
        }
        else {
            return ({ "success": false, "msg": "Databaseupdate failed" })
        }
    }

}

export { apiclass_acc }


function auth_getpwhash(salt, password) {
    let iterations = 100000;
    let keyLength = 49;
    let digest = "sha256"


    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, iterations, keyLength, digest, (err, derivedKey) => {
            if (err) return reject(err);
                resolve(derivedKey.toString('hex'));
        });
    });
}

function auth_getrandomsalt(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}


