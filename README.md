# codeartifact-login

[![CircleCI](https://circleci.com/gh/jcoreio/codeartifact-login.svg?style=svg)](https://circleci.com/gh/jcoreio/codeartifact-login)
[![Coverage Status](https://codecov.io/gh/jcoreio/codeartifact-login/branch/master/graph/badge.svg)](https://codecov.io/gh/jcoreio/codeartifact-login)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![npm version](https://badge.fury.io/js/codeartifact-login.svg)](https://badge.fury.io/js/codeartifact-login)

Log into AWS CodeArtifact, without using AWS CLI

Provides a Node.js API, and a CLI wrapper. Both will set the registry and auth token in your npm config.

If you omit the `domain` and `repository` options, `codeartifact-login` will try to determine them from the
current registry in your npm config if it's a CodeArtifact repository endpoint, and update the auth token.
Otherwise the `domain` and `repository` options are required.

If you provide the `namespace` option, `codeartifact-login` will configure npm to use the registry for that
package scope (similar to `npm login --scope`).

## Node.js API

```ts
export default async function codeartifactLogin(options: {
  /**
   * Configuration for creating a default CodeartifcatClient
   */
  awsConfig?: CodeartifactClientConfig
  /**
   * CodeartifactClient to use
   */
  codeartifact?: CodeartifactClient
  /**
   * Codeartifact domain
   */
  domain?: string
  /**
   * Codeartifact domain owner (AWS Account ID)
   */
  domainOwner?: string
  /**
   * Codeartifact repository
   */
  repository?: string
  /**
   * Duration of auth token, in seconds
   */
  durationSeconds?: number
  /**
   * Codeartifact package namespace (npm package scope)
   */
  namespace?: string
  /**
   * Working directory to run `npm config` commands in
   */
  cwd?: string
  /**
   * `npm config` location to use
   */
  location?: 'global' | 'user' | 'project'
}): Promise<{
  /**
   * Codeartifact auth token
   */
  authorizationToken: string
  /**
   * Codeartifact reposiory endpoint
   */
  repositoryEndpoint: string
}>
```

## CLI

```
codeartifact-login

log into CodeArtifact

Options:
  --version          Show version number                               [boolean]
  --help             Show help                                         [boolean]
  --region           AWS region                                         [string]
  --domain           CodeArtifact domain                                [string]
  --domainOwner      AWS Account ID                                     [string]
  --repository       CodeArtifact repository                            [string]
  --durationSeconds  auth token duration, in seconds                    [number]
  --namespace        package scope                                      [string]
  --location         npm config location                                [string]
```
