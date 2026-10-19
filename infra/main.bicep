targetScope = 'resourceGroup'

@description('Azure region for all resources.')
param location string = 'norwayeast'

@description('Short prefix used for resource names. Use lowercase letters and numbers for best compatibility.')
param namePrefix string = 'nordlys'

@description('Full container image reference including registry and tag, for example ghcr.io/webmaxru/nordlys-i-natt:latest.')
param containerImage string = 'ghcr.io/webmaxru/nordlys-i-natt:latest'

@description('Container registry server used by Container Apps image pulls.')
param registryServer string = 'ghcr.io'

@description('Container registry username used by Container Apps image pulls.')
param registryUsername string

@description('Container registry password/token used by Container Apps image pulls.')
@secure()
param registryPassword string

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

@description('Primary public hostname, e.g. nordlys.salnikov.no. Empty disables legacy-host redirects.')
param canonicalHost string = ''

@description('Comma-separated old hostnames whose page requests 301 to canonicalHost, e.g. nordlys.isainative.dev.')
param legacyHosts string = ''

// --- E-mail alerts (Azure Communication Services Email). See docs/INFRA.md. ---

@description('Customer-managed sending domain for e-mail alerts, e.g. varsel.salnikov.no. Empty = no e-mail resources.')
param emailDomain string = ''

@description('Set by deploy.yml once Domain, SPF, DKIM and DKIM2 are verified for emailDomain. Links the domain and turns e-mail on.')
param emailDomainVerified bool = false

@description('Local part of the sender address (nordlys -> nordlys@<emailDomain>).')
param emailSenderUsername string = 'nordlys'

@description('Sender display name.')
param emailSenderName string = 'Nordlys i natt'

@description('Optional Reply-To address for alert e-mails.')
param emailReplyTo string = ''

@description('ACS data location for e-mail data at rest.')
param emailDataLocation string = 'Europe'

// --- Native push for the iOS/Android apps (FCM HTTP v1 + APNs). Empty = off. See docs/MOBILE-RELEASE.md. ---

@description('Firebase service account JSON (FCM HTTP v1) for Android push. Empty = Android push off.')
@secure()
param fcmServiceAccountJson string = ''

@description('APNs auth key (.p8 contents) for iOS push. Empty = iOS push off.')
@secure()
param apnsKeyP8 string = ''

@description('APNs key ID (10 characters).')
param apnsKeyId string = ''

@description('Apple developer team ID.')
param apnsTeamId string = ''

@description('iOS bundle ID (APNs topic).')
param apnsBundleId string = 'no.salnikov.nordlys'

@description('Use the APNs production endpoint (false = sandbox, for debug builds).')
param apnsProduction bool = true

var suffix = uniqueString(resourceGroup().id)
var safePrefix = toLower(replace(namePrefix, '-', ''))
var workspaceName = '${namePrefix}-law-${suffix}'
var appInsightsName = '${namePrefix}-appi-${suffix}'
var storageAccountName = take('${safePrefix}st${suffix}', 24)
var environmentName = '${namePrefix}-cae-${suffix}'
var containerAppName = '${namePrefix}-app-${suffix}'
var jobName = '${namePrefix}-job-${suffix}'
var tableName = 'subscriptions'
var acsName = '${namePrefix}-acs-${suffix}'
var emailServiceName = '${namePrefix}-email-${suffix}'
var emailOn = !empty(emailDomain)
var emailLive = emailOn && emailDomainVerified
var publicBaseUrl = empty(canonicalHost) ? '' : 'https://${canonicalHost}'

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

module email 'modules/email.bicep' = if (emailOn) {
  name: 'email'
  params: {
    communicationServiceName: acsName
    emailServiceName: emailServiceName
    emailDomain: emailDomain
    senderUsername: emailSenderUsername
    senderDisplayName: emailSenderName
    dataLocation: emailDataLocation
    domainVerified: emailDomainVerified
  }
}

// Read back after the email module (containerApp/job depend on it) to get the connection string.
resource acsExisting 'Microsoft.Communication/communicationServices@2023-04-01' existing = if (emailLive) {
  name: acsName
}

// Optional features reach the app and the job as extra secrets + env vars, only when configured
// (Container Apps refuses empty secret values).
var featureSecrets = {
  items: concat(
    emailLive ? [{ name: 'acs-connection-string', value: acsExisting!.listKeys().primaryConnectionString }] : [],
    empty(fcmServiceAccountJson) ? [] : [{ name: 'fcm-service-account', value: fcmServiceAccountJson }],
    empty(apnsKeyP8) ? [] : [{ name: 'apns-key-p8', value: apnsKeyP8 }]
  )
}

var featureEnv = concat(
  empty(publicBaseUrl) ? [] : [{ name: 'PUBLIC_BASE_URL', value: publicBaseUrl }],
  emailLive
    ? [
        { name: 'EMAIL_ENABLED', value: 'true' }
        { name: 'EMAIL_TRANSPORT', value: 'acs' }
        { name: 'EMAIL_SENDER', value: '${emailSenderUsername}@${emailDomain}' }
        { name: 'EMAIL_SENDER_NAME', value: emailSenderName }
        { name: 'EMAIL_REPLY_TO', value: emailReplyTo }
        { name: 'ACS_CONNECTION_STRING', secretRef: 'acs-connection-string' }
      ]
    : [],
  empty(fcmServiceAccountJson) ? [] : [{ name: 'FCM_SERVICE_ACCOUNT_JSON', secretRef: 'fcm-service-account' }],
  empty(apnsKeyP8)
    ? []
    : [
        { name: 'APNS_KEY_P8', secretRef: 'apns-key-p8' }
        { name: 'APNS_KEY_ID', value: apnsKeyId }
        { name: 'APNS_TEAM_ID', value: apnsTeamId }
        { name: 'APNS_BUNDLE_ID', value: apnsBundleId }
        { name: 'APNS_PRODUCTION', value: string(apnsProduction) }
      ]
)

module containerApp 'modules/containerapp.bicep' = {
  name: 'container-app'
  dependsOn: [email]
  params: {
    location: location
    environmentName: environmentName
    containerAppName: containerAppName
    containerImage: containerImage
    registryServer: registryServer
    registryUsername: registryUsername
    registryPassword: registryPassword
    logAnalyticsCustomerId: monitoring.outputs.workspaceCustomerId
    logAnalyticsSharedKey: monitoring.outputs.workspaceSharedKey
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
    canonicalHost: canonicalHost
    legacyHosts: legacyHosts
    extraSecrets: featureSecrets
    extraEnv: featureEnv
  }
}

module job 'modules/job.bicep' = {
  name: 'notification-job'
  dependsOn: [email]
  params: {
    location: location
    jobName: jobName
    environmentId: containerApp.outputs.environmentId
    containerImage: containerImage
    registryServer: registryServer
    registryUsername: registryUsername
    registryPassword: registryPassword
    cronExpression: cronExpression
    cpu: cpu
    memory: memory
    metUserAgent: metUserAgent
    storageConnectionString: storage.outputs.connectionString
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    vapidPublicKey: vapidPublicKey
    vapidPrivateKey: vapidPrivateKey
    vapidSubject: vapidSubject
    extraSecrets: featureSecrets
    extraEnv: featureEnv
  }
}

output containerAppFqdn string = containerApp.outputs.fqdn
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString

// E-mail: the DNS records to add for emailDomain (Domain, SPF, DKIM, DKIM2, DMARC), and whether it is live.
output emailServiceName string = emailOn ? emailServiceName : ''
output emailSenderAddress string = emailOn ? '${emailSenderUsername}@${emailDomain}' : ''
output emailLive bool = emailLive
output emailVerificationRecords object = emailOn ? email!.outputs.verificationRecords : {}
