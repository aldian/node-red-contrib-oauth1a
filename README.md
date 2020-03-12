# node-red-contrib-oauth1a

With OAuth 1.0A, you sign the URL being used to access protected resources.
Even though there is already OAuth 2.0, there are companies, many of them are financial institutions, 
still intentionally use OAuth 1.0A.
In case of Twitter, using OAuth 1.0A, you can allow apps to access user's private information and act on behalf of the user. 
Using OAuth 2.0, Twitter only allow apps to read publicly available information.

## Registering an App to access Resources

When registering your app to access resources, such as Twitter or Facebook data, you will be given a consumer key.
A consumer key identifies your app.
You will also be given an initial token to access authentication related resources.
Using authentication and authorization flow, you will escalate that initial token to a new token, usually called an access token, 
that allows you access more interesting resources.

Both consumer key and token are protected by secret strings, so after registering your app, you will likely be given
this 4 values:
OAUTH_CONSUMER_KEY, OAUTH_CONSUMER_SECRET, OAUTH_TOKEN, and OAUTH_TOKEN_SECRET.
You should never let other people know your OAUTH_CONSUMER_SECRET and OAUTH_TOKEN_SECRET.

For security purpose, if you push your flows to a git repository, 
don't store the 4 values in a flow. Instead, use environment variable.
For example:
```
export OAUTH_CONSUMER_KEY=...
export OAUTH_CONSUMER_SECRET=...
export OAUTH_TOKEN=...
export OAUTH_TOKEN_SECRET=...
```
## The oauth1a Node

This package provides 1 node, the oauth1a node, that accepts URL to be signed and some values to be able to sign
that URL. 
After signing the URL, the node will access the resource located on that URL and returns the response data to the next node.

The basic nodes configuration will consist of:
1. a function node that prepares values on `msg.payload`,
2. an oauth1a node that receives an `msg` sent by the function node,
3. another function node that uses the response of URL accessed by oauth1a node.

## Examples

Here are some examples on how you can use oauth1a node on Twitter resources.

### Requesting a token to authenticate the user

Create a function node that returns an `msg` containing request token URL:
```
msg.payload = {
  consumerSecret: env.get("TWITTER_API_SECRET_KEY"),
  tokenSecret: env.get("TWITTER_ACCESS_TOKEN_SECRET"),
  url: 'https://api.twitter.com/oauth/request_token',
  httpMethod: 'POST',
  parameters: {
    oauth_callback: env.get("TWITTER_AUTH_CALLBACK_URL"),
    oauth_consumer_key: env.get("TWITTER_API_KEY"),
    oauth_token: env.get("TWITTER_ACCESS_TOKEN"),
    oauth_signature_method: 'HMAC-SHA1',
  }
};
return msg;
```
The `msg` payload contains an object that has these components:
1. The URL of a resource that will be accessed by oauth1a node.
2. Secrets to be used to sign parameters.
3. Parameters to be signed.
4. It can also has a body object. It will be shown on the next example. If there is a body object, it will also need
   to be put on parameters to be signed.

Link the output of that function node to the input of an oauth1a node.

oauth1a node accesses the signed URL and captures the response in `msg.payload.data`.

`msg.payload.data` of the response of request token URL contains a new `oauth_token` and `oauth_token_secret`
to be used on Twitter auth page: `https://api.twitter.com/oauth/authenticate?oauth_token=<the content of msg.payload.data.oauth_token>`.

Once authentication on Twitter auth page is successful, the browser page will be redirected to your own URL at`env.get("TWITTER_AUTH_CALLBACK_URL")?oauth_verifier=<A nonce value marking that you have been authenticated>`.

### Requesting a token to access protected resources

Your callback URL from the previous example receives `oauth_verifier`. We will use that value to sign Twitter 
access token URL. In order to do that, we need to prepare the `msg` in a new function node: 
```
msg.payload = {
  consumerSecret: env.get("TWITTER_API_SECRET_KEY"),
  tokenSecret: <The oauth token secret you obtained from the previous example>,
  url: 'https://api.twitter.com/oauth/access_token',
  httpMethod: 'POST',
  parameters: {
    oauth_consumer_key: env.get("TWITTER_API_KEY"),
    oauth_token: msg.req.query.oauth_token,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_verifier: msg.req.query.oauth_verifier,
  },
  body: {
    oauth_verifier: msg.req.query.oauth_verifier,
  }
};
return msg;
```
Just like the previous example, link the output of the new function node to the input of a new oauth1a node.
Just like the previous example, oauth1a node will output `msg.payload.data.oauth_token` and `msg.payload.data.oauth_token_secret`.
However, those new tokens can be used to access Twitter features such as reading timeline or posting tweets.

### Accessing a resource

After succesfully tries the previous example, you are ready to access Twitter feature endpoints such as https://api.twitter.com/1.1/statuses/home_timeline.json.
Prepare the `msg` to sign that endpoint URL on a new function node:
```
msg.payload = {
  consumerSecret: env.get("TWITTER_API_SECRET_KEY"),
  tokenSecret: msg.payload.data.oauth_token_secret,
  url: 'https://api.twitter.com/1.1/statuses/home_timeline.json?include_entities=true',
  httpMethod: 'GET',
  parameters: {
    oauth_consumer_key: env.get("TWITTER_API_KEY"),
    oauth_token: msg.payload.data.oauth_token,
    oauth_signature_method: 'HMAC-SHA1',
    include_entities: 'true',
  }
};
return msg;
```
Connect its output to the input of a new oauth1a node.
The output of oauth1a node is the output of the twitter endpoint above.
