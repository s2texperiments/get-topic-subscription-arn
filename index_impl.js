const snsApi = require('./snsApi.js');
const response = require("cf-fetch-response");

exports.handler = async (event, context) => {
    
    let {
        RequestType
    } = event;

    switch (RequestType.toLowerCase()) {
        case 'create': {
                return;
      }
        case 'update': {
           return;
        }
        case 'delete': {
          return;
        }
    }
};