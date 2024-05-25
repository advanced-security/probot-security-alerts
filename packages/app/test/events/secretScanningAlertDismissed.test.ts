import { mockGitHubApiRequests, getTestableProbot, resetNetworkMonitoring } from "../utils/helpers.js";

import event_wont_fix from "./../fixtures/secret_scanning_alert/resolved.wont_fix.json";

import event_pattern_edited from "./../fixtures/secret_scanning_alert/resolved.pattern_edited.json";

import event_pattern_deleted from "./../fixtures/secret_scanning_alert/resolved.pattern_deleted.json";

// The alerts which must be ignored
const IGNORED_SECRET_ALERTS = [event_pattern_deleted, event_pattern_edited];

describe("When secret scanning alerts are received", () => {
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

    await probot.receive({ name: "secret_scanning_alert", payload: event_wont_fix.payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test('opens alerts closed by non-member of the approving team', async () => {
    const mock = mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isNotInApprovingTeam()
      .withAlertState("secret-scanning", "open")
      .toNock();

    // Receive a webhook event
    await probot.receive({ name: "secret_scanning_alert", payload: event_wont_fix.payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("opens alerts if membership request returns a 500 error", async () => {
    const mock = mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .errorRetrievingTeamMembership(500)
      .withAlertState("secret-scanning", "open")
      .toNock();

    await probot.receive({ name: "secret_scanning_alert", payload: event_wont_fix.payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test.each(IGNORED_SECRET_ALERTS.map(t => [t.payload.alert.resolution, t.payload]))("ignores custom pattern resolution %s", async (event_type, payload) => {
    const mock = mockGitHubApiRequests()
        .canRetrieveAccessToken()
        .toNock();
    expect(event_type).toBeDefined();
    // Receive a webhook event
    await probot.receive({ name: "secret_scanning_alert", payload: payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    resetNetworkMonitoring();
  });
});
