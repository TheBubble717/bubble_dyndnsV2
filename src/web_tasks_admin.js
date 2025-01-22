"use strict";
import { addfunctions } from "./addfunctions.js"
import { classdata } from './main.js';

var tasks =
{
    
    "dns_upstream_servers_list":
    {
        description: "Get Upstream DNS Servers that get used for requesting dnsentries that for e.g. domain check",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                await classdata.api.admin.dns_upstream_servers_list()
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error dns_upstream_servers_list, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "dns_upstream_servers_enabledisable":
    {
        description: "Enable/Disable a certain DNS Upstream Server",
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

                await classdata.api.admin.dns_upstream_servers_enabledisable(req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error dns_upstream_servers_enabledisable, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "dns_upstream_servers_delete":
    {
        description: "Delete a DNS Upstream Server",
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

                await classdata.api.admin.dns_upstream_servers_delete(req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error dns_upstream_servers_delete, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "dns_upstream_servers_create":
    {
        ddescription: "Create a new DNS Upstream Server",
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

                await classdata.api.admin.dns_upstream_servers_create(req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error dns_upstream_servers_create, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "user_management_list_all":
    {
        description: "List all Users",
        example: "TBD",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                await classdata.api.account.get_user_all()
                    .then(function (res) {
                        res.data = res.data.map(function (user) { return user.get_user_public() })
                        responseclass.send(res)
                    })
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error user_management_list_all, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            })
        }
    },

    "user_management_list_id":
    {
        description: "Get everything of a specific User",
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

                await classdata.api.account.get_user_full(req.body.data)
                    .then(function (res) {
                        res.data[1] = res.data[1].get_user_public()
                        responseclass.send(res)
                    })

                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error user_management_list_id, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;

            })
        }

    },

    "user_management_update_user":
    {
        description: "Update settings of a user",
        example: "",
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

                await classdata.api.account.update_user(req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error user_management_update_user, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;

            })
        }

    },

    "bubbledns_servers_list":
    {
        description: "Get the Bubble DNS Servers",
        example: "",
        process: async function (req, res, responseclass) {
            await pretask(req, res, async function (err, pretaskdata) {
                if (err) {
                    responseclass.send({ success: false, msg: err })
                    return;
                }

                await classdata.api.admin.bubbledns_servers_list()
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error bubbledns_servers_list, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "bubbledns_servers_synctest":
    {
        description: "Synctest a BubbleDNS Server",
        example: "",
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

                await classdata.api.admin.bubbledns_servers_synctest(req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error bubbledns_servers_synctest, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "bubbledns_servers_create":
    {
        description: "Create a new BubbleDNS Server",
        example: "",
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

                await classdata.api.admin.bubbledns_servers_create(req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error bubbledns_servers_create, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
        }
    },

    "bubbledns_servers_update":
    {
        description: "Update a BubbleDNS Server",
        example: "",
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

                await classdata.api.admin.bubbledns_servers_update(req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error bubbledns_servers_update, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;

            });
        }
    },

    "bubbledns_servers_delete":
    {
        description: "Delete a BubbleDNS Server",
        example: "",
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

                await classdata.api.admin.bubbledns_servers_delete(req.body.data)
                    .then(responseclass.send)
                    .catch(function (err) {
                        responseclass.send({ success: false, msg: "Error bubbledns_servers_delete, 500 Error" }, { statuscode: 500, err: err })
                    })
                return;
            });
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

    //Check if apikey and task is string
    let requiredFields = { "apikey": "string", "task": "string" };
    req.body = addfunctions.objectconverter(req.body)
    let check_for_correct_datatype = addfunctions.check_for_correct_datatype(requiredFields, req.body, false)
    if (!check_for_correct_datatype.success) {
        let err = "API doesn't belong to a user or is not an admin"
        if (callback && typeof callback == 'function') {
            await callback(err, "");
        }
        return;
    }

    //Check if apikey belongs to a user & isadmin =1
    try {
        var user = await classdata.api.account.auth_api(req.body.apikey)
        if (user.success) {
            if (user.data.get_user_public().isadmin) {
                let answer = { "useripv4": useripv4, "useripv6": useripv6, "user": user }
                if (callback && typeof callback == 'function') {
                    await callback("", answer);
                }
                return (answer);
            }
            else {
                let error = "API doesn't belong to a user or is not an admin"
                throw (error);
            }
        }
        else {
            let error = "API doesn't belong to a user or is not an admin"
            throw (error);
        }
    }
    catch (err) {
        if (callback && typeof callback == 'function') {
            await callback(err, "");
        }
        //We don't want the throw to go one level up and the error gets already processed in the callback!
        return;
    }
}




export { tasks, pretask }