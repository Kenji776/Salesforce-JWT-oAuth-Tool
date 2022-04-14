Question: What is this for?

Answer: When configuring a Salesforce Connected app to use certificates to authenticate you will use JSON Web Tokens to authenticate. This application can take your certificate's key file and sign a request to create a JWT. That JWT can then be used to sign HTTP requests to your Salesforce connected app and interact with it. 

This application also allows you to authorize a user to use the given connected app. By default if your user has not logged in and you attempt to use the connected app you will recieve an error 

{"error":"invalid_grant","error_description":"user hasn't approved this consumer"}

which is very annoying. To resolve this you need to login as them once and approve the app. This tool can mostly automate that step for you by attempting to initiate the oAuth login flow which will then get you the access_token which can be used to authorize the app for this user.

Question: How to I use it?

Answer: This is a node.js application so you'll need node.js installed on your system. After that you simply need to open a command shell and navigate to the directory the server.js file is in, then run 

node server.js

Or just run the start.bat file (for windows machines)

Question: What is the config file?

Answer: The config file (config\config.json) is a JSON structured list of configuration parameters you can adjust as needed for your specific orginzation. If a config file is not found when the progrma is started an empty one will be created that you can then populate with your values.

Question: In the config file should I use the standard salesforce domains (test.salesforce.com/login.salesforce.com) for the loginURI and tokenURI or my custom domain?

Answer: Use the standard Salesforce domains; test.salesforce.com for sandboxes and login.salesforce.com for production and developer orgs.

Author: Dan Llewellyn (Kenji776@gmail.com)
Credits: Based on the project by Bruce Tollefson at https://github.com/bruce-tollefson/SalesforceOauth and information from https://salesforcecentral.com/accessing-salesforce-with-jwt-oauth-flow/

