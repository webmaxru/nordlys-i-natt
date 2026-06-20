param location string
param workspaceName string
param appInsightsName string

resource workspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: workspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
  }
}

output workspaceName string = workspace.name
output workspaceId string = workspace.id
output workspaceCustomerId string = workspace.properties.customerId
#disable-next-line outputs-should-not-contain-secrets
output workspaceSharedKey string = workspace.listKeys().primarySharedKey
output appInsightsConnectionString string = appInsights.properties.ConnectionString
