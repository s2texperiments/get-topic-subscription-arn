const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;

const sinon = require('sinon');
const fake = require('sinon').fake;

const proxyquire = require('proxyquire').noCallThru();

const fs = require('fs');

describe('get-topic-subscription-arn', () => {

    let successFake;
    let failFake;
    let listSubscriptionsByTopicFake;

    let underTest;

    let cfCreateEvent;

    let cfContext = null;

    beforeEach(() => {
        successFake = fake.resolves("send suc");
        failFake = fake.resolves("send fail");

        listSubscriptionsByTopicFake = fake.resolves(getEventData('givenListSubscriptionsByTopic.json'));

        underTest = proxyquire('../index_impl.js', {
            'cf-fetch-response': {
                sendSuccess: successFake,
                sendFail: failFake
            },
            './snsApi': {
                listSubscriptionsByTopic: listSubscriptionsByTopicFake
            }
        });

        cfCreateEvent = getEventData('cfCreateEventData.json');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Missing mandatory arguments should result into rejection', () => {
        it('TopicArn', async () => {
            delete cfCreateEvent.ResourceProperties.TopicArn;
            return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
        });

        it('Endpoint', async () => {
            delete cfCreateEvent.ResourceProperties.Endpoint;
            return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
        });
    });

    describe('Cases where list result leads into fail', () => {
        it('more than one equal endpoint in subscription list', async () => {
            let listSubscriptionsByTopicMoreThanOneEqualEndpointFake = fake.resolves(getEventData('givenListSubscriptionsByTopicDuplicateEntries.json'));
            let underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './snsApi': {
                    listSubscriptionsByTopic: listSubscriptionsByTopicMoreThanOneEqualEndpointFake,
                }
            });
            expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;

            let [listSubscriptionsByTopic] = listSubscriptionsByTopicMoreThanOneEqualEndpointFake.firstCall.args;
            expect(listSubscriptionsByTopic).to.deep.equal(getExpectedResult('expectedListSubscriptionsByTopic.json'));
        });

        it('no matching endpoint', async () => {
            let listSubscriptionsByTopicOnlyUnrelatedEndpointFake = fake.resolves(getEventData('givenListSubscriptionsByTopicNoMatching.json'));
            let underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './snsApi': {
                    listSubscriptionsByTopic: listSubscriptionsByTopicOnlyUnrelatedEndpointFake,
                }
            });
            expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;

            let [listSubscriptionsByTopic] = listSubscriptionsByTopicOnlyUnrelatedEndpointFake.firstCall.args;
            expect(listSubscriptionsByTopic).to.deep.equal(getExpectedResult('expectedListSubscriptionsByTopic.json'));
        });
    });

    describe('Failed service calls should result into rejection', () => {
        it('failing sns.listSubscriptionsByTopic call', async () => {
            underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './snsApi': {
                    listSubscriptionsByTopic: fake.rejects({reason: 'permission denied'})
                }
            });
            return expect(underTest.handler(cfCreateEvent, cfContext)).be.rejected;
        });
    });

    describe('Create get topic subscription arn', () => {
        it('Successful', async () => {
            await underTest.handler(cfCreateEvent, cfContext);
            expectSuccessCFResponse();

            let [event, context, custom] = successFake.firstCall.args;
            expectByPass(event, context, {givenEventData: cfCreateEvent});

            let [listSubscriptionsByTopic] = listSubscriptionsByTopicFake.firstCall.args;
            expect(listSubscriptionsByTopic).to.deep.equal(getExpectedResult('expectedListSubscriptionsByTopic.json'));

            let data = expectCustomData(custom);
            expect(data).to.have.all.keys('Arn');
            expect(data.Arn).to.equal('this:is:a:subscription:arn')

        });
    });

    describe('Update get topic subscription arn', () => {
        it('Successful', async () => {
            let givenEventData = getEventData('cfUpdateEventData.json');
            await underTest.handler(givenEventData, cfContext);
            expectSuccessCFResponse();

            let [event, context, custom] = successFake.firstCall.args;
            expectByPass(event, context, {givenEventData});

            let [listSubscriptionsByTopic] = listSubscriptionsByTopicFake.firstCall.args;
            expect(listSubscriptionsByTopic).to.deep.equal(getExpectedResult('expectedListSubscriptionsByTopic.json'));

            let data = expectCustomData(custom);
            expect(data).to.have.all.keys('Arn');
            expect(data.Arn).to.equal('this:is:a:subscription:arn')
        });
    });

    describe('Delete sns filter policy', () => {
        it('Successful', async () => {
            let givenEventData = getEventData('cfDeleteEventData.json');
            await underTest.handler(givenEventData, cfContext);
            expectSuccessCFResponse();

            let [event, context] = successFake.firstCall.args;
            expectByPass(event, context, {givenEventData});

            expect(listSubscriptionsByTopicFake.callCount).to.equal(0);
        });
    });

    function expectSuccessCFResponse() {
        expect(successFake.callCount).to.equal(1);
        expect(failFake.callCount).to.equal(0);
    }

    function expectByPass(event, context, {givenEventData} = {}) {
        expect(event).to.deep.equal(givenEventData);
        expect(context).to.deep.equal(cfContext);
    }

    function getEventData(file) {
        return JSON.parse(fs.readFileSync(`test/${file}`, 'utf8'));
    }

    function getExpectedResult(file) {
        return JSON.parse(fs.readFileSync(`test/${file}`, 'utf8'));
    }

    function expectCustomData(custom) {
        expect(custom).include.all.keys('data');
        return custom.data;
    }
});
