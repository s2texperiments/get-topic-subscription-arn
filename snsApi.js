const AWS = require('aws-sdk');
const sns = new AWS.SNS();

module.exports = {
    listSubscriptionsByTopic: async (params) =>new Promise((resolve, rejected) =>
        sns.listSubscriptionsByTopic(params, (err, data) =>
            err ? rejected(err) : resolve(data)))
};