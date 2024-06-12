@description('Location for all resources. Use RG location by default')
param location string = resourceGroup().location

param appInsightsLocation string = location

@description('App short name (used for prefixing resources. Make it unique if you are going to deploy multiple instances on the same resource group')
@maxLength(6)
param appShortName string

@description('The App name, based on short name, Needs to be globally unique within azure.')
@minLength(2)
@maxLength(60)
param appName string

@description('The name of the key vault to be created.')
param vaultName string = '${appShortName}${uniqueString(resourceGroup().id)}'

@description('The SKU of the vault to be created.')
@allowed(['standard','premium'])
param vaultSKU string = 'standard'

//////////////////////////////////////// BEGIN-GitHub Application parameters

@description('The GitHub App ID')
param githubAppId string

@secure()
@description('The PEM certificate for the GitHub App.')
param certificate string 

@secure()
@description('The webhook secret for the GitHub App')
param webHookSecret string = ''

@description('GitHub webhooks IP addresses. If used maintenance of the IP addresses are required.')
param ghHooksIpAddresses array = []

var additionalIpSecurityRestrictions = [for (ip,i) in ghHooksIpAddresses: {
  ipAddress: ip
  action: 'Allow'
  tag: 'Default'
  priority: 900
  name: 'ghhook'
  description: 'Allow request from GitHub.com webhooks'
}]

//////////////////////////////////////// BEGIN-Application Insights

resource applicationInsight 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: appInsightsLocation
  tags: {
    'hidden-link:${resourceId('Microsoft.Web/sites', functionAppName)}': 'Resource'
  }
  properties: {
    Application_Type: 'web'
  }
  kind: 'web'
}

//////////////////////////////////////// BEGIN-FUNCTION APP

var functionAppName = appName
var hostingPlanName = appName
var applicationInsightsName = appName
var storageAccountName = toLower('${appShortName}${uniqueString(resourceGroup().id)}')

@description('Storage Account type')
@allowed([
  'Standard_LRS'
  'Standard_GRS'
  'Standard_RAGRS'
])
param appStorageAccountType string = 'Standard_LRS'

resource storageAccount 'Microsoft.Storage/storageAccounts@2021-08-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: appStorageAccountType
  }
  properties: {
    supportsHttpsTrafficOnly: true
    defaultToOAuthAuthentication: true
  }  
}

resource hostingPlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: hostingPlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
    size: 'Y1'
    family: 'Y'
    capacity: 0
  }
  properties: {
    // computeMode: 'Dynamic'
    reserved: true
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    reserved: true
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      http20Enabled: true
      ftpsState: 'Disabled'
      linuxFxVersion: 'node|20'
      minTlsVersion: '1.2'      
      ipSecurityRestrictions: additionalIpSecurityRestrictions
      ipSecurityRestrictionsDefaultAction: (length(additionalIpSecurityRestrictions) > 0 ? 'Deny' : 'Allow')
    }
  }
}
resource functionAppSettings 'Microsoft.Web/sites/config@2022-09-01' = {
  name: 'appsettings'
  parent: functionApp
  properties: {
      AzureWebJobsStorage: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
      WEBSITE_CONTENTAZUREFILECONNECTIONSTRING: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
      WEBSITE_CONTENTSHARE: toLower(functionAppName)
      FUNCTIONS_EXTENSION_VERSION : '~4'
      APPLICATIONINSIGHTS_CONNECTION_STRING: applicationInsight.properties.ConnectionString
      FUNCTIONS_WORKER_RUNTIME: 'node'
      WEBSITE_NODE_DEFAULT_VERSION: '~20'
      APP_ID: githubAppId // This might not be needed since it's part of the event???
      PRIVATE_KEY: '@Microsoft.KeyVault(SecretUri=${keyCertificate.properties.secretUri})'
      WEBHOOK_SECRET: '@Microsoft.KeyVault(SecretUri=${keyWebHookSecret.properties.secretUri})'
    }
}

//////////////////////////////////////// Keyvault

resource vault 'Microsoft.KeyVault/vaults@2021-11-01-preview' = {
  name: vaultName
  location: location
  properties: {
    accessPolicies:[
      {
        tenantId: subscription().tenantId
        objectId: functionApp.identity.principalId
        permissions: {
          keys: []
          secrets: [ 'get' ]
          certificates: []
        }
      }
    ]
    enableRbacAuthorization: false
    enableSoftDelete: false
    enabledForDeployment: true
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    tenantId: subscription().tenantId
    sku: {
      name: vaultSKU
      family: 'A'
    }
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

var pemCertificateName = '${appShortName}-PEM-Certificate'
var webHookSecretName = '${appShortName}-webhooksecret'

resource keyCertificate 'Microsoft.KeyVault/vaults/secrets@2022-11-01' = {
  parent: vault
  name: pemCertificateName
  properties: {
    value: certificate
  }  
}

resource keyWebHookSecret 'Microsoft.KeyVault/vaults/secrets@2022-11-01' = {
  parent: vault
  name: webHookSecretName
  properties: {
    value: webHookSecret
  }  
}

//////////////////////////////// Output
output functionUrl string = functionApp.properties.defaultHostName
