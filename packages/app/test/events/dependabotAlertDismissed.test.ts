import { mockGitHubApiRequests, getTestableProbot, resetNetworkMonitoring } from "../utils/helpers.js";
import event from "../fixtures/dependabot_alert/dismissed.json";
import { Severity } from "../../src/config/types.js";
import * as config from "../../src/config/index.js";

const payload = event.payload;

describe("When Dependabot alerts are received", () => {
  // Use the any type to avoid issues with additional fields in the payload that Probot cannot recognize
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let probot: any;

  beforeEach(() => {
    probot = getTestableProbot();
  });

  test.each(["maintainer", "member"])(`ignores alerts closed by a %s in the approving team`, async (role: string) => {
    const mock = mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isInApprovingTeam(role)
      .toNock();

    // Receive a webhook event
    await probot.receive({ name: "dependabot_alert", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test(`opens alerts closed by non-member of the approving team`, async () => {
    const mock = mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isNotInApprovingTeam()
      .withAlertState("dependabot", "open")
      .toNock();

    // Receive a webhook event
    await probot.receive({ name: "dependabot_alert", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test('allows alerts when threshold is NONE', async () => {
    const originalConfig = config.getConfiguration();
    const configuration = jest.spyOn(config, 'getConfiguration')
      .mockReturnValueOnce(
        {...originalConfig, ...{ dependabotMinimumSeverity: Severity.NONE }}
      );
    const mock = mockGitHubApiRequests().toNock();
    await probot.receive({ name: "dependabot_alert", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
    expect(configuration).toHaveBeenCalled();
  });

  test("opens alerts if membership request returns a 500 error", async () => {
    const mock = mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .errorRetrievingTeamMembership(500)
      .withAlertState("dependabot", "open")
      .toNock();

    await probot.receive({ name: "dependabot_alert", payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    resetNetworkMonitoring();
  });
});
