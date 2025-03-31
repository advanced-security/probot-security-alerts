# Developing and Contributing Code

The README file contains tons of details about the project setup. I'm working in the branch `kenmuse/vNext`. I plan to refactor that into multiple documents in `/docs` since this project now has two distinct users:

- Technical teams implementing Probot. That's who it was originally supporting and the primary audience. They tend to run the server component to set up the app (`yarn start`). Then they would like to run scripts to deploy to the cloud. After that, they update the App to point to the cloud deployment.
- Administrative teams trying to deploy the application and test what it does. They prefer to follow docs to set up the App and to have simple paths to setting up the code in Azure, AWS, or a standalone container. The vision is that while they must manually create the App, they can rely on Releases and Packages to deploy a running instance. For environments that support it -- like Azure -- they can use a deployment link to provision and deploy the resources.

Both groups benefit from images in `ghcr.io` and ZIP packages in Releases. They can reference those to quickly deploy from the repo without having to clone or customize the repo.

The Dev Container has support for the Azure Functions Core Tools (`func`), but it has to build those for macOS since they haven't released Linux arm64 binaries yet. `func` can do a lot of the packaging work, but it doesn't handle creating resources. It also sets up SAM and the AWS CLI for AWS Lambda. Because it won't need to build anything, Codespaces tends to be faster to set up.

The environment uses Yarn, and the dev container sets that up. Because it's using workspaces, each package is in a subfolder with its own `package.json` and scripts. The top-level `package.json` sets up the workspaces, provides some global scripts, and has a couple of top-level convenience scripts for testing/building everything.

Running the standalone server (`yarn start` in the root folder or in `packages/server`) is the easiest way to generate all of the fields needed for deploying the app. It uses the manifest flow to configure the app, then writes a `.env` with the App registration details in `packages/server`. For local development with Azure, I have two helper scripts:

- `yarn run storage` - Run this in a different terminal to start Azurite. Functions need a storage emulator for local development.
- `yarn run copyEnv` - Copies the .env settings into the `local.settings.json` in `packages/azure` to emulator the App Settings that would get set in Azure. Both the `.env` and the `local.settings.json` are prevented from being checked in by `.gitignore`.

For `packages/aws`, it's version of `yarn run copyEnv` does the same thing, creating a local JSON environment file for the SAM CLI to use. It doesn't need any emulators.

The standalone server (`packages/server`) is self-configuring, aside from the need to put `GH_ORG` in an initial `.env` if you want it to create the App registration in your organization instead of a personal account. 

The `packages` setup is a convention. I'm using Yarn workspaces to manage this as a monorepo (since all of the components should release and version together). That layout is:
- `app` - The core application and an agnostic handler that supports AWS and Lambda. This is setup as a composite TypeScript project so that it gets built into the components that need it.
- `server` - A standalone application that hosts the Probot app (and adds support for using a signal to kill it). The current v1 codebase is the server and app components combined.
- `azure` - The code specific to hosting app in Azure Functions
- `aws` - The code specific to hosting app in AWS Lambda. Uses the AWS SAM tools to simplify the code/setup.

The code needed some refactoring to support all of these changes. Probot 12 was missing a lot of events, so v1 had custom code to support the missing pieces. In this new version, Probot 13 is used (which eliminated most of the custom types and interfaces). Unfortunately, the Probot code for handling AWS Lambda and Azure code isn't compatible with v13 yet, so I needed a custom implementation (`packages/app/src/handler.ts`).

The code moved from NPM to Yarn. That eliminated `node_modules` and made the package setup much faster. It changed a few behaviors along the way. 

Esbuild to compile the code to a single file. That avoids the need to deal with the fragile TypeScript runtimes. It also eliminates the need to deploy or install any other modules at runtime. The only runtime dependency is the generated file. For the server code, not even the `package.json` file is needed. Every package has a `yarn run build` script to compile the code and place it in `dist`. While the `packages/app` supports being built, it's not intended to be distributed that way. It's pulled into the other packages and consumed directly (essentially, common files). As a side effect, that means the packages have lots of `devDependencies`, but few (or no) `dependencies` in the `package.json`. An exception is the AWS code. That requires esbuild to be a listed dependency for the SAM CLI.

Tests are run using Jest, and formatting uses Eslint. There's a few alpha and beta packages because several of the tools have open issues until their next major release. A lot of this is related to the ongoing move to ESM and some changes in each of the tools. VS Code also uses a Jest extension and has debugging configurations for the server, AWS Lambda, and Azure Functions.

The next version of VS Code will update the Node runtime and allow it to fully support ESM. Because it doesn't, ESLint has to use `.cjs` files for VS Code to recognize the configurations. That explicitly forces it to stay with CommonJS. Once the new version is released, that code can move to ESM as well.

There is a top-level Yarn script that also allows you to run all of the tests and linting across all of the packages (`yarn run test` in the root folder). There's also a `copyEnv` script used by the AWS and Azure packages to copy the settings from `.env` into the appropriate formats for testing those environments locally.
