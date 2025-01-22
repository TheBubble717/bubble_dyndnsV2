"use strict";
import { objectconverter as objectconverter_bubble_expressescape_library } from "./bubble_expressescape_library.js"
import net from 'node:net';
import fs from "fs"

var addfunctions = {

    
    randomidf: function () {
        var length = 7
        var result = '';
        var characters = '0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    },

    randomapif: function () {
        var length = 95
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    },
    
    randomcookief: function () {
        var length = 180
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    },

    unixtime_to_local: function (unixtimestamp) {
        if (unixtimestamp === undefined) {
            var date = new Date();
        }
        else {
            var date = new Date(unixtimestamp);
        }

        var hour = date.getHours();
        hour = (hour < 10 ? "0" : "") + hour;

        var min = date.getMinutes();
        min = (min < 10 ? "0" : "") + min;

        var sec = date.getSeconds();
        sec = (sec < 10 ? "0" : "") + sec;

        var year = date.getFullYear();

        var month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;

        var day = date.getDate();
        day = (day < 10 ? "0" : "") + day;

        return year + month + day + "-" + hour + min + sec;
    },

    current_time: function () {
        var date = new Date();
        var hour = date.getHours();
        hour = (hour < 10 ? "0" : "") + hour;

        var min = date.getMinutes();
        min = (min < 10 ? "0" : "") + min;

        var sec = date.getSeconds();
        sec = (sec < 10 ? "0" : "") + sec;

        var year = date.getFullYear();

        var month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;

        var day = date.getDate();
        day = (day < 10 ? "0" : "") + day;

        let currenttime =
        {
            "hour": hour,
            "min": min,
            "sec": sec,
            "year": year,
            "month": month,
            "day": day
        }
        return currenttime;

    },

    isIPv4: function (str) {
        return net.isIPv4(str);
    },

    isIPv6: function (str) {
        return net.isIPv6(str);
    },

    isDomain: function (str) {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
        return domainRegex.test(str);
    },

    isTLDomain: function (domain) {
        const mainDomainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.[A-Za-z]{2,}$/;
        return mainDomainRegex.test(domain);
    },

    //Get Client-ipv4 (if not valid, set to null)
    getclientipv4: function (req) {
        var ipv4 = req.headers['x-forwarded-for'] ||
            req.socket.remoteAddress ||
            null;
        if (addfunctions.isIPv4(ipv4)) {
            return ipv4;
        }
        else {
            return null;
        }

    },

    waittime: async function (s) {
        return new Promise(resolve => setTimeout(resolve, s * 1000));
    },

    waittime_random: function (min, max) {
        return new Promise(resolve => {
            const delay = Math.floor(Math.random() * (max - min + 1)) + min;
            setTimeout(() => resolve(), delay);
        });
    },

    read_file: function (file, callback) {
        return new Promise(async (resolve, reject) => {
            fs.readFile(`${file}`, async function (err, data) {
                if (err) {
                    if (callback && typeof callback == 'function') {
                        await callback(err, "");
                        resolve();
                    }
                    else {
                        reject(err);
                    }
                    return;
                }
                else {
                    if (callback && typeof callback == 'function') {
                        await callback("", data);
                        resolve();
                    }
                    else {
                        resolve(data);
                    }
                    return;
                }
            });
        });
    },

    check_for_correct_datatype(requiredFields, data, deleterest = true) {
        if (typeof data !== "object" || data === null) {
            return { "success": false, "msg": `Function received data not as object.` };
        } 
        else {

            // Remove properties from data that are not in requiredFields
            if (deleterest) {
                for (const key in data) {
                    if (!requiredFields.hasOwnProperty(key)) {
                        //console.log("deleted " + data[key] +" of "+ key)
                        delete data[key];
                    }
                }
            }


            for (const [field, type] of Object.entries(requiredFields)) {
                if (!data.hasOwnProperty(field)) {
                    return { "success": false, "msg": `Function didn't receive the property ${field}` };
                }

                const fieldValue = data[field];
                const fieldType = fieldValue === null ? "null" : typeof fieldValue;

                if (Array.isArray(type)) {
                    if (!type.includes(fieldType)) {
                        return { "success": false, "msg": `Function received the property '${field}' as type '${fieldType}'. Expected one of '${type.join(', ')}'.` };
                    }
                } else {
                    if (fieldType !== type) {
                        return { "success": false, "msg": `Function received the property '${field}' as type '${fieldType}'. Expected '${type}'.` };
                    }
                }
            }
            return { "success": true, "data": `DataTypes correct` };
        }
    },

    check_dns_entry_validation: function(dnstype, dnsvalue) {
        switch (dnstype.toUpperCase()) {
            case 'A':
                // Validate IPv4 address
                return this.isIPv4(dnsvalue);
            case 'AAAA':
                // Validate IPv6 address
                return this.isIPv6(dnsvalue);
            case 'CNAME':
                // Validate CNAME is Domain
                return this.isDomain(dnsvalue)
            case 'MX':
                // Validate MX record (is an non-empty string) OR boolean or number
                return (typeof dnsvalue === 'string' && dnsvalue.length > 0) || (typeof dnsvalue === 'boolean') || (typeof dnsvalue === 'number');
            case 'TXT':
                // Validate MX record (is an non-empty string) OR boolean or number
                return (typeof dnsvalue === 'string' && dnsvalue.length > 0) || (typeof dnsvalue === 'boolean') || (typeof dnsvalue === 'number');
            default:
                // Unknown DNS type
                return true;
        }
    },

    objectconverter: function(obj) {
        return objectconverter_bubble_expressescape_library(obj)
    },

    check_for_valid_user_entries: async function ({ mailaddress = null, password1 = null, password2 = null } = {}) {

            if (mailaddress !== null) {

                if (typeof mailaddress != "string") {
                    return({ "success": false, "msg": "mailaddress not a string" })
                }

                //Check if mailaddress is too long
                if (mailaddress.length > 40) {
                    return({ "success": false, "msg": "mailaddress too long (40 is max)" })
                }

                //Check if mailaddress is too short
                if (mailaddress.length < 4) {
                    return({ "success": false, "msg": "mailaddress too short (4 is min)" })
                }

                // Regular expression for validating email addresses
                if (mailaddress.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/) === null) {
                    return({ "success": false, "msg": "mail address contains unallowed characters or is invalid" });
                }
            }
            if (password1 !== null) {

                if (password2 !== null) {

                    //Check if passowrd1 & password2 are the same
                    if (password1 !== password2) {
                        return({ "success": false, "msg": "Passwords not the same" })
                    }
                }

                if (typeof password1 != "string") {
                    return({ "success": false, "msg": "password not a string" })
                }

                //Check if password is too long
                if (password1.length > 50) {
                    return({ "success": false, "msg": "Password too long (50 is max)" })
                }

                //Check if password is too short
                if (password1.length < 8) {
                    return({ "success": false, "msg": "Password too short (8 is min)" })
                }

            }
            return({ "success": true, "data": "OK" })
    }

}

export { addfunctions }