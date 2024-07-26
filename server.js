const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require("crypto");
const fs = require('fs');
const configFileName = 'config.json';
const readline = require('readline');
start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
config = {};

delimiter = ( process.platform == 'win32' ? '\\' : '/' ); 
escapeChr = ( process.platform == 'win32' ? '^' : '\\' ); 


async function init(){
	console.log('\x1b[32m                                       Salesforce JWT oAuth Tool \x1b[0m');
	await setup();
	config = readConfigs(configFileName);
		
	var d = new Date();
	log('Started process at ' + d.toLocaleString(), false);
	
	menu();
}

async function menu(){
	console.log('\n\nSelect an option\n');
	console.log('1) Authorize User to Use Connected App');
	console.log('2) Get JSON Web Token (JWT)');
	console.log('3) Make a Test Call to API');
	console.log('4) Show Configuration');
	console.log('5) Show Log');
	console.log('6) Help');
	
	const choice = await prompUser("\nEnter Selection: ");
	
	if(choice == 1) performAuthRequest();
	else if(choice == 2) getJWT();
	else if(choice == 3) {
		let accessToken = getAccessTokenFromFile('logs' + delimiter + 'jwt_response.json');
		if(accessToken != null) performSampleRequest(accessToken);
		else menu();
	}
	else if(choice == 4) showConfigs();
	else if(choice == 5) showLogs();
	else if(choice == 6) help();
	else menu();
	
}
function readConfigs(fileName){	
	log('Loading configs',false);
	let configData = fs.readFileSync('config' + delimiter +fileName);
	log('Loaded raw config data',false);
	log(configData.toString(),false);
	let parsedConfig = JSON.parse(configData);
	log('Parsed configs',false);
	log(JSON.stringify(parsedConfig, null, 5),false);
	return parsedConfig;
}

function showConfigs(){
	log(config);
	menu();
}

async function help(){
	let helpData = fs.readFileSync('readme.txt').toString();
	console.log(helpData);
	const choice = await prompUser("\nPress enter to continue");
	menu();
}

async function showLogs(){
	let fileData = fs.readFileSync('logs' + delimiter + 'log.txt').toString();
	console.log(fileData);
	const choice = await prompUser("\nPress enter to continue");
	menu();
}

async function performAuthRequest(){
	
	log('Performing 1 time auth of user to avoid "invalid_grant" error', true, 'green');
	
	let baseUrl = config.authorizationURI;
	
	const params = {
		client_id: config.client_id,
		redirect_uri: config.oauth_redirect_url,
		scope: config.oauth_scope.replaceAll(' ','+')
	}
	
 
	let url = `${baseUrl}?client_id=${params.client_id}${escapeChr}&redirect_uri=${params.redirect_uri}${escapeChr}&scope=${params.scope}${escapeChr}&response_type=code${escapeChr}&response_mode=query`;
	log( 'Opening ' + url );
 	let request = {
		'URI': url,
	};
	
	fs.writeFile('logs' + delimiter + 'user_authorization_code_request.json', JSON.stringify(request, null, 5), function (err) {
	  if (err) return log(err);
	});	
	
	log('Auth request URL: ' + url,false);
	require('child_process').exec(start + ' ' + url);
	
	log('Please wait for browser window to open then copy and paste the Authorization code below.\n\n');
	const authCode = await prompUser("\nPlease enter Authorization code: ");
	authorizeUser(authCode);
	
	fs.writeFile('logs' + delimiter + 'user_authorization_code_response.json', authCode, function (err) {
	  if (err) return log(err);
	});
}

async function authorizeUser(authCode){
	
	log('\nPerforming authorization with code: ' + authCode);
	
	let baseUrl = config.tokenURI;

	const params = {
		grant_type: "authorization_code",
		code: authCode,
		client_id: config.client_id,
		client_secret: config.client_secret,
		redirect_uri: config.oauth_redirect_url
	}

	let url = `${baseUrl}?grant_type=${params.grant_type}&code=${params.code}&client_id=${params.client_id}&client_secret=${params.client_secret}&redirect_uri=${params.redirect_uri}`;

	let request = {
		'URI': url,
	};
	
	fs.writeFile('logs' + delimiter + 'authorize_user_request.json', JSON.stringify(request, null, 5), function (err) {
	  if (err) return log(err);
	});	
	
	log(url);
	
	try {
		grant = await axios.post(url);		
		let parsedData = JSON.parse(JSON.stringify(grant.data));	
		log(parsedData);
		
		fs.writeFile('logs' + delimiter + 'authorize_user_response.json', JSON.stringify(parsedData, null, 5), function (err) {
		  if (err) return log(err);
		});

	} catch (err) {
		log('-------- Error!','true','red');
		log(err);
	} finally{
			menu();
	}
}

async function getJWT(){
	
	if (!fs.existsSync(config.certificate_key_file)) {
		log('Could not find certificate file: ' + config.certificate_key_file +'. Please ensure it exists and try again.', true, 'red');
		return null;
	}
	
	const payload = {
		iss: config.client_id,
		sub: config.user,
		aud: config.loginURI,
		exp: Math.floor(Date.now() / 1000) + 60 * 3,
	};
	
	let privateKey = fs.readFileSync(config.certificate_key_file);
	let token = jwt.sign(payload, privateKey, {
		algorithm: 'RS256'
	});
	let payloadString = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`;

	const axiosConfig = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	};

	let request = {
		'URI': config.tokenURI,
		'Payload' : payloadString,
		'Headers' : axiosConfig.headers
	};
	fs.writeFile('logs' + delimiter + 'jwt_assertion.json', JSON.stringify(request, null, 5), function (err) {
	  if (err) return log(err);
	});	
		
	//make sure the connected app is either a managed policy where the profile/permission set you are trying to use is authorized or login with the connected app using a different flow first other wise you will get - 	
	//Remote Access 2.0	Failed: Not approved	JWT Test App	login.salesforce.com - in the login history and on the server     
	//data: {error: 'invalid_grant', error_description: "user hasn't approved this consumer"} 
	//https://salesforce.stackexchange.com/questions/184363/salesforce-jwt-user-hasnt-approved-this-consumer-again

	let response = '';
	try {
		grant = await axios.post(config.tokenURI, payloadString, axiosConfig);
		let parsedData = JSON.parse(JSON.stringify(grant.data));
		log(parsedData);
		fs.writeFile('logs' + delimiter + 'jwt_response.json', JSON.stringify(parsedData, null, 5), function (err) {
		  if (err) return log(err);
		});	
	} catch (err) {
		log('-------- Error!','true','red');
		log(err);
	} finally{
			menu();
	}
	
}

async function performSampleRequest(accessToken){
	log('Performing sample call with token: ' + accessToken);
	
	url = config.custom_domain + '/services/data/';
	//url = config.loginURI + '/services/data/v52.0/query/?q=SELECT%20Id%2CName%2CType%20FROM%20User';
	const axiosConfig = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'authorization' : 'Bearer ' +accessToken
		},
	};

	try {
		testData = await axios.get(url, axiosConfig);	
		let parsedData = JSON.parse(JSON.stringify(testData.data));
		log(parsedData);
	} catch (err) {
		log('-------- Error!','true','red');
		log(err);
	} finally{
		menu();
	}
}

function getAccessTokenFromFile(fileName){
	

	log('Reading access token from file ' + fileName, false);
	
	if (!fs.existsSync('logs' + delimiter + 'jwt_response.json')) {
		log('Could not find access token file: ' + fileName +'. Please get JWT and try again', true, 'red');
		return null;
	}
	
	let fileData = fs.readFileSync('logs' + delimiter + 'jwt_response.json').toString();
	log('Reading access file data: ' + fileData, false);
	let accessTokenObject = JSON.parse(fileData);
	log('Parsed data: ', false);
	log(accessTokenObject, false);
	
	return accessTokenObject.access_token;
}

function prompUser(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

function log(logItem,printToScreen,color)
{	
	printToScreen = printToScreen != null ? printToScreen : true;
	var colorCode='';
	switch(color) {
		case 'red':
			colorCode='\x1b[31m'
		break;
		case 'green':
			colorCode='\x1b[32m';
		break;
		case 'yellow':
			colorCode='\x1b[33m';
	}
	
	if(printToScreen) {
		console.log(colorCode);
		console.log(logItem);
		console.log('\x1b[0m');
	}
	fs.appendFile('logs' + delimiter + 'log.txt', logItem + '\r\n', function (err) {
		if (err) throw err;
	});	
}

async function setup(){
	configDir = 'config';
	logsDir = 'logs';
	if (!fs.existsSync(configDir)){
		fs.mkdirSync(configDir);
	}
	if (!fs.existsSync(logsDir)){
		fs.mkdirSync(logsDir);
	}
	
	if (!fs.existsSync(configDir + delimiter + 'config.json')) {
  
			log('\n\n\n\nCONFIGURATION FILE DID NOT EXIST. AN EMPTY CONFIGURATION HAS BEEN CREATED BUT YOU MUST POPULATE IT WITH VALUES BEFORE CONTINUING!      \n\n\n\n\n',true,'red');
			
			fs.writeFileSync('config' + delimiter + 'config.json', JSON.stringify(JSON.parse(getDefaultConfigJson()), null, 5), function (err) {
			  if (err) return log(err);
			});
			
			const choice = await prompUser("\nPress enter to exit");
			
			process.exit(1)
    }
}

function getDefaultConfigJson(){
	return '{ ' +
	  '"loginURI": "https://test.salesforce.com",' +
	  '"tokenURI": "https://test.salesforce.com/services/oauth2/token",' +
	  '"authorizationURI": "https://test.salesforce.com/services/oauth2/authorize", ' +
	  '"client_id": "YOUR CONNECTED APP CLIENT ID HERE",' +
	  '"client_secret": "YOUR CONNECTED APP CLIENT SECRET HERE",' +
	  '"user": "SF USERNAME TO AUTHORIZE",' +
	  '"certificate_key_file" : "server.key",' +
	  '"oauth_redirect_url" : "https://oauthdebugger.com/debug",' +
	  '"oauth_scope" : "api refresh_token offline_access full", ' +
	  '"custom_domain" : "https://YOUR CUSTOM DOMAIN HERE" ' +
	'}';
}

process.on('uncaughtException', (err) => {
    log(err,true,'red');
    process.exit(1) //mandatory (as per the Node docs)
})





init();
