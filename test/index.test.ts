// You can import your modules
// import index from '../src/index'

import nock from "nock";
import myProbotApp from "../src";
import { Probot, ProbotOctokit } from "probot";
import event from "./fixtures/installation_repositories.added.json"
import fs from "fs";
import path from "path";

const privateKey = fs.readFileSync(
  path.join(__dirname, "fixtures/mock-cert.pem"),
  "utf-8"
);

// nock.emitter.on("no match", (req: any) => { fail(`Unexpected request: ${req.method} ${req.path}`) });

describe("When running the probot app", () => {
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

  test("can receive installation message", async () => {
    const mock = nock("https://api.github.com");
    await probot.receive({ name: "installation", payload: event.payload });
    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
