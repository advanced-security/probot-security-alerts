## Contributing

[fork]: https://github.com/advanced-security/probot-security-alerts/fork
[pr]: https://github.com/advanced-security/probot-security-alerts/compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Contributions to this project are [released](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license) to the public under the [project's open source license](LICENSE.md).

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Prerequisites for running and testing code

There are no software installations required to be able to test your changes locally as part of the pull request (PR) submission process. Instead, a development container](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers) is included which contains the required environment. The container is compatible with Visual Studio Code and GitHub Codespaces. To develop locally without a container, the project requires [Node.js 18](https://nodejs.org/en/download/).

## Submitting a pull request

1. [Fork][fork] and clone the repository
1. Configure and install the dependencies: `npm i`
1. Make sure the tests pass on your machine: `npm test`
1. Make sure linter passes on your machine: `npm run lint`
1. Lint any Dockerfile changes: `npm run lint:docker`
1. Create a new branch: `git checkout -b my-branch-name`
1. Make your change, add tests, and make sure the tests and linter still pass
1. Push to your fork and [submit a pull request][pr]
1. Pat your self on the back and wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Write tests.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)