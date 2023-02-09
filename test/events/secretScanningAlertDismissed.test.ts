// You can import your modules
// import index from '../src/index'

import nock from "nock";
import myProbotApp from "../../src";
import { approvingTeamName } from "../../src/events/approvingTeam";
import { Probot, ProbotOctokit } from "probot";
import event_wont_fix from "./../fixtures/secret_scanning_alert.resolved.wont_fix.json";
import event_pattern_edited from "./../fixtures/secret_scanning_alert.resolved.pattern_edited.json";
import event_pattern_deleted from "./../fixtures/secret_scanning_alert.resolved.pattern_deleted.json";

import fs from "fs";
import path from "path";

const privateKey = fs.readFileSync(
  path.join(__dirname, "..", "fixtures", "mock-cert.pem"),
  "utf-8"
);

// nock.emitter.on("no match", (req: any) => { fail(`Unexpected request: ${req.method} ${req.path}`) });

describe("When secret scanning alerts are received", () => {
  let probot: any;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      // disable request throttling and retries for testing
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    // Load our app into probot
    probot.load(myProbotApp);
  });


  test.each(["maintainer", "member"])(`ignores alerts closed by a %s in ${approvingTeamName}`, async (role: string) => {
    const mock = nock("https://api.github.com")
      
    // Test that we correctly request a token
      .post("/app/installations/10000003/access_tokens")
      .reply(200, {
        token: "test",
        permissions: {
          security_events: "read",
        },
      })

      // Test that the user team membership is requested
      .get(`/orgs/_orgname/teams/${approvingTeamName}/memberships/_magicuser`)
      .reply(200, {
        role: role,
        state: "active"
      });

    // Receive a webhook event
    await probot.receive({ name: "secret_scanning_alert", payload: event_wont_fix.payload});

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test(`opens alerts closed by non-member of the team ${approvingTeamName}`, async () => {
    const mock = nock("https://api.github.com")
      // Test that we correctly return a test token
      .post("/app/installations/10000003/access_tokens")
      .reply(200, {
        token: "test",
        permissions: {
          security_events: "read",
        },
      })

      .get(`/orgs/_orgname/teams/${approvingTeamName}/memberships/_magicuser`)
      .reply(404)

      // Verify that alerts is updated
      .patch("/repos/_orgname/_myrepo/secret-scanning/alerts/1", (body: any) => {
        expect(body).toMatchObject({state:"open"})
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: "secret_scanning_alert", payload: event_wont_fix.payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("opens alerts if membership request returns a 500 error", async () => {
    const mock = nock("https://api.github.com")
      // Test that we correctly return a test token
      .post("/app/installations/10000003/access_tokens")
      .reply(200, {
        token: "test",
        permissions: {
          security_events: "read",
        },
      })

      .get(`/orgs/_orgname/teams/${approvingTeamName}/memberships/_magicuser`)
      .reply(500)

      // Verify that alerts is updated
      .patch("/repos/_orgname/_myrepo/secret-scanning/alerts/1", (body: any) => {
        expect(body).toMatchObject({state:"open"});
        return true;
      })
      .reply(200);

    // Receive a webhook event
    await probot.receive({ name: "secret_scanning_alert", payload: event_wont_fix.payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  const ignoredAlerts = [event_pattern_deleted, event_pattern_edited];
  test.each(ignoredAlerts.map(t => [t.payload.alert.resolution, t.payload]))("ignores custom pattern resolution %s", async (event_type, payload) => {
    const mock = nock("https://api.github.com")
    expect(event_type).toBeDefined(); 
    // Receive a webhook event
    await probot.receive({ name: "secret_scanning_alert", payload: payload });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
