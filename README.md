# BubbleDNS - Dynamic DNS-Server

BubbleDNS is a self-hosted Dynamic DNS (DDNS) service similar to DynDNS or NO-IP, built to give you complete control over your DNS management. Powered by a flexible nodejs backend, BubbleDNS ensures reliable updates to your IP address, keeping your devices and services always accessible.


## Key Features
* Self-Hosting Freedom: Full control over your DNS setup, hosted entirely on your server.
* Simple Updates: Update your IP via a lightweight web service using tools like curl.
* Custom Domains: Easily add and configure your own domain for dynamic updates.
* Open Source: The whole source code is available here on Github.


## Getting Started
### Requirements
* A domain where the Registrar allows setting the NS Records (Like Namcheap).
* A server with (Nodejs, Mariadb and Apache) OR (~Docker~ coming soon). The following installation refers to Debian / Ubuntu.
* Open the following ports:
    * 53/udp & tcp
    * 80/tcp
    * 443/tcp


## Installation using Nodejs, Mariadb and Apache

### Installation of the Requirements
1. Go to https://nodejs.org/en/download/package-manager/all to downloaded and install NodeJS for your operating system
2. **Install Mariadb and Apache and Git with sudo**
   ```sh
   sudo apt install mariadb-server apache2 git
   ```

### Installation of BubbleDNS
1. **Download BubbleDNS from Github using Git**
   ```sh
   git clone https://github.com/TheBubble717/bubble_dyndnsV2.git
   ```
2. **Enter the Directory**
   ```sh
   cd bubble_dyndnsV2
   ```
3. **Edit the file db.sql**
   ```sh
   nano db.sql
   ```
    **3.1 Change the <Your_Password> to a secure password**<br />
    **3.2 Change the <Main_Domain> to a TLD on which the Server will be available at, e.g. Bubbledns.com**<br />

4. **Execute the db.sql inside the Mariadb-Sever**
   ```sh
   sudo mysql < db.sql
   ```
5. **Edit the file config.json**
   ```sh
   nano config.json
   ```
    **5.1 Change the <Your_Password> to the same password**<br />
    **5.2 Change the <Public_IP_Address> to the Public IP the Server will be available at**<br />
6. **Install the Dependencies**
   ```sh
   npm i
   ```
7. **First Startup of the Server**
   ```sh
   node server.js
   ```
    If you are running the server as a non-sudo user, you may not be able to use port 53/udp directly. I added a small guide under `InstallData/Installation.txt`

    During the first startup, a User with the Username `bubbledns@"maindomain"` is registered and becomes an administrator. The console will post the random generated password to login.<br />
    This server gets also registered as `"ns1"."maindomain"` as an `masternode`. Only `masternodes` can write changes to the database.<br />
    Last but not least, the domain `maindomain` gets also registered under the administrator account and becomes a so called `builtin` domain. `builtin` Domains can be used by every useraccount. 
    After that, the serve kills itself.<br />

8. **Keeping the Server running using pm2**<br />

    There are different solution for restarting a program when it crashes (sometimes intentional). <br />
    If the DNS server settings are changed in the database, for example via the web interface, the server may restart automatically.<br />
    Pm2 is quite good (https://github.com/Unitech/pm2)
    ```
    sudo npm i -g pm2
    pm2 start server.js
    ```

    The internal Webserver should be available under https://127.0.0.1:12512 from the localhost. <br />
    You can add an Apache Reverse Proxy (an example is under `InstallData/apacheconfig.conf`) to make it available under Port 80 & 443.<br />
    You can also directly access the internal Webserver by changing the config file : `webserver.hostname = "0.0.0.0"`, but I would recommend generating a new ssl certificate!<br />

## Configuration 

### Database-Settings
Most of the fundamental changes can only be made in the database for, so that every change gets replicated to the rest of the servers<br />
It will be possible to change settings in the webinterface directly in a later version<br />
⚠️Please don't change those values before first starting up the server.⚠️

```
--- Amount of dns_entries a newly created user can create
insert into bubbledns_settings values("standardmaxentries","5");  
--- Amount of domains a newly created user can claim
insert into bubbledns_settings values("standardmaxdomains","2");  
--- Disable/Enable Password reset over Mail
insert into bubbledns_settings values("enable_passwordreset",true); 
--- Disable/Enable Registration
insert into bubbledns_settings values("enable_register",true);    
--- Maindomain, as already explained
insert into bubbledns_settings values("maindomain","bubbledns.com"); 
--- Allow the use as an real dns server (querying any dns question to an Upstream Server)
--- This should only be allowed if the server is only available in a private network
insert into bubbledns_settings values("allowuseageasrealproxy","false");
--- Ban Time if a Upstream DNS Server has a Timeout
insert into bubbledns_settings values("realdns_bantime","43200");
--- Set which dnstypes can be sent to the BubbleDNS-Server
insert into bubbledns_settings values("allowed_dnstype_questions","[`A`,`AAAA`,`CNAME`,`MX`,`NS`,`PTR`,`SRV`,`SOA`,`CAA`,`TXT`]");
--- Set which dnstypes a user(or admin) is allowed to set on an "builtin" domain
insert into bubbledns_settings values("allowed_dnstype_entries_builtin","[`A`,`AAAA`]");
--- Set which dnstypes the owner(or share) is allowed to set on an "custom" domain (Domain added by an user)
insert into bubbledns_settings values("allowed_dnstype_entries_custom","[`A`,`AAAA`,`CNAME`,`MX`,`TXT`]");
```
### Adding a Mailserver
Like the database settings, you will be able to add a mail server from the frontend<br>
```
Insert into mailserver_settings values ("Host","Port","true/false for SSL/no SSL","Username","Password")
```
Don't add multiple Mailservers, only the first one will be used.


### Config-Settings
1. **Enable/Disable Logging** <br />
    Inside config.json, some compartments have the items `screenLogLevel`, `fileLogLevel` and `debug`.
    * `screenLogLevel`: Only show Logs higher or same level on the screen (1 = Logs, 2 = Warning, 3 = Errors)
    * `fileLogLevel`: Only write Logs higher or same level to the Log-File (1 = Logs, 2 = Warning, 3 = Errors)
    * `debug`: Adds the File & Line from which the log was added.
    Logging everything can decrease performance, so I would recommend only logging warnings.

2. **Rest of the config.json** <br />
    The rest should be self explaining, if you have any questions don't hesitate to contact me.



## Multiple Servers
BubbleDNS supports multiple servers with linked databases. <br />

### Classic Master-Slave
In this setup, the other servers need to have the variable `masternode`=0 <br />
Great tutorial under: https://mariadb.com/kb/en/setting-up-replication/


### Modern Master-Master-Connection using 
In this setup, the other servers need to have the variable `masternode`=1 <br />
Great tutorial under: https://www.ionos.at/digitalguide/hosting/hosting-technik/galera-cluster-mariadb-auf-ubuntu-2004/ (German website)


## Final Words
The Front-End is a little bit of a mess and requires a complete overhaul. It takes time to create new features and kill (hopefully) all the bugs.<br /> 
If you find any Bugs, Errors or Vulnerabilities, please let me know!