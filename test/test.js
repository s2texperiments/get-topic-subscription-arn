const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;

const sinon = require('sinon');
const fake = require('sinon').fake;

const proxyquire = require('proxyquire').noCallThru();

const fs = require('fs');

describe('sns-filter-policy', () => {

    let successFake;
    let failFake;
    let snsSetSubscriptionAttributesFake;

    let underTest;

    let cfCreateExactEvent;

    let cfContext = null;

    beforeEach(() => {
        successFake = fake.resolves("send suc");
        failFake = fake.resolves("send fail");

        snsSetSubscriptionAttributesFake = fake.resolves({status: 'successful'});

        underTest = proxyquire('../index_impl.js', {
            'cf-fetch-response': {
                sendSuccess: successFake,
                sendFail: failFake
            },
            './snsApi': {
                setSubscriptionAttributes: snsSetSubscriptionAttributesFake
            }
        });

        cfCreateExactEvent = getEventData('cfCreateExactEventData.json');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Missing mandatory arguments should result into rejection', () => {
        it('SubscriptionArn', async () => {
            delete cfCreateExactEvent.ResourceProperties.SubscriptionArn;
            return expect(underTest.handler(cfCreateExactEvent, cfContext)).be.rejected;
        });

        it('FilterPolicy', async () => {
            delete cfCreateExactEvent.ResourceProperties.FilterPolicy;
            return expect(underTest.handler(cfCreateExactEvent, cfContext)).be.rejected;
        });
    });

    describe('Invalid event data should result into rejection', () => {
        it('duplicate attribute', async () => {
            return expect(underTest.handler(getEventData('cfCreateDuplicateAttributeEventData.json'), cfContext)).be.rejected;
        });
    });

    describe('Failed service calls should result into rejection', () => {
        it('failing sns.setSubscriptionAttributes call', async () => {
            underTest = proxyquire('../index_impl.js', {
                'cf-fetch-response': {
                    sendSuccess: successFake,
                    sendFail: failFake
                },
                './snsApi': {
                    setSubscriptionAttributes: fake.rejects({reason: 'permission denied'})
                }
            });
            return expect(underTest.handler(cfCreateExactEvent, cfContext)).be.rejected;
        });
    });

    describe('Create new sns filter policy', () => {
        it('with exact match', async () => {
            await underTest.handler(cfCreateExactEvent, cfContext);
            expectSuccessCFResponse();

            let [event, context] = successFake.firstCall.args;
            expectByPass(event, context, {givenEventData: cfCreateExactEvent});

            let [snsSubAttribute] = snsSetSubscriptionAttributesFake.firstCall.args;
            expect(snsSubAttribute).to.deep.equal(getExpectedResult('expectedCreateExactSnsSetSubscriptionAttributes.json'));
        });

        it('with prefix', async () => {
            let givenEventData = getEventData('cfCreatePrefixEventData.json');
            await underTest.handler(givenEventData, cfContext);
            expectSuccessCFResponse();

            let [event, context] = successFake.firstCall.args;
            expectByPass(event, context, {givenEventData});

            let [snsSubAttribute] = snsSetSubscriptionAttributesFake.firstCall.args;
            expect(snsSubAttribute).to.deep.equal(getExpectedResult('expectedCreatePrefixSnsSetSubscriptionAttributes.json'));
        });

        it('with anything but', async () => {
            let givenEventData = getEventData('cfCreateAnythingButEventData.json');
            await underTest.handler(givenEventData, cfContext);
            expectSuccessCFResponse();

            let [event, context] = successFake.firstCall.args;
            expectByPass(event, context, {givenEventData});

            let [snsSubAttribute] = snsSetSubscriptionAttributesFake.firstCall.args;
            expect(snsSubAttribute).to.deep.equal(getExpectedResult('expectedCreateAnythingButSnsSetSubscriptionAttributes.json'));
        });

        it('with range', async () => {
            let givenEventData = getEventData('cfCreateRangeEventData.json');
            await underTest.handler(givenEventData, cfContext);
            expectSuccessCFResponse();

            let [event, context] = successFake.firstCall.args;
            expectByPass(event, context, {givenEventData});

            let [snsSubAttribute] = snsSetSubscriptionAttributesFake.firstCall.args;
            expect(snsSubAttribute).to.deep.equal(getExpectedResult('expectedCreateRangeSnsSetSubscriptionAttributes.json'));
        });
    });

    describe('Update sns filter policy', () => {

        it('FilterPolicy', async () => {
            let givenEventData = getEventData('cfUpdateFilterPolicyEventData.json');
            await underTest.handler(givenEventData, cfContext);
            expectSuccessCFResponse();

            let [event, context] = successFake.firstCall.args;
            expectByPass(event, context, {givenEventData});

            let [snsSubAttribute] = snsSetSubscriptionAttributesFake.firstCall.args;
            expect(snsSubAttribute).to.deep.equal(getExpectedResult('expectedUpdateFilterPolicySnsSetSubscriptionAttributes.json'));
        });

        it('SubscriptionArn', async () => {

            let givenEventData = getEventData('cfUpdateSubscriptionArnEventData.json');
            await underTest.handler(givenEventData, cfContext);
            expectSuccessCFResponse();

            let [event, context] = successFake.firstCall.args;
            expectByPass(event, context, {givenEventData});

            let [snsSubAttribute] = snsSetSubscriptionAttributesFake.firstCall.args;
            expect(snsSubAttribute).to.deep.equal(getExpectedResult('expectedDeleteSnsSetSubscriptionAttributes.json'));

            let [snsSubAttribute1] = snsSetSubscriptionAttributesFake.secondCall.args;
            let expectedNewFilterPolicy = getExpectedResult('expectedUpdateFilterPolicySnsSetSubscriptionAttributes.json');
            //with new subscription arn
            expectedNewFilterPolicy.SubscriptionArn = 's2t-test1-s2tTestSubscription-XXX';
            expect(snsSubAttribute1).to.deep.equal(expectedNewFilterPolicy);

        });
    });

    describe('Delete sns filter policy', () => {
        it('delete', async () => {
            let givenEventData = getEventData('cfDeleteEventData.json');
            await underTest.handler(givenEventData, cfContext);
            expectSuccessCFResponse();

            let [event, context] = successFake.firstCall.args;
            expectByPass(event, context, {givenEventData});

            let [snsSubAttribute] = snsSetSubscriptionAttributesFake.firstCall.args;
            expect(snsSubAttribute).to.deep.equal(getExpectedResult('expectedDeleteSnsSetSubscriptionAttributes.json'));
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
});
