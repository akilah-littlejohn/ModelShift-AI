# Dynamic Secrets Management for Supabase Edge Functions

This guide explains how to set up dynamic secrets management so users can upload API keys directly to your Supabase Edge Functions without requiring admin intervention.

## Overview

The dynamic secrets management system allows users to:
- Upload API keys directly to Supabase Edge Function secrets
- Test secret configurations
- Manage secrets without admin intervention

## Setup Methods

### Method 1: Supabase Management API (Recommended)

1. **Get Management API Access Token**
   ```bash
   # Login to Supabase CLI
   supabase login
   
   # Get access token
   supabase auth token
   ```

2. **Store Management API Credentials**
   ```bash
   # Set in your Edge Function secrets
   supabase secrets set SUPABASE_MANAGEMENT_TOKEN="your_management_api_token"
   supabase secrets set SUPABASE_PROJECT_ID="your_project_id"
   ```

3. **Update the manage-secrets Edge Function**
   Replace the simulation code with actual Management API calls:
   
   ```typescript
   async function updateSupabaseSecret(name: string, value: string): Promise<void> {
     const managementToken = Deno.env.get('SUPABASE_MANAGEMENT_TOKEN');
     const projectId = Deno.env.get('SUPABASE_PROJECT_ID');
     
     const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/secrets`, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${managementToken}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify([{ name, value }])
     });
     
     if (!response.ok) {
       throw new Error(`Failed to update secret: ${response.statusText}`);
     }
   }
   ```

### Method 2: Custom Database Storage

1. **Create Secrets Table**
   ```sql
   CREATE TABLE IF NOT EXISTS edge_function_secrets (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text UNIQUE NOT NULL,
     encrypted_value text NOT NULL,
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );
   
   -- Enable RLS
   ALTER TABLE edge_function_secrets ENABLE ROW LEVEL SECURITY;
   
   -- Only service role can access
   CREATE POLICY "Service role only" ON edge_function_secrets
     FOR ALL TO service_role;
   ```

2. **Update Edge Functions to Read from Database**
   ```typescript
   async function getSecretFromDatabase(name: string): Promise<string | null> {
     const { data, error } = await supabaseClient
       .from('edge_function_secrets')
       .select('encrypted_value')
       .eq('name', name)
       .single();
     
     if (error || !data) return null;
     
     // Decrypt the value (implement your decryption logic)
     return decryptValue(data.encrypted_value);
   }
   ```

### Method 3: Environment Variable Proxy

1. **Create a Proxy Service**
   Deploy a separate service that can update Supabase secrets via the Management API.

2. **Configure Webhook**
   Set up a webhook that your main application can call to update secrets.

## Security Considerations

### Admin Access Control

Update the admin check in `manage-secrets/index.ts`:

```typescript
const isAdmin = user.email?.includes('admin') || 
               user.email?.endsWith('@yourdomain.com') ||
               user.user_metadata?.role === 'admin' ||
               await checkAdminInDatabase(user.id);

async function checkAdminInDatabase(userId: string): Promise<boolean> {
  const { data } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  return data?.role === 'admin';
}
```

### Encryption

Always encrypt secrets before storing:

```typescript
import { createHash, createCipher } from 'crypto';

function encryptSecret(value: string, key: string): string {
  const cipher = createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```

## Deployment Steps

1. **Deploy Edge Functions**
   ```bash
   supabase functions deploy manage-secrets
   supabase functions deploy test-secrets
   ```

2. **Set Initial Secrets**
   ```bash
   supabase secrets set SUPABASE_MANAGEMENT_TOKEN="your_token"
   supabase secrets set SUPABASE_PROJECT_ID="your_project_id"
   ```

3. **Test the System**
   - Use the Dynamic Secrets Manager in the UI
   - Verify secrets are properly stored
   - Test API calls with new secrets

## Usage

1. **Access the Secrets Manager**
   - Go to API Keys → "Manage Server Secrets"
   - Enter your API keys
   - Click "Update Secrets"

2. **Test Configuration**
   - Click "Test Current Secrets"
   - Verify all providers are configured

3. **Use in Playground**
   - API calls will automatically use server secrets
   - No need for users to configure local keys

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check admin role configuration
   - Verify user has proper permissions

2. **Management API Errors**
   - Verify management token is valid
   - Check project ID is correct

3. **Secrets Not Available**
   - Edge Functions may need restart after secret updates
   - Check secret names match exactly

### Debug Mode

Enable debug logging in Edge Functions:

```typescript
console.log('Available secrets:', Object.keys(Deno.env.toObject()));
```

## Best Practices

1. **Rotate Secrets Regularly**
   - Implement automatic rotation
   - Monitor secret usage

2. **Audit Access**
   - Log all secret updates
   - Monitor who accesses secrets

3. **Backup Secrets**
   - Keep encrypted backups
   - Document recovery procedures

4. **Monitor Usage**
   - Track API usage per secret
   - Alert on unusual patterns