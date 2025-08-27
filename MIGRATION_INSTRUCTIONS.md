# PocketBase Collections Migration Instructions

## Problem Summary

The error "failed to save collection 'notifications': primary key change is not allowed" occurs because:

1. **Current Schema**: Uses UUID fields (`receiver_id`, `sender_id`) for relationships
2. **New Schema**: Uses PocketBase relation fields (`receiver`, `sender`) which have different internal structures
3. **PocketBase Limitation**: Cannot change primary key structures on existing collections

## Solution Overview

Since PocketBase doesn't allow primary key changes, we need to:
1. Create a new notifications collection with the correct schema
2. Migrate existing data
3. Replace the old collection

## Step-by-Step Migration

### Step 1: Backup Current Data
```bash
# Backup current schema
cp schema.json schema_backup_$(date +%Y%m%d_%H%M%S).json

# Export notifications data from PocketBase Admin UI
# Go to Collections > notifications > Export to CSV/JSON
```

### Step 2: Import New Collections (Partial)

Import the collections that don't have conflicts first:

1. Open PocketBase Admin UI
2. Go to Collections > Import
3. Import `pocketbase_collections.json` but expect the notifications error
4. This will successfully import all other collections

### Step 3: Handle Notifications Collection

#### Option A: Fresh Start (Recommended if no critical data)
1. Delete the existing `notifications` collection in PocketBase Admin UI
2. Re-import `pocketbase_collections.json` - this time it should work completely

#### Option B: Data Migration (If you have existing notification data)
1. Manually create the new notifications collection using this schema:
```json
{
  "name": "notifications",
  "type": "base",
  "schema": [
    { "name": "receiver", "type": "relation", "options": { "collectionId": "app_users", "cascadeDelete": false, "minSelect": 1, "maxSelect": 1, "displayFields": [] } },
    { "name": "sender", "type": "relation", "options": { "collectionId": "app_users", "cascadeDelete": false, "minSelect": null, "maxSelect": 1, "displayFields": [] } },
    { "name": "type", "type": "text" },
    { "name": "subject", "type": "text" },
    { "name": "content", "type": "text" },
    { "name": "is_read", "type": "bool" }
  ]
}
```

2. Migrate data manually:
   - For each record in old notifications:
     - `receiver_id` → `receiver` (relation to app_users)
     - `sender_id` → `sender` (relation to app_users)
     - Copy other fields as-is

### Step 4: Update Application Code

After migration, update your application code to use relation fields instead of UUID fields:

**Before (Old Schema):**
```javascript
// Query notifications for a user
const notifications = await pb.collection('notifications').getList(1, 20, {
  filter: `receiver_id = "${userId}"`
});
```

**After (New Schema):**
```javascript
// Query notifications for a user
const notifications = await pb.collection('notifications').getList(1, 20, {
  filter: `receiver.id = "${userId}"`,
  expand: 'sender,receiver'
});
```

## Key Changes in New Schema

### Notifications Collection
- `receiver_id` (UUID) → `receiver` (relation to app_users)
- `sender_id` (UUID) → `sender` (relation to app_users)
- Removed `timestamp` field (PocketBase auto-adds created/updated)

### Direct Messages Collection  
- `sender_id` (UUID) → `sender` (relation to app_users)
- `receiver_id` (UUID) → `receiver` (relation to app_users)

### Other Collections
- Similar relation field conversions throughout
- Added proper access rules for security
- Converted junction tables to relation fields where appropriate

## Benefits of New Schema

1. **Referential Integrity**: Relations ensure valid user references
2. **Better Queries**: Can expand relations to get user data in single query
3. **PocketBase Native**: Uses PocketBase's built-in relation system
4. **Access Control**: Proper security rules based on relations

## Files Created

- `pocketbase_collections.json` - Complete PocketBase collections configuration
- `migrate_notifications.js` - Migration guidance script
- `schema_backup_*.json` - Backup of original schema
- `MIGRATION_INSTRUCTIONS.md` - This guide

## Verification

After migration, verify:
1. All collections imported successfully
2. Relations work correctly in Admin UI
3. Application queries return expected data
4. Access rules function properly

## Rollback Plan

If issues occur:
1. Restore from `schema_backup_*.json`
2. Import notification data from CSV backup
3. Revert application code changes