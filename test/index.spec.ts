/* eslint-env mocha */

import { describe, it } from 'mocha'
import { expect } from 'chai'
import codeartifactLogin from '../src/index'
import {
  GetAuthorizationTokenCommand,
  GetAuthorizationTokenCommandOutput,
  GetRepositoryEndpointCommand,
  GetRepositoryEndpointCommandOutput,
} from '@aws-sdk/client-codeartifact'
import fs from 'fs/promises'
import path from 'path'
import tempy from 'tempy'

describe(`codeartifactLogin`, function () {
  this.timeout(10000)

  const env = {
    ...process.env,
    npm_config_registry: '',
  }

  let cwd
  let FAKE_AUTH_TOKEN = 'lkajsdlfkjasdfa'
  const FAKE_ACCT_ID = '12345678'

  beforeEach(async function () {
    cwd = tempy.directory({ prefix: 'codeartifact-login-test' })
    FAKE_AUTH_TOKEN = 'lkajsdlfkjasdfa'

    await fs.writeFile(
      path.join(cwd, 'package.json'),
      JSON.stringify(
        {
          name: 'codeartifact-login-test',
          version: '0.0.0-development',
        },
        null,
        2
      ),
      'utf8'
    )
  })

  class MockCodeartifact {
    send(
      command: GetAuthorizationTokenCommand
    ): Promise<GetAuthorizationTokenCommandOutput>
    send(
      command: GetRepositoryEndpointCommand
    ): Promise<GetRepositoryEndpointCommandOutput>
    async send(
      command: GetAuthorizationTokenCommand | GetRepositoryEndpointCommand
    ): Promise<
      GetAuthorizationTokenCommandOutput | GetRepositoryEndpointCommandOutput
    > {
      if (command instanceof GetAuthorizationTokenCommand) {
        return { authorizationToken: FAKE_AUTH_TOKEN, $metadata: {} }
      }
      if (command instanceof GetRepositoryEndpointCommand) {
        const { domain, domainOwner, repository } = command.input
        return {
          repositoryEndpoint: `https://${domain}-${
            domainOwner || FAKE_ACCT_ID
          }.d.codeartifact.us-west-2.amazonaws.com/npm/${repository}/`,
          $metadata: {},
        }
      }
      throw new Error(`command not supported: ${String(command)}`)
    }
  }

  it(`passing domain but not repository`, async function () {
    await expect(
      codeartifactLogin({
        domain: 'testdomain',
        codeartifact: new MockCodeartifact() as any,
        cwd,
        env,
        location: 'project',
      })
    ).to.be.rejectedWith(
      `domain and repository must both be defined or both be nullish`
    )
  })
  it(`passing repository but not domain`, async function () {
    await expect(
      codeartifactLogin({
        repository: 'testrepository',
        codeartifact: new MockCodeartifact() as any,
        cwd,
        env,
        location: 'project',
      })
    ).to.be.rejectedWith(
      `domain and repository must both be defined or both be nullish`
    )
  })
  it(`invalid namespace`, async function () {
    await expect(
      codeartifactLogin({
        namespace: '#blah',
        codeartifact: new MockCodeartifact() as any,
        cwd,
        env,
        location: 'project',
      })
    ).to.be.rejectedWith(`invalid namespace: #blah`)
  })

  it(`repeat login when registry isn't set`, async function () {
    await expect(
      codeartifactLogin({
        codeartifact: new MockCodeartifact() as any,
        cwd,
        env,
        location: 'project',
      })
    ).to.be.rejectedWith(
      `tried to determine domain and repository from configured npm registry, but it isn't a codeartifact url: https://registry.npmjs.org/`
    )
  })

  it(`initial login and repeat login`, async function () {
    const domain = 'testdomain'
    const repository = 'testrepository'
    const repositoryEndpoint = `https://${domain}-${FAKE_ACCT_ID}.d.codeartifact.us-west-2.amazonaws.com/npm/${repository}/`

    expect(
      await codeartifactLogin({
        codeartifact: new MockCodeartifact() as any,
        domain,
        repository,
        cwd,
        env,
        location: 'project',
      })
    ).to.deep.equal({
      authorizationToken: FAKE_AUTH_TOKEN,
      repositoryEndpoint,
    })

    expect(
      await fs.readFile(path.join(cwd, '.npmrc'), 'utf8'),
      `contents of ${path.join(cwd, '.npmrc')}`
    ).to.equal(
      [
        ...Object.entries({
          registry: repositoryEndpoint,
          [`${repositoryEndpoint.replace(/^https:/, '')}:always-auth`]: true,
          [`${repositoryEndpoint.replace(/^https:/, '')}:_authToken`]:
            FAKE_AUTH_TOKEN,
        }),
      ]
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n'
    )

    FAKE_AUTH_TOKEN += '_NEW'

    expect(
      await codeartifactLogin({
        codeartifact: new MockCodeartifact() as any,
        cwd,
        env,
        location: 'project',
      })
    ).to.deep.equal({
      authorizationToken: FAKE_AUTH_TOKEN,
      repositoryEndpoint,
    })

    expect(
      await fs.readFile(path.join(cwd, '.npmrc'), 'utf8'),
      `contents of ${path.join(cwd, '.npmrc')}`
    ).to.equal(
      [
        ...Object.entries({
          registry: repositoryEndpoint,
          [`${repositoryEndpoint.replace(/^https:/, '')}:always-auth`]: true,
          [`${repositoryEndpoint.replace(/^https:/, '')}:_authToken`]:
            FAKE_AUTH_TOKEN,
        }),
      ]
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n'
    )
  })
  it(`initial login with namespace and repeat login`, async function () {
    const domain = 'testdomain'
    const repository = 'testrepository'
    const namespace = 'testnamespace'
    const repositoryEndpoint = `https://${domain}-${FAKE_ACCT_ID}.d.codeartifact.us-west-2.amazonaws.com/npm/${repository}/`

    expect(
      await codeartifactLogin({
        codeartifact: new MockCodeartifact() as any,
        domain,
        repository,
        namespace,
        cwd,
        env,
        location: 'project',
      })
    ).to.deep.equal({
      authorizationToken: FAKE_AUTH_TOKEN,
      repositoryEndpoint,
    })

    expect(
      await fs.readFile(path.join(cwd, '.npmrc'), 'utf8'),
      `contents of ${path.join(cwd, '.npmrc')}`
    ).to.equal(
      [
        ...Object.entries({
          [`@${namespace}:registry`]: repositoryEndpoint,
          [`${repositoryEndpoint.replace(/^https:/, '')}:always-auth`]: true,
          [`${repositoryEndpoint.replace(/^https:/, '')}:_authToken`]:
            FAKE_AUTH_TOKEN,
        }),
      ]
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n'
    )

    FAKE_AUTH_TOKEN += '_NEW'

    expect(
      await codeartifactLogin({
        codeartifact: new MockCodeartifact() as any,
        namespace,
        cwd,
        env,
        location: 'project',
      })
    ).to.deep.equal({
      authorizationToken: FAKE_AUTH_TOKEN,
      repositoryEndpoint,
    })

    expect(
      await fs.readFile(path.join(cwd, '.npmrc'), 'utf8'),
      `contents of ${path.join(cwd, '.npmrc')}`
    ).to.equal(
      [
        ...Object.entries({
          [`@${namespace}:registry`]: repositoryEndpoint,
          [`${repositoryEndpoint.replace(/^https:/, '')}:always-auth`]: true,
          [`${repositoryEndpoint.replace(/^https:/, '')}:_authToken`]:
            FAKE_AUTH_TOKEN,
        }),
      ]
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n'
    )
  })
  it(`namespace with @`, async function () {
    const domain = 'testdomain'
    const repository = 'testrepository'
    const namespace = '@testnamespace'
    const repositoryEndpoint = `https://${domain}-${FAKE_ACCT_ID}.d.codeartifact.us-west-2.amazonaws.com/npm/${repository}/`

    expect(
      await codeartifactLogin({
        codeartifact: new MockCodeartifact() as any,
        domain,
        repository,
        namespace,
        cwd,
        env,
        location: 'project',
      })
    ).to.deep.equal({
      authorizationToken: FAKE_AUTH_TOKEN,
      repositoryEndpoint,
    })

    expect(
      await fs.readFile(path.join(cwd, '.npmrc'), 'utf8'),
      `contents of ${path.join(cwd, '.npmrc')}`
    ).to.equal(
      [
        ...Object.entries({
          [`${namespace}:registry`]: repositoryEndpoint,
          [`${repositoryEndpoint.replace(/^https:/, '')}:always-auth`]: true,
          [`${repositoryEndpoint.replace(/^https:/, '')}:_authToken`]:
            FAKE_AUTH_TOKEN,
        }),
      ]
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n'
    )
  })
})
