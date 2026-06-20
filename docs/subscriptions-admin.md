# Subscriptions admin

Push-notification subscriptions are stored in Azure Table Storage:

- Resource group: `rg-nordlys`
- Storage account: `nordlyssteeyobitljk4fq`
- Table: `subscriptions`
- `PartitionKey`: `subscription`
- `RowKey`: subscription id

Use `scripts\subscriptions.ps1` from Windows PowerShell 5.1+ or PowerShell 7 after signing in with Azure CLI.

```powershell
az login
```

## List subscriptions

```powershell
.\scripts\subscriptions.ps1 -Action List
```

Shows id, name, coordinates, language, creation time, last notification time, last verdict, and total count.

## Count subscriptions

```powershell
.\scripts\subscriptions.ps1 -Action Count
```

## Show one subscription

```powershell
.\scripts\subscriptions.ps1 -Action Show -Id "<rowKey>"
```

Raw `p256dh` and `auth` keys are redacted by default. To reveal them:

```powershell
.\scripts\subscriptions.ps1 -Action Show -Id "<rowKey>" -ShowKeys
```

## Edit a subscription

Only provided fields are updated; other columns are preserved.

```powershell
.\scripts\subscriptions.ps1 -Action Edit -Id "<rowKey>" -Name "Cabin" -Lang nb -Lat 59.9139 -Lon 10.7522
```

Editable fields are `-Name`, `-Lang`, `-Lat`, and `-Lon`.

## Remove a subscription

```powershell
.\scripts\subscriptions.ps1 -Action Remove -Id "<rowKey>"
```

The script asks for confirmation. To skip the prompt:

```powershell
.\scripts\subscriptions.ps1 -Action Remove -Id "<rowKey>" -Force
```

## Azure Portal alternative

Open the Azure Portal, then go to Storage account `nordlyssteeyobitljk4fq` → Storage browser → Tables → `subscriptions`.
