#Get Topic Subscription Arn
Cloudformation Custom Resource to find SNS topic subscription arn.

## Input:
```yaml
#required
TopicArn: topic arn which should be queried
Endpoint: endpoint as matching criteria
```

##Output
```yaml
Arn: Founded subscription arn
```
Throws error when: 
- no subscription arn will be founded
- more than one subscription arn will be founded

##Example
```yaml
GetTopicSubscriptionArn: 
  Type: "Custom::GetTopicSubscriptionArn"
  Properties: 
    ServiceToken:
      !Sub |
        arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${LambdaFunctionName}
    TopicArn: Ref(Topic)
    Endpoint: GetAtt(LambdaWhichIsSubscribed,'Arn')
    StackName: 
      Ref: "StackName"      
```

## Limitation
An Endpoint must be unique in the topic subscription list.