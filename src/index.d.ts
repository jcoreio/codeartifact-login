/// <reference types="node" />
import {
  CodeartifactClient,
  CodeartifactClientConfig,
} from '@aws-sdk/client-codeartifact'
export default function codeartifactLogin(options: {
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
}): Promise<{
  authorizationToken: string
  repositoryEndpoint: string
}>
