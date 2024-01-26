import {
  CodeartifactClient,
  CodeartifactClientConfig,
  GetAuthorizationTokenCommand,
  GetRepositoryEndpointCommand,
} from '@aws-sdk/client-codeartifact'
import execa from 'execa'

export default async function codeartifactLogin(options: {
  awsConfig?: CodeartifactClientConfig
  codeartifact?: CodeartifactClient
  domain?: string
  domainOwner?: string
  repository?: string
  durationSeconds?: number
  namespace?: string
  cwd?: string
  location?: 'global' | 'user' | 'project'
  env?: NodeJS.ProcessEnv
}): Promise<{ authorizationToken: string; repositoryEndpoint: string }> {
  let { awsConfig = {} } = options
  const {
    durationSeconds,
    namespace,
    cwd = process.cwd(),
    location,
    env,
  } = options
  const registryKey = `${namespace ? `${getScope(namespace)}:` : ''}registry`
  if ((options.domain == null) !== (options.repository == null)) {
    throw new Error(
      `domain and repository must both be defined or both be nullish`
    )
  }

  const { domain, domainOwner, repository, region } =
    options.domain != null && options.repository != null
      ? {
          domain: options.domain,
          domainOwner: options.domainOwner,
          repository: options.repository,
          region: awsConfig.region,
        }
      : await parseNpmRegistry({ registryKey, cwd, location, env })

  if (typeof region === 'string') awsConfig = { ...awsConfig, region }

  const codeartifact =
    options.codeartifact ||
    // istanbul ignore next
    new CodeartifactClient(awsConfig)
  const [{ authorizationToken }, { repositoryEndpoint }] = await Promise.all([
    codeartifact.send(
      new GetAuthorizationTokenCommand({
        domain,
        domainOwner,
        durationSeconds,
      })
    ),
    codeartifact.send(
      new GetRepositoryEndpointCommand({
        domain,
        domainOwner,
        repository,
        format: 'npm',
      })
    ),
  ])
  // istanbul ignore next
  if (!authorizationToken) {
    throw new Error(
      `missing authorizationToken in GetAuthorizationToken response`
    )
  }
  // istanbul ignore next
  if (!repositoryEndpoint) {
    throw new Error(
      `missing repositoryEndpoint in GetRepositoryEndpoint response`
    )
  }

  await execa(
    'npm',
    [
      'config',
      'set',
      ...(location
        ? [`--location=${location}`]
        : // istanbul ignore next
          []),
      registryKey,
      repositoryEndpoint,
      `${repositoryEndpoint.replace(/^https:/, '')}:_authToken`,
      authorizationToken,
    ],
    { cwd, stdio: 'inherit', env }
  )
  // eslint-disable-next-line no-console
  console.error(
    `updated npm${
      location
        ? ` ${location}`
        : // istanbul ignore next
          ''
    } config`
  )

  return { authorizationToken, repositoryEndpoint }
}

function getScope(namespace: string): string {
  const scope = namespace.replace(/^@?/, '@')
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*)/.test(scope)) {
    throw new Error(`invalid namespace: ${namespace}`)
  }
  return scope
}

async function parseNpmRegistry({
  registryKey,
  cwd,
  location,
  env,
}: {
  registryKey: string
  cwd: string
  location?: string
  env?: NodeJS.ProcessEnv
}): Promise<{
  domain: string
  domainOwner: string
  region: string
  repository: string
}> {
  const registry = (
    await execa(
      'npm',
      [
        'config',
        'get',
        ...(location
          ? [`--location=${location}`]
          : // istanbul ignore next
            []),
        registryKey,
      ],
      { cwd, stdio: 'pipe', encoding: 'utf8', env }
    )
  ).stdout
  // istanbul ignore next
  if (registry === 'undefined') {
    throw new Error(
      'tried to determine domain and repository from configured npm registry, but configured npm registry is undefined'
    )
  }
  const [, domain, domainOwner, region, repository] =
    /^https:\/\/(\w+)-(\d+)\.d\.codeartifact\.(.+?)\.amazonaws.com\/npm\/(.+?)\/?$/.exec(
      registry
    ) ||
    ((): RegExpExecArray => {
      throw new Error(
        `tried to determine domain and repository from configured npm registry, but it isn't a codeartifact url: ${registry}`
      )
    })()
  return { domain, domainOwner, region, repository }
}
