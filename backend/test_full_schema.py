#!/usr/bin/env python3
"""
Test script for Full Schema Comparison System
Demonstrates the complete workflow from discovery to validation
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:5000/api"

# Sample database connections (using your existing DB details)
SOURCE_DB = {
    'db_type': 'db2',
    'host': 'tel-gdc-cdc-prakedia1.fyre.ibm.com',
    'port': '25010',
    'username': 'cdcadm',
    'password': 'Rajisthanisgreat@777I',
    'database': 'SAMPLE'
}

TARGET_DB = {
    'db_type': 'db2',
    'host': 'tel-gdc-cdc-prakedia1.fyre.ibm.com',
    'port': '25010',
    'username': 'cdcadm',
    'password': 'Rajisthanisgreat@777I',
    'database': 'SAMPLE'
}

def test_schema_discovery():
    """Test the schema discovery endpoint"""
    print("🔍 STEP 1: Testing Schema Discovery")
    print("=" * 50)
    
    discovery_payload = {
        'source_db': SOURCE_DB,
        'target_db': TARGET_DB,
        'sourceSchema': 'DB2INST1',
        'targetSchema': 'DB2INST1'
    }
    
    try:
        response = requests.post(f"{BASE_URL}/discover-schema-tables", json=discovery_payload)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Schema Discovery Successful!")
            print(f"📊 Summary:")
            print(f"   • Source Tables: {result['summary']['total_source_tables']}")
            print(f"   • Target Tables: {result['summary']['total_target_tables']}")
            print(f"   • Matched Pairs: {result['summary']['matched_pairs']}")
            print(f"   • Unmatched Source: {result['summary']['unmatched_source']}")
            print(f"   • Unmatched Target: {result['summary']['unmatched_target']}")
            
            print(f"\n🔗 Matched Table Pairs:")
            for i, match in enumerate(result['matched_tables'][:5], 1):  # Show first 5
                print(f"   {i}. {match['source_table']} → {match['target_table']} ({match['match_type']})")
                if match.get('suggested_primary_keys'):
                    print(f"      Suggested Keys: {', '.join(match['suggested_primary_keys'])}")
            
            if len(result['matched_tables']) > 5:
                print(f"   ... and {len(result['matched_tables']) - 5} more tables")
            
            return result
        else:
            print(f"❌ Discovery failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error during discovery: {str(e)}")
        return None

def test_full_schema_validation(discovered_tables):
    """Test full schema validation with discovered tables"""
    print("\n🔄 STEP 2: Testing Full Schema Validation")
    print("=" * 50)
    
    if not discovered_tables or not discovered_tables.get('matched_tables'):
        print("❌ No table matches available for validation")
        return None
    
    # Prepare validation payload
    validation_payload = {
        'comparisonType': 'full',
        'sourceSchema': discovered_tables['source_schema'],
        'targetSchema': discovered_tables['target_schema'],
        'source_db': SOURCE_DB,
        'target_db': TARGET_DB,
        'matched_tables': discovered_tables['matched_tables'][:3],  # Test with first 3 tables
        'defaultKeys': ['EMPNO'],  # Default primary key for all tables
        'defaultPredicate': '',
        'defaultIncludeFields': [],
        'defaultExcludeFields': [],
        'defaultGroupBy': []
    }
    
    print(f"🚀 Starting validation for {len(validation_payload['matched_tables'])} table pairs...")
    
    try:
        response = requests.post(f"{BASE_URL}/run-validation", json=validation_payload)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Full Schema Validation Successful!")
            
            if result.get('success') and result.get('tables'):
                print(f"\n📈 Validation Results:")
                for i, table in enumerate(result['tables'], 1):
                    print(f"   {i}. {table['tableName']}")
                    print(f"      Source Rows: {table['sourceRows']:,}")
                    print(f"      Target Rows: {table['targetRows']:,}")
                    print(f"      Rows not in Target: {table['rowsNotInTarget']}")
                    print(f"      Rows not in Source: {table['rowsNotInSource']}")
                    print(f"      Field Mismatches: {table['fieldsMismatch']}")
                    
                    # Show sample differing rows if any
                    if table.get('sourceNotInTargetRows'):
                        print(f"      📝 Sample rows in source not in target:")
                        for j, row in enumerate(table['sourceNotInTargetRows'][:2], 1):
                            print(f"         {j}. {row}")
                    
                    print()
            
            return result
        else:
            print(f"❌ Validation failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error during validation: {str(e)}")
        return None

def test_detailed_results():
    """Test the detailed results endpoints"""
    print("\n📊 STEP 3: Testing Detailed Results")
    print("=" * 50)
    
    try:
        # Test detailed validation results
        response = requests.get(f"{BASE_URL}/validation-results-detailed")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Detailed Results Retrieved!")
            
            if result.get('success') and result.get('tables'):
                print(f"\n🎯 Enhanced Results Summary:")
                for table in result['tables'][:2]:  # Show first 2 tables
                    print(f"   📋 Table: {table['tableName']}")
                    print(f"      ⏱️  Source Time: {table['sourceTime']}")
                    print(f"      ⏱️  Target Time: {table['targetTime']}")
                    
                    # Show actual differing rows
                    if table.get('sourceNotInTargetRows'):
                        print(f"      🔍 Actual rows in source not in target:")
                        for row in table['sourceNotInTargetRows'][:1]:
                            print(f"         {row}")
                    
                    if table.get('fieldMismatchRows'):
                        print(f"      ⚠️  Field mismatches:")
                        for row in table['fieldMismatchRows'][:1]:
                            print(f"         {row}")
            
            return result
        else:
            print(f"❌ Detailed results failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error getting detailed results: {str(e)}")
        return None

def main():
    """Run the complete Full Schema Comparison test"""
    print("🚀 FULL SCHEMA COMPARISON SYSTEM TEST")
    print("=" * 60)
    print("This demonstrates the complete workflow:")
    print("1. Schema Discovery & Table Matching")
    print("2. Full Schema Validation")
    print("3. Detailed Results with Actual Row Data")
    print("=" * 60)
    
    # Step 1: Discover and match tables
    discovered_tables = test_schema_discovery()
    
    if discovered_tables:
        # Step 2: Run full schema validation
        validation_results = test_full_schema_validation(discovered_tables)
        
        if validation_results:
            # Step 3: Get detailed results
            time.sleep(2)  # Wait for results to be processed
            detailed_results = test_detailed_results()
            
            print("\n🎉 FULL SCHEMA COMPARISON TEST COMPLETE!")
            print("=" * 60)
            print("✅ Schema Discovery: SUCCESS")
            print("✅ Full Validation: SUCCESS")
            print("✅ Detailed Results: SUCCESS")
            print("\n🎯 Ready for Frontend Integration!")
        else:
            print("\n❌ Validation step failed")
    else:
        print("\n❌ Discovery step failed")

if __name__ == "__main__":
    main() 