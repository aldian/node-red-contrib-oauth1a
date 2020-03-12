module.exports = function(RED) {
    const uuid = require('uuid');
    const oauthSignature = require('oauth-signature');
    const qs = require('qs');
    const axios = require('axios');

    function OAuth1a(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function(msg, send, done) {
            send = send || function() { node.send.apply(node,arguments) }

            const oauthInfo = msg.payload;

            const nonce = uuid.v4();
            const timestamp = Math.round((new Date()).getTime() / 1000).toString();
            const oauthVersion = '1.0';

            let parameters = {
                ...oauthInfo.parameters,
                oauth_nonce: nonce,
                oauth_timestamp: timestamp,
                oauth_version: oauthVersion,
            };

            const signature = oauthSignature.generate(
                oauthInfo.httpMethod,
                oauthInfo.url, 
                parameters,
                oauthInfo.consumerSecret,
                oauthInfo.tokenSecret,
                {encodeSignature: false},
            );
            parameters.oauth_signature = signature;

            const headers = {
                'Authorization': 'OAuth ' + Object.keys(parameters).sort().reduce(
                    (updatedAuthStr, key) => {
                        if (updatedAuthStr === '') {
                            return `${key}="${encodeURIComponent(parameters[key])}"`;
                        }

                        return updatedAuthStr + `,${key}="${encodeURIComponent(parameters[key])}"`;
                    }, ''
                ),
            }

            axios({
                method: oauthInfo.httpMethod,
                url: oauthInfo.url,
                headers,
                data: qs.stringify(oauthInfo.body || {}),
            }).then(response => {
                let data = response.data;
                if (response.status === 200 && typeof data === 'string') {
                    data = qs.parse(data);
                }
                send({
                    ...msg,
                    payload: {...response, data}
                });
                if (done) {
                    done();
                }
            }).catch(error => {
                if (done) {
                    done(error);
                } else {
                    node.error(error, msg);
                }
            });
        });
    }
    RED.nodes.registerType("oauth1a", OAuth1a);
}
