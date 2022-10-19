import yargs from 'yargs'
import codeartifactLogin from '.'

type Options = {
  region?: string
  domain?: string
  domainOwner?: string
  repository?: string
  durationSeconds?: number
  namespace?: string
  location?: string
}

yargs
  .scriptName('codeartifact-login')
  .command(
    '$0',
    'log into CodeArtifact',
    (yargs: yargs.Argv<Options>) =>
      yargs
        .option('region', {
          describe: 'AWS region',
          type: 'string',
        })
        .option('domain', {
          describe: 'CodeArtifact domain',
          type: 'string',
        })
        .option('domainOwner', {
          describe: 'AWS Account ID',
          type: 'string',
        })
        .option('repository', {
          describe: 'CodeArtifact repository',
          type: 'string',
        })
        .option('durationSeconds', {
          describe: 'auth token duration, in seconds',
          type: 'number',
        })
        .option('namespace', {
          describe: 'package scope',
          type: 'string',
        })
        .option('location', {
          describe: 'npm config location',
          type: 'string',
        }),
    async ({
      region,
      domain,
      domainOwner,
      repository,
      durationSeconds,
      namespace,
      location,
    }: Options) => {
      if (
        location !== undefined &&
        location !== 'global' &&
        location !== 'user' &&
        location !== 'project'
      ) {
        throw new Error(`invalid location: ${location}`)
      }
      await codeartifactLogin({
        awsConfig: { region },
        domain,
        domainOwner,
        repository,
        durationSeconds,
        namespace,
        location,
      })
    }
  )
  .strict()
  .demandCommand()
  .help().argv
