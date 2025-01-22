DROP DATABASE IF EXISTS bubbledns;
DROP USER IF EXISTS 'bubblednsuser'@'%';
CREATE DATABASE bubbledns;
CREATE USER 'bubblednsuser'@'%' IDENTIFIED BY '<Your_Password>';
GRANT ALL ON bubbledns.* TO 'bubblednsuser'@'%' IDENTIFIED BY '<Your_Password>' WITH GRANT OPTION;
FLUSH PRIVILEGES;
##############################################
use bubbledns;
##############################################


create table domains
(
	id INT NOT NULL,
	builtin boolean NOT NULL CHECK (builtin IN (0, 1)),
	ownerid INT NOT NULL,
	domainname VARCHAR(50) NOT NULL,
	verified boolean NOT NULL CHECK (verified IN (0, 1)),
	verificationdate varchar(25),
	lastverificationresult1 varchar(25),
	lastverificationresult2 varchar(25),
	isregistered boolean NOT NULL CHECK (isregistered IN (0, 1))
);

create table domains_share
(
	domainid INT NOT NULL,
	userid INT NOT NULL
);

create table dns_entries
(
	id INT NOT NULL,
	ownerid INT NOT NULL,
	domainid INT NOT NULL,
	lastchangedtime varchar(25),
	entryname VARCHAR(100) NOT NULL,
	entryvalue varchar(500) NOT NULL,
	entrytype varchar(20) NOT NULL
);


create table users(
	id int NOT NULL,
	mailaddress VARCHAR(60) NOT NULL,
	passwordhash VARCHAR(100) NOT NULL,
	passwordsalt VARCHAR(64) NOT NULL,
	api varchar(100) NOT NULL,
	isadmin boolean NOT NULL CHECK (isadmin IN (0, 1)),
	isactive boolean NOT NULL CHECK (isactive IN (0, 1)),
	maxentries int NOT NULL,
	maxdomains int NOT NULL,
	confirmedmail boolean NOT NULL CHECK (confirmedmail IN (0, 1)),
	registrationdate varchar(25) NOT NULL
);

create table users_confirmationkeys(
	id int NOT NULL,
	userid int NOT NULL,
	keytext varchar(100) NOT NULL,
	keytype int NOT NULL,
	expirationtime varchar(25) NOT NULL,
	completed boolean NOT NULL CHECK (completed IN (0, 1))
);
# 1 = passwordchange ; register = 2  , 

create table users_sessions(
	id int NOT NULL,
	userid  int NOT NULL,
	cookie varchar(200) NOT NULL,
	ipv4 varchar(100),
	ipv6 varchar(100),
	active_until varchar(25) NOT NULL,
	logintime varchar(25) NOT NULL
);

create table dns_upstreamservers(
	id int NOT NULL,
	enabled boolean NOT NULL CHECK (enabled IN (0, 1)),
	address varchar(50) NOT NULL,
	lasttimebanned varchar(50),
	amountbanned int NOT NULL
);

create table bubbledns_servers(
	id int NOT NULL,
	subdomainname varchar(100) NOT NULL,
	enabled_dns boolean NOT NULL CHECK (enabled_dns IN (0, 1)),
	enabled_web boolean NOT NULL CHECK (enabled_web IN (0, 1)),
	public_ipv4 varchar(100),
	public_ipv6 varchar(100),
	internal_ipv4 varchar(100),
	internal_ipv6 varchar(100),
	synctest boolean NOT NULL CHECK (synctest IN (0, 1)),
	masternode boolean NOT NULL CHECK (masternode IN (0, 1))
);

create table bubbledns_servers_virtual(
	id int NOT NULL,
	subdomainname varchar(100) NOT NULL,
	bubblednsserverid int NOT NULL
);

create table bubbledns_servers_testvalues
(
	testvalue varchar(100) NOT NULL
);

create table subdomains_banned_builtin
(
	subdomainname VARCHAR(100)
);

create table subdomains_banned_all
(
	subdomainname VARCHAR(100)
);

#DNS Server
insert into subdomains_banned_all values("dns1");
insert into subdomains_banned_all values("dns2");
insert into subdomains_banned_all values("dns3");
insert into subdomains_banned_all values("dns4");
insert into subdomains_banned_all values("dns5");
insert into subdomains_banned_all values("dns6");
insert into subdomains_banned_all values("dns7");
insert into subdomains_banned_all values("dns8");
insert into subdomains_banned_all values("dns9");
insert into subdomains_banned_all values("ns1");
insert into subdomains_banned_all values("ns2");
insert into subdomains_banned_all values("ns3");
insert into subdomains_banned_all values("ns4");
insert into subdomains_banned_all values("ns5");
insert into subdomains_banned_all values("ns6");
insert into subdomains_banned_all values("ns7");
insert into subdomains_banned_all values("ns8");
insert into subdomains_banned_all values("ns9");

#Mail Server
insert into subdomains_banned_builtin values("mail");
insert into subdomains_banned_builtin values("email");
insert into subdomains_banned_builtin values("webmail");
insert into subdomains_banned_builtin values("smtp");
insert into subdomains_banned_builtin values("pop");
insert into subdomains_banned_builtin values("pop3");
insert into subdomains_banned_builtin values("imap");
insert into subdomains_banned_builtin values("autoconfig");
insert into subdomains_banned_builtin values("autodiscover");
insert into subdomains_banned_builtin values("mta-sts");

#Web Server
insert into subdomains_banned_builtin values("www");

#Abusable
insert into subdomains_banned_builtin values("admin");
insert into subdomains_banned_builtin values("ftp");
insert into subdomains_banned_builtin values("cpanel");
insert into subdomains_banned_builtin values("_acme-challenge");
insert into subdomains_banned_builtin values("_dmarc");
insert into subdomains_banned_builtin values("_spf");
insert into subdomains_banned_builtin values("_domainkey");
insert into subdomains_banned_builtin values("localhost");
insert into subdomains_banned_builtin values("staging");
insert into subdomains_banned_builtin values("dev");
insert into subdomains_banned_builtin values("help");
insert into subdomains_banned_builtin values("api");

insert into subdomains_banned_builtin values("@");
insert into subdomains_banned_builtin values("*");



create table bubbledns_settings
(
	variablename varchar(100) NOT NULL,
	variablevalue varchar(100) NOT NULL
);

create table mailserver_settings
(
	host VARCHAR(100) NOT NULL,
	port int NOT NULL,
	secure boolean NOT NULL CHECK (secure IN (0, 1)),
	auth_user VARCHAR(100) NOT NULL,
	auth_passwd VARCHAR(100) NOT NULL
);

insert into bubbledns_settings values("standardmaxentries","5");
insert into bubbledns_settings values("standardmaxdomains","2");
insert into bubbledns_settings values("enable_passwordreset",true);
insert into bubbledns_settings values("enable_register",true);
insert into bubbledns_settings values("maindomain","<Main_Domain>");
insert into bubbledns_settings values("allowuseageasrealproxy","false");
insert into bubbledns_settings values("realdns_bantime","43200");
insert into bubbledns_settings values("allowed_dnstype_questions","[`A`,`AAAA`,`CNAME`,`MX`,`NS`,`TXT`]");
insert into bubbledns_settings values("allowed_dnstype_entries_builtin","[`A`,`AAAA`]");
insert into bubbledns_settings values("allowed_dnstype_entries_custom","[`A`,`AAAA`,`CNAME`,`MX`,`TXT`]");
insert into bubbledns_settings values("newServer","true");






#//ONLY MASTER
#CREATE USER 'replication_user'@'%' IDENTIFIED BY '<YourReplicationPassword>';
#GRANT REPLICATION SLAVE ON *.* TO 'replication_user'@'%';