targetScope = 'resourceGroup'
param namePrefix string = 'nordlys'
var suffix = uniqueString(resourceGroup().id)
var safePrefix = toLower(replace(namePrefix, '-', ''))
output registryName string = take('${safePrefix}acr${suffix}', 50)
output containerAppName string = '${namePrefix}-app-${suffix}'
