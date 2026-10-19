param location string
param jobName string
param environmentId string
param containerImage string
param registryServer string
param registryUsername string
@secure()
param registryPassword string
param cronExpression string = '*/20 * * * *'
param cpu string = '0.5'
param memory string = '1.0Gi'
param metUserAgent string
@secure()
param storageConnectionString string
@secure()
param appInsightsConnectionString string
@secure()
param vapidPublicKey string
@secure()
param vapidPrivateKey string
@secure()
param vapidSubject string

@description('Optional feature secrets (e-mail, native push): [{ name, value }]. Empty values are left out by main.bicep.')
@secure()
param extraSecrets object = {}

@description('Optional feature environment variables: [{ name, value } | { name, secretRef }].')
param extraEnv array = []

resource job 'Microsoft.App/jobs@2024-03-01' = {
  name: jobName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    environmentId: environmentId
    configuration: {
      triggerType: 'Schedule'
      replicaTimeout: 1800
      replicaRetryLimit: 1
      scheduleTriggerConfig: {
        cronExpression: cronExpression
        parallelism: 1
        replicaCompletionCount: 1
      }
      registries: [
        {
          server: registryServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: concat([
        {
          name: 'registry-password'
          value: registryPassword
        }
        {
          name: 'azure-table-connection-string'
          value: storageConnectionString
        }
        {
          name: 'appinsights-connection-string'
          value: appInsightsConnectionString
        }
        {
          name: 'vapid-public-key'
          value: vapidPublicKey
        }
        {
          name: 'vapid-private-key'
          value: vapidPrivateKey
        }
        {
          name: 'vapid-subject'
          value: vapidSubject
        }
      ], extraSecrets.?items ?? [])
    }
    template: {
      containers: [
        {
          name: 'notify'
          image: containerImage
          command: [
            'pnpm'
            '--filter'
            '@nordlys/api'
            'job'
          ]
          env: concat([
            {
              name: 'PORT'
              value: '8080'
            }
            {
              name: 'MET_USER_AGENT'
              value: metUserAgent
            }
            {
              name: 'STORE_DRIVER'
              value: 'table'
            }
            {
              name: 'AZURE_TABLE_NAME'
              value: 'subscriptions'
            }
            {
              name: 'WEB_DIST_PATH'
              value: '/app/apps/web/dist'
            }
            {
              name: 'AZURE_TABLE_CONNECTION_STRING'
              secretRef: 'azure-table-connection-string'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              secretRef: 'appinsights-connection-string'
            }
            {
              name: 'VAPID_PUBLIC_KEY'
              secretRef: 'vapid-public-key'
            }
            {
              name: 'VAPID_PRIVATE_KEY'
              secretRef: 'vapid-private-key'
            }
            {
              name: 'VAPID_SUBJECT'
              secretRef: 'vapid-subject'
            }
          ], extraEnv)
          resources: {
            cpu: json(cpu)
            memory: memory
          }
        }
      ]
    }
  }
}

output jobName string = job.name
