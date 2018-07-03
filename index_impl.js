const snsApi = require('./snsApi.js');
const response = require("cf-fetch-response");

exports.handler = async (event, context) => {

    let {
        RequestType,
        ResourceProperties: {
            TopicArn,
            Endpoint
        }
    } = event;

    switch (RequestType.toLowerCase()) {
        case 'create':
        case 'update': {
            if (!TopicArn || !Endpoint) {
                throw `missing mandatory argument: TopicArn=${TopicArn} Endpoint=${Endpoint}`
            }

            console.log(`Query Topic: ${TopicArn}`);
            let resp = await snsApi.listSubscriptionsByTopic({TopicArn});
            console.log(resp);

            let result = resp.Subscriptions.filter(e => e.Endpoint === Endpoint);
            if(result.length > 1){
                throw `To many results for endpoint ${Endpoint}`
            }
            if(result.length === 0){
                throw `No result for endpoint ${Endpoint}`
            }

            return response.sendSuccess(event, context, {
                data: {
                    Arn: result[0].SubscriptionArn
                }
            });
        }
        case 'delete': {
            return response.sendSuccess(event, context);
        }
    }
};