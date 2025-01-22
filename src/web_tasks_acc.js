"use strict";
import { addfunctions } from "./addfunctions.js"
import { classdata } from './main.js';


var tasks =
{
    
    "auth_register":
    {
        description: "Register an Account on the site",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                //Only continue data is defined
                if (req.body.data === undefined) {
                    responseclass.send({ success: false, msg: "Data not given!" })
                    return;
                }

                req.body.data.useripv4 = pretaskdata.useripv4
                req.body.data.useripv6 = pretaskdata.useripv6


                //Actual Registration
                await classdata.api.account.auth_register(req.body.data)
                .then(responseclass.send)
                .catch(function (err) {responseclass.send({ success: false, msg: "Error Registering, 500 Error" }, { statuscode: 500, err: err })})
                return;
            })
        }
    },

    "auth_login":
    {
        description: "Login on the site",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                //Only continue data is defined
                if (req.body.data === undefined) {
                    responseclass.send({ success: false, msg: "Data not given!" })
                    return;
                }

                req.body.data.useripv4 = pretaskdata.useripv4
                req.body.data.useripv6 = pretaskdata.useripv6


                //Actual Login
                await classdata.api.account.auth_login(req.body.data)
                .then(responseclass.send)
                .catch(function (err) {
                    responseclass.send({ success: false, msg: "Error Login, 500 Error" }, { statuscode: 500, err: err })
                })
                return;
            })
        }

    },

    "req_passwordreset":
    {
        description: "Request a Password Reset via Mailaddress",
        example: "TBD",
        process: async function (req, res, responseclass) {
            //Only continue data is defined
            if (req.body.data === undefined) {
                responseclass.send({ success: false, msg: "Data not given!" })
                return;
            }

            //Mailaddress check
            let checkeduserdata = await addfunctions.check_for_valid_user_entries({ "mailaddress": req.body.data.mailaddress })
            if (!checkeduserdata.success) {
                responseclass.send(checkeduserdata)
                return;
            }

            var user = new classdata.classes.userclass({ "mailaddress": req.body.data.mailaddress })
            try
            {
                var load_useranswer = await user.get_user_from_mailaddress()
                if (load_useranswer.success) {
                    classdata.mail.mailconfirmation_create({ "keytype": 1, "userid": user.get_user_public().id })
                }
                var standardanswer = { "success": true, data: "Recovery E-Mail was sent to the User" }
                await addfunctions.waittime_random(100, 2000)
                responseclass.send(standardanswer)
            }
            catch(err) {
                responseclass.send({ success: false, msg: "Error Passwordreset, 500 Error" }, { statuscode: 500, err: err })
                return;
            }
            return;
        }
    }
}

async function pretask(req, res, callback) {

        //Get ipv4-Address of the user.
        var useripv4 = addfunctions.getclientipv4(req);
        if (!addfunctions.isIPv4(useripv4)) {
            useripv4 = null;
        }

        //Get ipv6-Address of the user. //XXXXXXXXXXXX
        var useripv6 = null;


        let answer = { "useripv4": useripv4, "useripv6": useripv6 }
        if (callback && typeof callback == 'function') {
            await callback("", answer);
        }
        return(answer);
}

export { tasks, pretask }