import { mockGitHubApiRequests, getTestableProbot, resetNetworkMonitoring } from "../utils/helpers"
import event from "../fixtures/dependabot_alert/dismissed.json";

const payload = event.payload;

describe("When Dependabot alerts are received", () => {
  let probot: any;

  beforeEach(() => {
    probot = getTestableProbot();
  });

  test.each(["maintainer", "member"])(`ignores alerts closed by a %s in the approving team`, async (role: string) => {
    const mock = mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isInApprovingTeam(role)
      .toNock()

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
