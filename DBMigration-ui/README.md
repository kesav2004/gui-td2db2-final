# IBM AI Database Migration Tool

This is a web application built using IBM Carbon Design System for database migration tasks.

## Prerequisites

- Node.js (v16 or later)
- npm or yarn

## Installation Instructions

1. Clone the repository
```bash
git clone <repository-url>
cd database-migration-tool
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Install Carbon Design System packages
```bash
npm install @carbon/react@1.41.0 @carbon/styles@1.81.0
# or
yarn add @carbon/react@1.41.0 @carbon/styles@1.81.0
```

4. Start the development server
```bash
npm run dev
# or
yarn dev
```

5. Open your browser and navigate to http://localhost:5173

## Carbon Design System

This project is built with the IBM Carbon Design System. The Carbon Design System is IBM's open-source design system for products and digital experiences.

### Key Carbon Components Used:
- Carbon Header
- Carbon Navigation
- Carbon Forms and Inputs
- Carbon Tables
- Carbon Buttons and UI elements

## Project Structure

- `/src/components` - Reusable UI components
- `/src/pages` - Page components for each route
- `/src/components/layout` - Layout components like Header, Sidebar
- `/src/components/questionnaire` - Components for the migration questionnaire
- `/src/components/ui` - Shared UI components based on Carbon Design System

## Required Packages

These packages are required for the IBM Carbon Design System:
- @carbon/react
- @carbon/styles

To install them:
```bash
npm install @carbon/react @carbon/styles
# or
yarn add @carbon/react @carbon/styles
```

## Key Features

1. Dashboard with migration status and recent migrations
2. Questionnaire workflow for setting up migrations
3. Database connection management
4. SQL script management and conversion
5. Migration execution and validation

# Database Migration UI - Data Validation Interface

## Overview

This project provides a comprehensive data validation interface for comparing and validating data between source and target databases during migration processes. The interface supports both single table and full schema comparisons with detailed reporting of differences.

## Features

### ✅ Complete Data Validation Workflow
- **Database Connection Management**: Test and configure connections to source and target databases
- **Single Table Validation**: Compare individual tables between databases
- **Full Schema Validation**: Discover and validate entire schemas with automatic table matching
- **Real-time Results**: View detailed validation results with actual row differences
- **Export Capabilities**: Download validation reports for documentation

### ✅ Supported Database Types
- **Source Databases**: Teradata, Oracle, SQL Server, PostgreSQL, IBM Db2
- **Target Databases**: IBM Db2, IBM Db2 on Cloud, IBM Db2 Warehouse

### ✅ Advanced Validation Features
- **Primary Key Configuration**: Set primary keys for accurate row matching
- **Column Selection**: Include/exclude specific columns from validation
- **WHERE Clause Support**: Apply custom predicates to filter data
- **Detailed Difference Reporting**: View actual rows that differ between databases
- **Performance Metrics**: Track validation timing and row counts

## Getting Started

### 1. Access the Data Validation Interface

Navigate to `/database/validation` in the application or use the sidebar menu:
```
Database → Data Validation
```

### 2. Database Connection Setup

#### Step 1: Configure Source Database
1. Select database type (Teradata, DB2, etc.)
2. Enter connection details (host, port, database, credentials)
3. Click "Test Connection" to verify connectivity

#### Step 2: Configure Target Database
1. Select target database type (usually IBM Db2)
2. Enter target connection details
3. Test the target connection

### 3. Validation Configuration

#### Single Table Comparison
1. Select "Single Table Comparison"
2. Choose source and target schemas
3. Select specific tables to compare
4. Configure primary key columns
5. Optional: Add WHERE clause for filtering

#### Full Schema Comparison
1. Select "Full Schema Comparison"
2. Choose source and target schemas
3. Click "Discover Tables" to auto-match tables
4. Review and adjust table matches
5. Set default primary keys for all tables

### 4. Execute Validation

1. Review configuration summary
2. Click "Run Validation"
3. Monitor progress (validation may take several minutes)
4. View results in the Results tab

## Validation Results

### Summary Dashboard
- **Total Tables**: Number of tables validated
- **Tables with Differences**: Count of tables with data mismatches
- **Total Rows**: Source and target row counts
- **Timing Information**: Start and end times

### Detailed Results Table
For each validated table, view:
- **Source/Target Row Counts**: Total rows in each database
- **Missing Rows**: Rows present in one database but not the other
- **Field Mismatches**: Rows with different field values
- **Status Indicators**: Visual indicators for tables with/without differences

### Row-Level Differences
Expand any table with differences to see:
- **Missing in Target**: Sample rows from source not found in target
- **Missing in Source**: Sample rows from target not found in source
- **Field Mismatches**: Specific field-level differences with before/after values

## API Integration

The frontend integrates with the following backend APIs:

### Database Connection APIs
```
POST /api/validate          - Test database connection
POST /api/schemas           - Fetch available schemas
POST /api/tables            - Fetch tables for a schema
POST /api/columns           - Fetch columns for a table
```

### Validation APIs
```
POST /api/discover-schema-tables     - Auto-discover and match tables
POST /api/run-validation            - Execute validation process
GET  /api/validation-results-detailed - Get detailed results
GET  /api/validation-table-details/<table> - Get table-specific details
GET  /api/download-report           - Download validation report
```

## Backend Data Structure

### Validation Results Format
```json
{
  "success": true,
  "tables": [
    {
      "tableName": "SCHEMA.TABLE_NAME",
      "sourceRows": 1000,
      "targetRows": 995,
      "rowsNotInTarget": 5,
      "rowsNotInSource": 0,
      "fieldsMismatch": 2,
      "sourceNotInTargetRows": [...],
      "targetNotInSourceRows": [...],
      "fieldMismatchRows": [...],
      "hasDifferences": true
    }
  ],
  "summary": {
    "total_tables": 10,
    "tables_with_differences": 3,
    "total_source_rows": 50000,
    "total_target_rows": 49800
  }
}
```

## Troubleshooting

### Common Issues

#### "report undefined" Error
**Problem**: ValidationReport shows "report undefined"
**Solution**: 
1. Ensure the backend `/api/validation-results-detailed` endpoint is working
2. Check that validation has been completed successfully
3. Verify the backend is returning the expected data structure

#### Connection Failures
**Problem**: Database connection tests fail
**Solution**:
1. Verify network connectivity to database servers
2. Check database credentials and permissions
3. Ensure database servers are running and accessible
4. Review firewall and security group settings

#### Slow Validation Performance
**Problem**: Validation takes too long or times out
**Solution**:
1. Use WHERE clauses to limit data scope
2. Validate smaller batches of tables
3. Ensure database indexes exist on primary key columns
4. Consider running validation during off-peak hours

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "No validation reports found" | No validation has been run | Execute a validation first |
| "Table discovery failed" | Schema connection issues | Verify database connections |
| "Failed to load table details" | Backend API error | Check backend logs |
| "Validation failed" | Process error | Review validation configuration |

## Development

### Running the Application
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure
```
src/
├── components/
│   ├── ValidationReport.tsx      # Main validation results component
│   └── layout/
├── pages/
│   └── DataValidation.tsx        # Main validation page
├── services/
│   └── databaseService.ts        # API integration
└── types/                        # TypeScript definitions
```

### Adding New Database Types
1. Update `DatabaseType` in `databaseService.ts`
2. Add database selection options in connection forms
3. Implement backend support for the new database type
4. Test connection and validation functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request with detailed description

## Support

For issues or questions:
1. Check this README for common solutions
2. Review backend logs for API errors
3. Verify database connectivity and permissions
4. Contact the development team with specific error messages

---

**Note**: This interface requires a compatible backend API that supports the validation endpoints. Ensure your backend is properly configured and running before using the validation features.
