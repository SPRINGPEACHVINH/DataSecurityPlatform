# Azure IAM Configuration Guide

## Elasticsearch Configuration

Configure the following parameters for Azure Blob Storage integration:

| Parameter | Description |
|-----------|-------------|
| `account_name` | Name of Azure Blob Storage account |
| `account_key` | Account key (Access Key) for the Azure Blob Storage account |
| `blob_endpoint` | Endpoint for the Blob Service |
| `containers` | List of containers to index. Use `*` to index all containers |

## CloudSploit Configuration

### Step-by-Step Setup

#### Create App Registration

1. Log into your **Azure Portal** and navigate to **Azure Entra ID** service
1. Select **App registrations** → **New registration**
1. Enter a descriptive name (e.g., "ExtractConfigure")
1. Leave the default: **"Accounts in this organizational directory only"**
1. Click **Register**

#### Copy Application Credentials

6. Copy the **Application ID** and **Directory ID**, save them securely

#### Generate Client Secret

7. Click on **Add a certificates or secret**
8. Under **Client secrets**, click **New client secret**
9. Enter a **Description** (e.g., "ExtractConfigure-2025")
10. Select **Expires**: "365 days" then Click **Add**
11. Copy **Value** and **Secret ID** and store them safely, they only appear once

#### Configure Subscription Access

12. Navigate to **Storage Account**
1. Click on **Access Control (IAM)**
1. Go to the **Role assignments** tab

#### Assign Security Reader Role

15. Click **Add** → **Add role assignment**
1. In the **Role** dropdown, select **"Security Reader"**
1. Leave the **"Assign access to"** default value
1. In the **Select Member** dropdown, type and select your app registration name (e.g., "ExtractConfigure")
1. Click **Review + assign**

#### Assign Log Analytics Reader Role

20. Repeat steps 15-19 for the **"Log Analytics Reader"** role
