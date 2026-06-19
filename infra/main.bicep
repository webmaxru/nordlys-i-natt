targetScope = 'resourceGroup'

@description('Azure region for all resources.')
param location string = 'norwayeast'

@description('Short prefix used for resource names. Use lowercase letters and numbers for best compatibility.')
param namePrefix string = 'nordlys'

@description('Full container image reference including ACR login server and tag, for example nordlysacr.azurecr.io/nordlys:latest.')
param containerImage string

@description('Minimum Container App replicas. Set to 0 for scale-to-zero.')
param minReplicas int = 0

@description('Maximum Container App replicas.')
param maxReplicas int = 3

@description('Container CPU cores.')
param cpu string = '0.5'

@description('Container memory.')
param memory string = '1.0Gi'

@description('Cron schedule for the notification job.')
param cronExpression string = '*/20 * * * *'

@description('Identifying User-Agent sent to api.met.no.')
@secure()
param metUserAgent string

@description('Web Push VAPID public key.')
@secure()
param vapidPublicKey string

@description('Web Push VAPID private key.')
@secure()
param vapidPrivateKey string

@description('Web Push VAPID subject, for example mailto:contact@example.com.')
@secure()
param vapidSubject string

var suffix = uniqueString(resourceGroup().id)
var safePrefix = toLower(replace(namePrefix, '-', ''))
var workspaceName = '${namePrefix}-law-${suffix}'
var appInsightsName = '${namePrefix}-appi-${suffix}'
var storageAccountName = take('${safePrefix}st${suffix}', 24)
var registryName = take('${safePrefix}acr${suffix}', 50)
var environmentName = '${namePrefix}-cae-${suffix}'
var containerAppName = '${namePrefix}-app-${suffix}'
var jobName = '${namePrefix}-job-${suffix}'
var tableName = 'subscriptions'

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    workspaceName: workspaceName
    appInsightsName: appInsightsName
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    storageAccountName: storageAccountName
    tableName: tableName
  }
}

module registry 'modules/registry.bicep' = {
  name: 'registry'
  params: {
    location: location
    registryName: registryName
  }
}

var workspaceSharedKey = listKeys(resourceId('Microsoft.OperationalInsights/workspaces', workspaceName), '2022-10-01').primarySharedKey

// TODO: Replace ACR admin credentials with AcrPull via managed identity after
// validating a two-phase or user-assigned identity deployment flow for image pulls.
module containerApp 'modules/containerapp.bicep' = {
  name: 'container-app'
  params: {
    location: location
    environmentName: environmentName
    containerAppName: containerAppName
    containerImage: containerImage
    acrName: registry.outputs.registryName
    acrLoginServer: registry.outputs.loginServer
    logAnalyticsCustomerId: monitoring.outputs.workspaceCustomerId
    logAnalyticsSharedKey: workspaceSharedKey
    minReplicas: minReplicas
    maxReplicas: maxReplicas
    cpu: cpu
    memory: memory
    metUserAgent: metUserAgent
    storageConnectionString: storage.outputs.connectionString
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    vapidPublicKey: vapidPublicKey
    vapidPrivateKey: vapidPrivateKey
    vapidSubject: vapidSubject
  }
}

module job 'modules/job.bicep' = {
  name: 'notification-job'
  params: {
    location: location
    jobName: jobName
    environmentId: containerApp.outputs.environmentId
    containerImage: containerImage
    acrName: registry.outputs.registryName
    acrLoginServer: registry.outputs.loginServer
    cronExpression: cronExpression
    cpu: cpu
    memory: memory
    metUserAgent: metUserAgent
    storageConnectionString: storage.outputs.connectionString
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    vapidPublicKey: vapidPublicKey
    vapidPrivateKey: vapidPrivateKey
    vapidSubject: vapidSubject
  }
}

output containerAppFqdn string = containerApp.outputs.fqdn
output acrLoginServer string = registry.outputs.loginServer
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString
