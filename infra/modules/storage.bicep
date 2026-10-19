param location string
param storageAccountName string
param tableName string = 'subscriptions'

@description('Additional tables: e-mail subscribers and app devices.')
param extraTableNames array = [
  'emailsubs'
  'devices'
]

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource subscriptionsTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: tableName
}

// Collections used by e-mail alerts and the mobile apps (the API also creates them on first use).
resource extraTables 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = [
  for name in extraTableNames: {
    parent: tableService
    name: name
  }
]

var storageKey = storage.listKeys().keys[0].value

output storageAccountName string = storage.name
output tableName string = subscriptionsTable.name
@secure()
output connectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'
