"use strict";
import { addfunctions } from "./addfunctions.js"
import { classdata } from './main.js';

var tasks =
{
    
    "dnsentry_update":
    {
        description: "Update a DNS Entry of the Domain",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                //Only continue if data is defined
                if (req.body.data === undefined) {
                    responseclass.send({ "success": false, "msg": "Data not given!" })
                    return;
                }

                await classdata.api.dns.dnsentry_update(pretaskdata.user.data, req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error dnsentry_update, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }

    },

    "dnsentry_delete":
    {
        description: "Delete a DNS Entry of the Domain",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                //Only continue if data is defined
                if (req.body.data === undefined) {
                    responseclass.send({ "success": false, "msg": "Data not given!" })
                    return;
                }

                await classdata.api.dns.dnsentry_delete(pretaskdata.user.data, req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error dnsentry_delete, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "dnsentry_create":
    {
        description: "Create a DNS Entry of the Domain",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                //Only continue if data is defined
                if (req.body.data === undefined) {
                    responseclass.send({ "success": false, "msg": "Data not given!" })
                    return;
                }

                await classdata.api.dns.dnsentry_create(pretaskdata.user.data, req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error dnsentry_create, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }

    },

    "domain_list_owner":
    {
        description: "Get all Domains the user ownes (also the dnsentries and sharelist)",
        example: "/dnsapi?apikey=leckerapi3&task=dns_list",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                await classdata.api.dns.domain_list_owner(pretaskdata.user.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error domain_list_owner, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "domain_list_shared":
    {
        description: "Get all Domains the user got shared (also the dnsentries and empty sharelist)",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                await classdata.api.dns.domain_list_shared(pretaskdata.user.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error domain_list_shared, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "domain_create":
    {
        description: "Create a new Domain",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                //Only continue if data is defined
                if (req.body.data === undefined) {
                    responseclass.send({ "success": false, "msg": "Data not given!" })
                    return;
                }

                await classdata.api.dns.domain_create(pretaskdata.user.data, req.body.data)
                    .then(async function (res1) {
                        if (res1.success) {
                            var res2 = await classdata.api.dns.domain_list_owner(pretaskdata.user.data, res1.data)
                            return res2;
                        }
                        return res1
                    })
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error domain_create, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }


    },

    "domain_delete":
    {
        description: "Delete a Domain",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                //Only continue if data is defined
                if (req.body.data === undefined) {
                    responseclass.send({ "success": false, "msg": "Data not given!" })
                    return;
                }

                await classdata.api.dns.domain_delete(pretaskdata.user.data, req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error domain_delete, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }

    },

    "domain_verify":
    {
        description: "Verify a Domain",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                //Only continue if data is defined
                if (req.body.data === undefined) {
                    responseclass.send({ "success": false, "msg": "Data not given!" })
                    return;
                }

                await classdata.api.dns.domain_verify(pretaskdata.user.data, req.body.data)
                    .then(async function (res1) {
                        if (res1.success) {
                            var res2 = await classdata.api.dns.domain_list_owner(pretaskdata.user.data, req.body.data)
                            return res2;
                        }
                        return res1
                    })
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error domain_verify, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }

    },

    "domain_share_adduser":
    {
        description: "Share a Domain with a User",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                //Only continue if data is defined
                if (req.body.data === undefined) {
                    if (!((typeof req.body.data === "object") && (req.body.data !== null))) {
                        responseclass.send({ "success": false, "msg": "Data not given!" })
                        return;
                    }
                }

                //Only continue if domainid and mailaddress is defined!
                if ((req.body.data.domainid === undefined) || (req.body.data.mailaddress === undefined)) {
                    responseclass.send({ "success": false, "msg": "Domain ID or mailaddress is not provided" })
                    return;
                }


                await classdata.api.dns.domain_share_adduser(pretaskdata.user.data, req.body.data.domainid, req.body.data.mailaddress)
                    .then(async function (res1) {
                        if (res1.success) {
                            var res2 = await classdata.api.dns.domain_list_owner(pretaskdata.user.data, { "id": req.body.data.domainid })
                            return res2;
                        }
                        return res1
                    })
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error domain_verify, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }

    },

    "domain_share_deleteuser":
    {
        description: "Delete your Domain share of a specific user (deleting all of his dnsentries too)",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                //Only continue if data is defined
                if (req.body.data === undefined) {
                    if (!((typeof req.body.data === "object") && (req.body.data !== null))) {
                        responseclass.send({ "success": false, "msg": "Data not given!" })
                        return;
                    }
                }

                //Only continue if userid and domainid is defined!
                if ((req.body.data.userid === undefined) || (req.body.data.domainid === undefined)) {
                    responseclass.send({ "success": false, "msg": "Domain ID or mailaddress is not provided" })
                    return;
                }


                await classdata.api.dns.domain_share_deleteuser(pretaskdata.user.data, req.body.data.domainid, req.body.data.userid)
                    .then(async function (res1) {
                        if (res1.success) {
                            var res2 = await classdata.api.dns.domain_list_owner(pretaskdata.user.data, { "id": req.body.data.domainid })
                            return res2;
                        }
                        return res1
                    })
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error domain_verify, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "dns_get_bubblednsservers":
    {
        description: "Get the BubbleDNS-Servers",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                await classdata.api.dns.dns_get_bubblednsservers()
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error dns_get_allowed_dnstype_entries, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "dns_get_allowed_dnstype_entries":
    {
        description: "dns_get_allowed_dnstype_entries",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                await classdata.api.dns.dns_get_allowed_dnstype_entries()
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error dns_get_allowed_dnstype_entries, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },
}


export { tasks, pretask }


async function pretask(req, res, callback) {

    //Get ipv4-Address of the user.
    var useripv4 = addfunctions.getclientipv4(req);
    if (!addfunctions.isIPv4(useripv4)) {
        useripv4 = null;
    }

    //Get ipv6-Address of the user. //XXXXXXXXXXXX
    var useripv6 = null;

    //Check if apikey and task is string
    let requiredFields = { "apikey": "string", "task": "string" };
    req.body = addfunctions.objectconverter(req.body)
    let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, req.body, false)
    if (!check_for_correct_datatype.success) {
        let err = "API doesn't belong to a user"
        if (callback && typeof callback == 'function') {
            await callback(err, "");
        }
        return;
    }

    //Check if apikey belongs to a user

    try {
        var user = await classdata.api.account.auth_api(req.body.apikey)
        if (user.success) {
            let answer = { "useripv4": useripv4, "useripv6": useripv6, "user": user }
            if (callback && typeof callback == 'function') {
                await callback("", answer);
            }
            return (answer);
        }
        else {
            let error = "API doesn't belong to a user"
            throw (error);
        }
    }
    catch (err) {
        if (callback && typeof callback == 'function') {
            await callback("API doesn't belong to a user", "");
        }
        //We don't want the throw to go one level up and the error gets already processed in the callback!
        return;
    }
}

