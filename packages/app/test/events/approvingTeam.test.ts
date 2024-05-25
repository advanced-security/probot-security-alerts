import { ProbotOctokit } from "probot";
import pino from "pino";
import { OctokitResponse } from "@octokit/types";
import { isUserInApproverTeam, OctokitContext } from '../../src/events/approvingTeam';

describe('When evaluating isUserInApproverTeam', () => {
    let context: OctokitContext;

    beforeEach(() => {
        context = {
            octokit: new ProbotOctokit(),
            log: pino(jest.fn())
        };
        context.log.info = jest.fn();
    });

    test.each`
    user          | owner        | nullctx     | result
    ${null}       | ${'owner'}   | ${false}    | ${false}
    ${'user'}     | ${'owner'}   | ${false}    | ${true}
    ${null}       | ${null}      | ${false}    | ${false}
    ${'user'}     | ${null}      | ${false}    | ${false}
    ${null}       | ${null}      | ${true}     | ${false}
    ${'user'}     | ${null}      | ${true}     | ${false}
    ${null}       | ${'owner'}   | ${true}     | ${false}
    ${'user'}     | ${'owner'}   | ${true}     | ${false}
    `('should return $result for user:$user owner:$owner null-context:$nullctx',
        async ({ user, owner, nullctx, result }) => {
            const requestContext = nullctx ? null : context;
            const success: OctokitResponse<{ url: string; role: "maintainer" | "member"; state: "active" | "pending"; }, 200> = {
                headers: {},
                status: 200,
                url: '...',
                data: {
                    url: '...',
                    role: 'maintainer',
                    state: 'active'
                }
            };
            const mock = jest.spyOn(context.octokit.teams, 'getMembershipForUserInOrg').mockImplementation(() => {
                if (result) {
                    return Promise.resolve(success);
                }
                else {
                    throw Error('TEST-FAIL');
                }
            });
            const output = await isUserInApproverTeam(requestContext as OctokitContext, owner as string, user as string);
            expect(output).toEqual(result);
            expect(mock).toBeCalledTimes(result ? 1 : 0);
        });
});
