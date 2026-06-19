param location string
param environmentName string
param containerAppName string
param containerImage string
param acrName string
param acrLoginServer string
param logAnalyticsCustomerId string
@secure()
param logAnalyticsSharedKey string
param minReplicas int = 0
param maxReplicas int = 3
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

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsCustomerId
        sharedKey: logAnalyticsSharedKey
      }
    }
  }
}

var acrCredentials = listCredentials(resourceId('Microsoft.ContainerRegistry/registries', acrName), '2023-07-01')
var acrPassword = acrCredentials.passwords[0].value

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: acrLoginServer
          username: acrName
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acrPassword
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
          name: 'api'
          image: containerImage
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
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-concurrency'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

output environmentId string = environment.id
output fqdn string = app.properties.configuration.ingress.fqdn
