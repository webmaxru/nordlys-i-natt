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
      secrets: [
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
      ]
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
          env: [
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
          ]
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
