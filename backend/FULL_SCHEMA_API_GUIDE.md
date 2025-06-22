# 🚀 Full Schema Comparison API Guide

## Overview
The Full Schema Comparison system enables automatic discovery and validation of all tables between two database schemas, with intelligent table matching and bulk configuration.

---

## 📡 API Endpoints

### 1. Schema Discovery & Table Matching
**Endpoint:** `POST /api/discover-schema-tables`

**Purpose:** Discover all tables in source and target schemas, automatically match them, and suggest primary keys.

**Request:**
```json
{
  "source_db": {
    "db_type": "db2",
    "host": "hostname",
    "port": "25010",
    "username": "user",
    "password": "pass",
    "database": "SAMPLE"
  },
  "target_db": {
    "db_type": "db2", 
    "host": "hostname",
    "port": "25010",
    "username": "user",
    "password": "pass",
    "database": "SAMPLE"
  },
  "sourceSchema": "DB2INST1",
  "targetSchema": "DB2INST1"
}
```

**Response:**
```json
{
  "success": true,
  "source_schema": "DB2INST1",
  "target_schema": "DB2INST1",
  "matched_tables": [
    {
      "source_table": "EMPLOYEE",
      "target_table": "EMPLOYEE",
      "match_type": "exact",
      "suggested_primary_keys": ["EMPNO"],
      "all_columns": ["EMPNO", "FIRSTNME", "LASTNAME", "WORKDEPT", ...]
    },
    {
      "source_table": "DEPARTMENT", 
      "target_table": "DEPT",
      "match_type": "case_insensitive",
      "suggested_primary_keys": ["DEPTNO"],
      "all_columns": ["DEPTNO", "DEPTNAME", "MGRNO", ...]
    }
  ],
  "unmatched_source_tables": ["ORDERS"],
  "unmatched_target_tables": ["CUSTOMERS"],
  "summary": {
    "total_source_tables": 5,
    "total_target_tables": 4,
    "matched_pairs": 3,
    "unmatched_source": 1,
    "unmatched_target": 1
  }
}
```

---

### 2. Full Schema Validation
**Endpoint:** `POST /api/run-validation`

**Purpose:** Run validation on all matched table pairs with schema-level configuration.

**Request:**
```json
{
  "comparisonType": "full",
  "sourceSchema": "DB2INST1",
  "targetSchema": "DB2INST1", 
  "source_db": { /* Same as discovery */ },
  "target_db": { /* Same as discovery */ },
  "matched_tables": [
    {
      "source_table": "EMPLOYEE",
      "target_table": "EMPLOYEE", 
      "primary_keys": ["EMPNO"]  // Can override suggested keys
    }
  ],
  "defaultKeys": ["EMPNO"],           // Applied to all tables without specific keys
  "defaultPredicate": "",             // Optional filter for all tables
  "defaultIncludeFields": [],         // Include only these fields (empty = all)
  "defaultExcludeFields": ["CREATED_DATE"], // Exclude these fields
  "defaultGroupBy": []                // Group by fields for aggregation
}
```

**Response:**
```json
{
  "success": true,
  "tables": [
    {
      "tableName": "DB2INST1.EMPLOYEE",
      "sourceRows": 42,
      "targetRows": 1000042,
      "sourceTime": "2.45s",
      "targetTime": "5.12s",
      "rowsNotInTarget": 5,
      "rowsNotInSource": 1000000,
      "fieldsMismatch": 2,
      "sourceNotInTargetRows": [
        {"EMPNO": "000310", "FIRSTNME": "JOHN", "LASTNAME": "SMITH"},
        {"EMPNO": "000320", "FIRSTNME": "JANE", "LASTNAME": "DOE"}
      ],
      "targetNotInSourceRows": [
        {"EMPNO": "900001", "FIRSTNME": "AUTO", "LASTNAME": "GENERATED"},
        // ... up to 10 rows
      ],
      "fieldMismatchRows": [
        {
          "EMPNO": "000290",
          "SALARY_source": 50000.00,
          "SALARY_target": 55000.00
        }
      ]
    }
  ],
  "summary": {
    "total_tables": 3,
    "tables_with_differences": 2,
    "start_time": "2025-01-18T10:30:00",
    "end_time": "2025-01-18T10:35:00"
  }
}
```

---

### 3. Get Detailed Results
**Endpoint:** `GET /api/validation-results-detailed`

**Purpose:** Retrieve the latest detailed validation results with enhanced formatting.

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_tables": 3,
    "tables_with_differences": 2,
    "start_time": "2025-01-18T10:30:00",
    "end_time": "2025-01-18T10:35:00"
  },
  "tables": [
    {
      "tableName": "DB2INST1.EMPLOYEE",
      "sourceRows": 42,
      "targetRows": 1000042,
      "rowsNotInTarget": 5,
      "rowsNotInSource": 1000000,
      "fieldsMismatch": 2,
      "sourceNotInTargetRows": [/* actual row data */],
      "targetNotInSourceRows": [/* actual row data */],
      "fieldMismatchRows": [/* field-level differences */],
      "formattedSummary": {
        "table_name": "DB2INST1.EMPLOYEE",
        "source_rows": 42,
        "target_rows": 1000042,
        "source_diff_target": 1000000,
        "target_diff_source": 1000000,
        "fields_mismatch": 2,
        "has_differences": true
      }
    }
  ]
}
```

---

### 4. Get Table-Specific Details
**Endpoint:** `GET /api/validation-table-details/{table_name}`

**Purpose:** Get detailed row-level differences for a specific table.

**Response:**
```json
{
  "success": true,
  "table_name": "DB2INST1.EMPLOYEE",
  "source_table": "DB2INST1.EMPLOYEE",
  "target_table": "DB2INST1.EMPLOYEE",
  "summary": {
    "source_rows": 42,
    "target_rows": 1000042,
    "source_time": 2.45,
    "target_time": 5.12
  },
  "differences": {
    "source_not_in_target": {
      "count": 5,
      "rows": [/* up to 10 actual rows */],
      "showing_top_10": false
    },
    "target_not_in_source": {
      "count": 1000000,
      "rows": [/* up to 10 actual rows */],
      "showing_top_10": true
    },
    "field_mismatches": {
      "count": 2, 
      "rows": [/* up to 10 mismatch details */],
      "showing_top_10": false
    }
  }
}
```

---

## 🎨 Frontend Integration Guide

### Step 1: Schema Discovery UI
```javascript
// When user selects "Full Schema" comparison type
const discoverTables = async () => {
  const payload = {
    source_db: sourceDbConfig,
    target_db: targetDbConfig,
    sourceSchema: selectedSourceSchema,
    targetSchema: selectedTargetSchema
  };
  
  const response = await fetch('/api/discover-schema-tables', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const result = await response.json();
  
  if (result.success) {
    setMatchedTables(result.matched_tables);
    setSummary(result.summary);
    setUnmatchedTables({
      source: result.unmatched_source_tables,
      target: result.unmatched_target_tables
    });
  }
};
```

### Step 2: Table Matching Review UI
```jsx
const TableMatchingReview = ({ matchedTables, onUpdateKeys }) => {
  return (
    <div className="table-matching-review">
      <h3>📋 Discovered Table Matches ({matchedTables.length})</h3>
      
      {matchedTables.map((match, index) => (
        <div key={index} className="table-match-row">
          <div className="match-info">
            <span className="source-table">{match.source_table}</span>
            <span className="arrow">→</span>
            <span className="target-table">{match.target_table}</span>
            <span className={`match-type ${match.match_type}`}>
              {match.match_type}
            </span>
          </div>
          
          <div className="primary-keys">
            <label>Primary Keys:</label>
            <input 
              type="text"
              defaultValue={match.suggested_primary_keys?.join(', ')}
              onChange={(e) => onUpdateKeys(index, e.target.value.split(','))}
              placeholder="EMPNO, ID"
            />
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Step 3: Schema-Level Configuration UI
```jsx
const SchemaLevelConfig = ({ onConfigChange }) => {
  return (
    <div className="schema-config">
      <h3>⚙️ Schema-Level Configuration</h3>
      
      <div className="config-row">
        <label>Default Primary Keys:</label>
        <input 
          type="text"
          placeholder="EMPNO, ID, PK"
          onChange={(e) => onConfigChange('defaultKeys', e.target.value.split(','))}
        />
      </div>
      
      <div className="config-row">
        <label>Default Predicate:</label>
        <input 
          type="text"
          placeholder="WHERE active = 1"
          onChange={(e) => onConfigChange('defaultPredicate', e.target.value)}
        />
      </div>
      
      <div className="config-row">
        <label>Exclude Fields:</label>
        <input 
          type="text"
          placeholder="CREATED_DATE, UPDATED_DATE"
          onChange={(e) => onConfigChange('defaultExcludeFields', e.target.value.split(','))}
        />
      </div>
    </div>
  );
};
```

### Step 4: Results Display UI
```jsx
const FullSchemaResults = ({ results }) => {
  return (
    <div className="full-schema-results">
      <div className="results-summary">
        <h2>📊 Full Schema Validation Results</h2>
        <div className="summary-stats">
          <span>Tables Processed: {results.summary?.total_tables}</span>
          <span>Tables with Differences: {results.summary?.tables_with_differences}</span>
        </div>
      </div>
      
      <div className="results-table">
        <table>
          <thead>
            <tr>
              <th>Table</th>
              <th>Source Rows</th>
              <th>Target Rows</th>
              <th>Source Diff Target</th>
              <th>Target Diff Source</th>
              <th>Fields Mismatch</th>
            </tr>
          </thead>
          <tbody>
            {results.tables?.map((table, index) => (
              <tr key={index} className={table.formattedSummary?.has_differences ? 'has-differences' : ''}>
                <td>{table.tableName}</td>
                <td>{table.sourceRows?.toLocaleString()}</td>
                <td>{table.targetRows?.toLocaleString()}</td>
                <td>{table.rowsNotInTarget}</td>
                <td>{table.rowsNotInSource}</td>
                <td>{table.fieldsMismatch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Detailed row differences */}
      <RowDifferencesPanel tables={results.tables} />
    </div>
  );
};
```

---

## 🎯 Complete Workflow

1. **User selects "Full Schema"** comparison type
2. **Frontend calls** `/api/discover-schema-tables` 
3. **User reviews** matched table pairs and adjusts primary keys
4. **User sets** schema-level defaults (keys, predicates, etc.)
5. **Frontend calls** `/api/run-validation` with full payload
6. **Backend processes** all table pairs in parallel
7. **Frontend displays** results with actual row differences
8. **User can drill down** into specific table details

---

## ✅ Ready to Use!

Your Full Schema Comparison system is now complete with:
- ✅ **Intelligent table discovery & matching**
- ✅ **Primary key auto-suggestion**
- ✅ **Bulk schema-level configuration**
- ✅ **Actual row-level differences (not just counts)**
- ✅ **Scalable processing for large schemas**
- ✅ **Detailed results with top 10 row limiting**

**Test the system using the provided `test_full_schema.py` script!** 🚀 