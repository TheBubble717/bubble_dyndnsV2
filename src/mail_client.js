//Still needs cleanup of useless Promises

"use strict";
import { EventEmitter } from "node:events"
import * as nodemailer from "nodemailer"
import { addfunctions } from "./addfunctions.js"
import { classdata } from './main.js';


class mailclass extends EventEmitter {
    constructor(config, log) {
        super();
        this.em = null;
        this.config = config;
        this.log = log
    }

    sendrawmessage(recipentmailaddress, message) {
        var that = this;
        return new Promise(async (resolve) => {

            //Check message
            let requiredFields = { "subject": "string", "html": "string" };
            message = addfunctions.objectconverter(message)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, message)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }

            if (!classdata.db.routinedata.mailserver_settings.length) {
                that.log.addlog(`Error sending Mail to ${recipentmailaddress}: No Mailserver configured! `, { color: "yellow", warn: "API-MAIL-Warning", level: 2 })
                resolve({ "success": false, "msg": "No Mailserver configured!" })
                return;
            }

            var mailserver = classdata.db.routinedata.mailserver_settings[0];

            //Check mailserver configuration
            let requiredFields2 = { "host": "string", "port": ["string", "number"], "secure": ["boolean", "number"], "auth_user": "string", "auth_passwd": "string" };
            mailserver = addfunctions.objectconverter(mailserver)
            let check_for_correct_datatype2 = addfunctions.check_for_correct_datatype(requiredFields2, mailserver)
            if (!check_for_correct_datatype2.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype2.msg })
                return;
            }

            // Regular expression for validating email addresses
            if (recipentmailaddress.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/) === null) {
                resolve({ "success": false, "msg": "mail address contains unallowed characters or is invalid" });
                return;
            }



            var nodemailerTransport = nodemailer.createTransport({
                host: mailserver.host,
                port: mailserver.port,
                secure: mailserver.secure,
                auth: {
                    user: mailserver.auth_user,
                    pass: mailserver.auth_passwd,
                },
            });

            const mailOptions = {
                from: `"BubbleDNS" <${mailserver.auth_user}>`,
                to: recipentmailaddress,
                subject: message.subject,
                html: message.html,
            };



            nodemailerTransport.sendMail(mailOptions, (err, info) => {
                if (err) {
                    that.log.addlog(`Error sending Mail to ${mailOptions.to}:  ${err.message}`, { color: "yellow", warn: "API-MAIL-Warning", level: 2 })
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                }
                that.log.addlog(`Mail sent to ${mailOptions.to} with the subject: "${message.subject}" with the code: ${JSON.stringify(info.response)}`, { color: "green", warn: "MAIL-Log", level: 1 })
                resolve({ "success": true, "data": info.response })
                return;
            });



        });
    }

    //Tempalteid === users_confirmationkeys.keytype
    sendmessage(recipentaddress = { "userid": null, "mailaddress": null }, templateid, templatereplacedata) {
        var that = this;
        return new Promise(async (resolve) => {
            var template = await available_templates(templateid)
            if (!template.success) {
                resolve(template)
                return;
            }

            if (!recipentaddress.mailaddress) {
                if (!recipentaddress.userid) {
                    resolve({ "success": false, "msg": "No Userid or Mailaddress given!" })
                }
                else {
                    var user = new classdata.classes.userclass({ "id": recipentaddress.userid })
                    let answer = await user.get_user_from_id()
                    if (answer) {
                        recipentaddress.mailaddress = user.get_user_public().mailaddress
                    }

                }
            }

            //Predefined Keywords like username gets automatically set correctly
            if (template.data.requiredFields.mailaddress !== undefined) {
                templatereplacedata.mailaddress = recipentaddress.mailaddress
            }
            if (template.data.requiredFields.mailaddress !== undefined) {
                templatereplacedata.confirmationkey = `${classdata.db.routinedata.bubbledns_settings.maindomain}/confirm?keytext=${templatereplacedata.confirmationkey}`
            }


            templatereplacedata = addfunctions.objectconverter(templatereplacedata)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(template.data.requiredFields, templatereplacedata)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }


            for (const [placeholder, value] of Object.entries(templatereplacedata)) {
                // Use a regular expression to replace all instances of the placeholder
                template.data.template = template.data.template.replace(new RegExp(`{{${placeholder}}}`, 'g'), value);
            }

            let answer = await that.sendrawmessage(recipentaddress.mailaddress, { "subject": template.data.subject, html: template.data.template })
            resolve(answer)
        });

    }

    mailconfirmation_create(keyinformation)  //Create a users_confirmationkeys entry and send mail to user
    {
        var that = this;
        return new Promise(async (resolve) => {

            let requiredFields = { "keytype": ["string", "boolean", "number"], "userid": ["string", "number"] };
            keyinformation = addfunctions.objectconverter(keyinformation)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, keyinformation)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }

            //Max of 2 active confirmation of the same type allowed
            try {
                let active_confirmations = await classdata.db.databasequerryhandler_secure(`select * from users_confirmationkeys where keytype = ? AND userid = ? AND completed = ? AND expirationtime >= ?`, [keyinformation.keytype, keyinformation.userid, false, addfunctions.unixtime_to_local(new Date().valueOf())]);
                if (active_confirmations.length > 1) {
                    resolve({ "success": false, "msg": "You have still a open confirmation!" })
                    return;
                }

            }
            catch (err) {
                that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-MAIL-Warning", level: 2 })
                resolve({ "success": false, "msg": "Unknown Error" })
                return;
            }

            //Find free id for the users_confirmationkeys.id
            try {
                do {
                    var randomid = addfunctions.randomidf()
                    var answer = await classdata.db.databasequerryhandler_secure(`select * from users_confirmationkeys where id = ?`, [randomid]);
                }
                while (answer && answer.length)
            }
            catch (err) {
                that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-MAIL-Warning", level: 2 })
                resolve({ "success": false, "msg": "Unknown Error" })
                return;
            }

            //Find free keytext for the users_confirmationkeys.keytext
            try {
                do {
                    var randomkeytext = addfunctions.randomapif()
                    var answer = await classdata.db.databasequerryhandler_secure(`select * from users_confirmationkeys where keytext = ?`, [randomkeytext]);
                }
                while (answer && answer.length)

            }
            catch (err) {
                that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-MAIL-Warning", level: 2 })
                resolve({ "success": false, "msg": "Unknown Error" })
                return;
            }

            var users_confirmationkeys = [{ "id": randomid, "userid": keyinformation.userid, "keytext": randomkeytext, "keytype": keyinformation.keytype, "expirationtime": addfunctions.unixtime_to_local(new Date().valueOf() + 1 * 60 * 60 * 1000), "completed": false }]

            await classdata.db.databasequerryhandler_secure(`insert into users_confirmationkeys values (?,?,?,?,?,?);`, [users_confirmationkeys[0].id, users_confirmationkeys[0].userid, users_confirmationkeys[0].keytext, users_confirmationkeys[0].keytype, users_confirmationkeys[0].expirationtime, users_confirmationkeys[0].completed])
                .then(async function (databaseupdate) {
                    if (databaseupdate.affectedRows === 1) {

                        //Send Message
                        let mailanswer = await classdata.mail.sendmessage({ "userid": keyinformation.userid }, keyinformation.keytype, { "confirmationkey": users_confirmationkeys[0].keytext })
                        if (!mailanswer.success) {
                            resolve({ "success": false, "msg": mailanswer.msg })
                            return;
                        }
                        else {
                            resolve({ "success": true, "data": keyinformation })
                            return;
                        }
                    }
                    else {
                        resolve({ "success": false, "msg": "Databaseupdate failed" })
                        return;
                    }
                })
                .catch(function (err) {
                    that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-MAIL-Warning", level: 2 })
                    resolve({ "success": false, "msg": "Unknown Error" })
                    return;
                })
        });
    }

    mailconfirmation_confirm(keyinformation, bool_delete) {
        var that = this;
        return new Promise(async (resolve) => {

            let requiredFields = { "keytext": ["string"], "bool_delete": ["boolean", "number"] };
            keyinformation = addfunctions.objectconverter(keyinformation)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, { ...keyinformation, "bool_delete": bool_delete })
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }

            try
            {
                var confirmationkeysfromdb = await classdata.db.databasequerryhandler_secure(`select users_confirmationkeys.* from users INNER JOIN users_confirmationkeys ON users.id = users_confirmationkeys.userid where users_confirmationkeys.keytext = ? AND users_confirmationkeys.completed = ? AND users_confirmationkeys.expirationtime >= ?`, [keyinformation.keytext, false, addfunctions.unixtime_to_local(new Date().valueOf())]);
                if(confirmationkeysfromdb.length)
                {
                    if (bool_delete)
                    {
                        confirmationkeysfromdb[0].completed = true;
                        await classdata.db.databasequerryhandler_secure(`UPDATE users_confirmationkeys set completed = ? where id = ?`, [true, confirmationkeysfromdb[0].id]);
                    }
                    resolve({ "success": true, "data": confirmationkeysfromdb[0] })
                    return;
                }
                else
                {
                    resolve({ "success": false, "msg": "Confirmationkey not found!" })
                    return;
                }
            
            }
            catch(err)
            {
                that.log.addlog("Unknown ERROR: " + err, { color: "yellow", warn: "API-MAIL-Warning", level: 2 })
                resolve({ "success": false, "msg": "Unknown Error" })
                return;
            }





        });
    }

    mailconfirmation_processing(keyinformation, data) {
        var that = this;
        return new Promise(async (resolve) => {

            let requiredFields = { "keytext": ["string"] };
            keyinformation = addfunctions.objectconverter(keyinformation)
            let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, keyinformation)
            if (!check_for_correct_datatype.success) {
                resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                return;
            }



            var users_confirmationkeys = await that.mailconfirmation_confirm(keyinformation, false)
            if (!users_confirmationkeys.success) {
                resolve({ "success": false, "msg": users_confirmationkeys.msg })
                return;
            }


            if (users_confirmationkeys.success) {
                if (users_confirmationkeys.data.keytype == 1) //Reset Password
                {
                    if (Object.keys(data).length !== 0) {
                        let requiredFields = { "password1": "string", "password2": "string" };
                        data = addfunctions.objectconverter(data)
                        let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, data)
                        if (!check_for_correct_datatype.success) {
                            resolve({ "success": false, "msg": check_for_correct_datatype.msg })
                            return;
                        }


                        //Password check
                        let checkeduserdata = await addfunctions.check_for_valid_user_entries({ "password1": data.password1, "password2": data.password2 })
                        if (!checkeduserdata.success) {
                            resolve(checkeduserdata)
                            return
                        }

                        var user = new classdata.classes.userclass({ "id": users_confirmationkeys.data.userid })
                        let loaduserresult = await user.get_user_from_id()
                        if (loaduserresult.success) {
                            user.set_user_data({ "confirmedmail": true })
                            var updateresult = await classdata.api.account.update_user({ ...user.get_user_internal(), "password": data.password1, newpassword: true })
                            if (updateresult.success) {
                                users_confirmationkeys = await that.mailconfirmation_confirm(keyinformation, true)
                                resolve({ "success": true, "data": users_confirmationkeys.data })
                                return;
                            }
                            else {
                                resolve({ "success": false, "msg": updateresult.msg })
                                return;
                            }
                        }
                        else {
                            resolve({ "success": false, "msg": loaduserresult.msg })
                            return;
                        }
                    }
                    else {
                        resolve({ "success": true, "data": users_confirmationkeys.data })
                        return;
                    }
                }
                else if (users_confirmationkeys.data.keytype == 2) //Confirm Mail //DONE
                {
                    var user = new classdata.classes.userclass({ "id": users_confirmationkeys.data.userid })
                    let loaduserresult = await user.get_user_from_id()
                    if (loaduserresult.success) {
                        user.set_user_data({ "confirmedmail": true })
                        var updateresult = await classdata.api.account.update_user({ ...user.get_user_internal(), "password": null, newpassword: false })
                        if (updateresult.success) {
                            users_confirmationkeys = await that.mailconfirmation_confirm(keyinformation, true)
                            resolve({ "success": true, "data": users_confirmationkeys.data })
                            return;
                        }
                        else {
                            resolve({ "success": false, "msg": updateresult.msg })
                            return;
                        }
                    }
                    else {
                        resolve({ "success": false, "msg": loaduserresult.msg })
                        return;
                    }

                }
            }


        });
    }

}

async function available_templates(templateid) {
    var that = this;
    return new Promise(async (resolve) => {
        if (templateid == 1) //Password Reset
        {
            let template = await addfunctions.read_file("./mail/confirm_passwordreset.html")
            let template_html = template.toString('utf8');
            let requiredFields = { "mailaddress": "string", "confirmationkey": "string" };
            resolve({ "success": true, "data": { "template": template_html, "subject": "Requested Password Reset", "requiredFields": requiredFields } })
        }
        else if (templateid == 2) //Password Reset
        {
            let template = await addfunctions.read_file("./mail/confirm_mailaddress.html")
            let template_html = template.toString('utf8');
            let requiredFields = { "mailaddress": "string", "confirmationkey": "string" };
            resolve({ "success": true, "data": { "template": template_html, "subject": "Confirmation of your Mailaddress", "requiredFields": requiredFields } })
        }
        else {
            resolve({ "success": false, "msg": "TemplateID not found!" })
        }
    });
}





export { mailclass }