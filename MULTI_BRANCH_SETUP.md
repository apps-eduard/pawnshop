# Multi-Branch Configuration System

## Overview
Your pawnshop system now supports multi-branch operations where each branch can operate independently with its own local server and database, while maintaining the ability to sync data when needed.

## System Architecture

### Branch Setup Types
1. **Main Server (Headquarters)**: Central server that can receive sync data from all branches
2. **Branch Installation**: Local branch server that operates independently
3. **Sync Node**: Dedicated synchronization server (optional)

### Key Features
- ✅ Each transaction is automatically tagged with the branch where it was created
- ✅ Branch configuration through admin interface
- ✅ Independent operation when internet is unavailable
- ✅ Sync tracking and status monitoring
- ✅ Complete audit trail with branch information

## Setup Instructions

### For Each Branch Installation:

1. **Install the pawnshop system** on each branch's local server
2. **Create branches in the database** using the admin interface
3. **Configure the current branch** for each installation

### Step-by-Step Configuration:

#### 1. Access Admin Settings
- Log in as an administrator
- Go to **Admin Settings**
- Click on the **System Configuration** tab (this is now the default tab)

#### 2. Configure Current Branch
- **Select Branch**: Choose which branch this installation represents
- **Installation Type**: 
  - Choose "Main Server" for headquarters
  - Choose "Branch Installation" for local branch servers
  - Choose "Sync Node" for dedicated sync servers
- **Enable Synchronization**: Check this to allow data sync between branches
- Click **Save Branch Configuration**

#### 3. Verify Configuration
The system will show:
- Current branch information
- Installation type
- Sync status
- Last sync timestamp

## How It Works

### Automatic Branch Tagging
Every transaction created in the system is automatically tagged with the current branch:

- **Pawners**: When you create a new pawner, they're associated with the current branch
- **Appraisals**: All appraisals are tagged with the branch where they were created  
- **Transactions**: All loan transactions include the originating branch
- **Audit Logs**: All system changes are tracked with branch information

### Branch Identification in Data
```sql
-- Example: All pawners created in Branch 1
SELECT * FROM pawners WHERE branch_id = 1;

-- Example: All appraisals from Branch 2
SELECT * FROM appraisals WHERE branch_id = 2;

-- Example: Transaction audit trail by branch
SELECT * FROM audit_logs WHERE branch_id = 3;
```

### Database Schema
The following tables now include `branch_id` columns:
- `pawners` - Tracks which branch created each pawner
- `appraisals` - Tracks which branch performed each appraisal
- `transactions` - Tracks which branch processed each transaction
- `audit_logs` - Tracks which branch made each system change

## Multi-Branch Operations

### Scenario: 3 Branch Setup
1. **Main Branch (HQ)** - Branch ID: 1, Installation Type: "main"
2. **Downtown Branch** - Branch ID: 2, Installation Type: "branch"  
3. **Mall Branch** - Branch ID: 3, Installation Type: "branch"

Each branch operates independently:
- Customers can be served even without internet
- All transactions are tagged with the correct branch
- Data can be synchronized when connectivity is restored

### Synchronization
- **Manual Sync**: Use "Update Sync Status" button in admin settings
- **Automatic Sync**: Can be implemented to run periodically
- **Sync Tracking**: All sync activities are logged in `branch_sync_log` table

## Benefits

### For Business Operations
- **Branch Performance**: Track performance by individual branch
- **Customer Management**: Know which branch serves which customers
- **Inventory Control**: Track items and transactions by location
- **Audit Compliance**: Complete trail of which branch performed which actions

### For Technical Operations
- **Offline Capability**: Each branch can operate without internet
- **Data Integrity**: All transactions properly attributed to source branch
- **Scalability**: Easy to add new branches to the system
- **Disaster Recovery**: Each branch has its own data backup

## API Endpoints

### Branch Configuration
- `GET /api/branch-config` - Get current branch configuration
- `PUT /api/branch-config` - Update branch configuration
- `GET /api/branch-config/current` - Get current branch info only
- `POST /api/branch-config/sync-status` - Update sync status

### Usage Example
```javascript
// Get current branch configuration
const response = await fetch('/api/branch-config');
const { data } = await response.json();
console.log('Current Branch:', data.currentBranch.name);
console.log('Branch ID:', data.config.current_branch_id);
```

## Installation Process

### For New Branch
1. Install the pawnshop system
2. Create the new branch in the admin interface
3. Configure the installation to use the new branch ID
4. All future transactions will be tagged with this branch

### For Existing Systems
1. Run the migration scripts (already completed)
2. Configure the current branch in admin settings
3. All new transactions will be properly tagged
4. Existing records are updated with the current branch ID

## Monitoring and Maintenance

### Check Branch Configuration
- Admin Settings → System Configuration tab
- Verify correct branch is selected
- Check sync status and timestamps

### Troubleshooting
- If transactions aren't tagged with branch: Check branch configuration
- If sync fails: Verify network connectivity and branch settings
- If branch not found: Ensure branch exists and is active

## Future Enhancements

Potential additions to the system:
- **Automatic Sync**: Scheduled synchronization between branches
- **Conflict Resolution**: Handle data conflicts during sync
- **Branch Reports**: Generate reports by branch performance
- **Cross-Branch Search**: Search for customers/transactions across all branches
- **Real-time Sync**: Live synchronization when internet is available

---

Your multi-branch pawnshop system is now ready to handle independent branch operations with complete transaction tracking!