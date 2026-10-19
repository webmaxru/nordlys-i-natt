// E-mail alerts: Azure Communication Services (ACS) Email with a customer-managed domain.
//
// Two phases, driven by deploy.yml:
//  1. emailDomain set, domain not yet verified: the Email service, the domain and the sender
//     username are created; the deployment outputs the DNS records to add (verificationRecords).
//  2. Once the domain is verified (deploy.yml checks the state before each deploy), the domain
//     is linked to the Communication Services resource and the app gets EMAIL_ENABLED=true.
// Linking an unverified custom domain is refused by Azure, hence the flag.
// Cost: the resources themselves are free; ACS bills per e-mail sent (see docs/INFRA.md).

@description('Communication Services resource name.')
param communicationServiceName string

@description('Email Communication Services resource name.')
param emailServiceName string

@description('Customer-managed sending domain, e.g. varsel.salnikov.no.')
param emailDomain string

@description('Local part of the sender address, e.g. nordlys -> nordlys@varsel.salnikov.no.')
param senderUsername string = 'nordlys'

@description('Sender display name.')
param senderDisplayName string = 'Nordlys i natt'

@description('ACS data location (where e-mail data is stored at rest). Must be the same for both resources.')
param dataLocation string = 'Europe'

@description('True once Domain, SPF, DKIM and DKIM2 are verified. Links the domain to ACS.')
param domainVerified bool = false

param tags object = {}

resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: emailServiceName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: dataLocation
  }
}

resource domain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: emailDomain
  location: 'global'
  tags: tags
  properties: {
    domainManagement: 'CustomerManaged'
    // No open/click tracking (stated in the privacy policy).
    userEngagementTracking: 'Disabled'
  }
}

resource sender 'Microsoft.Communication/emailServices/domains/senderUsernames@2023-04-01' = {
  parent: domain
  name: senderUsername
  properties: {
    username: senderUsername
    displayName: senderDisplayName
  }
}

resource acs 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: communicationServiceName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: dataLocation
    linkedDomains: domainVerified ? [domain.id] : []
  }
  dependsOn: [sender]
}

output communicationServiceName string = acs.name
output emailServiceName string = emailService.name
output domainResourceId string = domain.id
output senderAddress string = '${senderUsername}@${emailDomain}'
output linked bool = domainVerified
output verificationRecords object = domain.properties.verificationRecords
