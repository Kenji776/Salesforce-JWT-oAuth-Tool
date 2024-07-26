Question: What is this for?

Answer: When configuring a Salesforce Connected app to use certificates to authenticate you will use JSON Web Tokens to authenticate. This application can take your certificate's key file and sign a request to create a JWT. That JWT can then be used to sign HTTP requests to your Salesforce connected app and interact with it. This application assumes you already have your connected app configured as outlined at https://salesforcecentral.com/accessing-salesforce-with-jwt-oauth-flow/

(but make sure to configure the Callback URL in the connected app to match the "oauth_redirect_url" in the config file. The default config file uses https://oauthdebugger.com/debug )

This application also allows you to authorize a user to use the given connected app. By default if your user has not logged in and you attempt to use the connected app you will recieve an error 

{"error":"invalid_grant","error_description":"user hasn't approved this consumer"}

which is very annoying. To resolve this you need to login as them once and approve the app. This tool can mostly automate that step for you by attempting to initiate the oAuth login flow which will then get you the access_token which can be used to authorize the app for this user.

Question: How to I use it?

Answer: This is a node.js application so you'll need node.js installed on your system. Then you'll need to fill out the values in your config/config.json file. Then you'll need the key file for the certificate you used in your connected app. It should look something like

-----BEGIN PRIVATE KEY-----
BUNCH OF STUFF HERE==
-----END PRIVATE KEY-----

After that you simply need to open a command shell and navigate to the directory the server.js file is in, then run 

node server.js

Or just run the start.bat file (for windows machines)

Question: The redirect part of the authorize a user isn't working. It's saying something about bad redirect?

Answer: That's not a question. But anyway, the fix is in your connected app add whatever you are using as your oauth_redirect_url in the config file. When the authorization is performed that callback is invoked but it has to be whitelisted in the app to be allowed. So just add that URL to the Callback URL configuration of your connected app.

Question: What is the config file?

Answer: The config file (config\config.json) is a JSON structured list of configuration parameters you can adjust as needed for your specific orginzation. If a config file is not found when the program is started an empty one will be created that you can then populate with your values.

Question: In the config file should I use the standard salesforce domains (test.salesforce.com/login.salesforce.com) for the loginURI and tokenURI or my custom domain?

loginURI = where to send login requests. It should be either "https://test.salesforce.com" or "https://login.salesforce.com"
tokenURI = where to token requests. It should be either "https://test.salesforce.com/services/oauth2/token" or "https://login.salesforce.com/services/oauth2/token"
authorizationURI = where to token requests. It should be either "https://test.salesforce.com/services/oauth2/authorize" or "https://login.salesforce.com/services/oauth2/authorize"
client_id = The Id of your connected app. Go to setup -> App Manager -> Your app -> View -> Consumer Key
client_secret = The secret key for your app. Go to setup -> App Manager -> Your app -> View -> Consumer Secret - > click to reveal
user = Salesforce username for the user you want to authenticate and get JWT for.
certificate_key_file = Key file for the certificate you provided to your connected app
oauth_redirect_url = some listener page that Salesforce can call that will read the access_token param. The default of https://oauthdebugger.com/debug should work fine.
oauth_scope = space seperated list of oAuth scope permissions as defined in your connected app.
custom_domain = your custom salesforce domain if you have one (this property will be automatically set in a later release)

Answer: Use the standard Salesforce domains; test.salesforce.com for sandboxes and login.salesforce.com for production and developer orgs.

Author: Dan Llewellyn (Kenji776@gmail.com)
Credits: Based on the project by Bruce Tollefson at https://github.com/bruce-tollefson/SalesforceOauth and information from https://salesforcecentral.com/accessing-salesforce-with-jwt-oauth-flow/

