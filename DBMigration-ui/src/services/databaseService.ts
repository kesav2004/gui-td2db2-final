// Simulated database service to mimic Python backend functionality
// In a real implementation, this would make API calls to a Python backend

// Types for database connections
export type DatabaseType = 'teradata' | 'oracle' | 'sqlserver' | 'postgresql' | 'db2' | 'db2-cloud' | 'db2-warehouse' | 'other';

export interface DatabaseConnection {
  id: string;
  name: string;
  databaseType: DatabaseType;
  host: string;
  port: string;
  database: string;
  username: string;
  connected: boolean;
}

export interface ConversionResult {
  sourceCode: string;
  targetCode: string;
  conversionTime: number;
  successCount: number;
  warningCount: number;
  errorCount: number;
  issues: Array<{
    line: number;
    message: string;
    severity: 'warning' | 'error';
    solution?: string;
  }>;
}

// In-memory storage for simulated data (would be stored in the backend database)
const connections: Record<string, DatabaseConnection> = {};

// Simulated test connection function - would call Python backend API
export const testDatabaseConnection = async (
  type: 'source' | 'target',
  config: {
    databaseType: DatabaseType;
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
  }
): Promise<{ success: boolean; message?: string }> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Basic validation
  if (!config.host || !config.database || !config.username || !config.password) {
    return { 
      success: false, 
      message: "All connection fields are required" 
    };
  }

  // Simulate different connection results based on inputs
  if (config.host === 'localhost' || config.host.includes('127.0.0.1')) {
    // Local connections always work in our simulation
    const id = `${type}-${Date.now()}`;
    connections[id] = {
      id,
      name: config.database,
      databaseType: config.databaseType,
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      connected: true
    };
    return { success: true };
  } else if (config.host.includes('example') || config.host.includes('test')) {
    // Example/test hosts always fail in our simulation
    return { 
      success: false, 
      message: "Could not establish connection to the database server" 
    };
  } else {
    // Other hosts have an 80% success rate
    const success = Math.random() < 0.8;
    
    if (success) {
      const id = `${type}-${Date.now()}`;
      connections[id] = {
        id,
        name: config.database,
        databaseType: config.databaseType,
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        connected: true
      };
    }
    
    return { 
      success, 
      message: success ? undefined : "Connection timed out" 
    };
  }
};

// Get active database connections
export const getDatabaseConnections = (): { 
  source?: DatabaseConnection; 
  target?: DatabaseConnection 
} => {
  let source, target;
  
  // Find source and target connections
  Object.values(connections).forEach(conn => {
    if (conn.id.startsWith('source-')) source = conn;
    if (conn.id.startsWith('target-')) target = conn;
  });
  
  return { source, target };
};

// Simulated Python sqlglot processing using antlr4-based parser logic
export const convertSqlSyntax = async (
  source: string,
  sourceType: DatabaseType,
  targetType: DatabaseType
): Promise<ConversionResult> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // This would use the Python parser in a real implementation
  // We're simulating the ANTLR4 parser output
  let targetCode = source;
  const issues = [];
  
  // Very basic teradata to DB2 conversions simulating the parser logic
  if (sourceType === 'teradata' && targetType.includes('db2')) {
    // SEL to SELECT conversion
    if (targetCode.toLowerCase().includes('sel ')) {
      const lineIndex = targetCode.toLowerCase().split('\n').findIndex(line => 
        line.toLowerCase().trim().startsWith('sel '));
      
      issues.push({
        line: lineIndex + 1,
        message: "SEL abbreviation is not supported in Db2, use SELECT instead",
        severity: 'warning',
        solution: "Converted SEL to SELECT"
      });
      
      targetCode = targetCode.replace(/\bSEL\b/gi, "SELECT");
    }
    
    // Replace QUALIFY with row_number() in a subquery
    if (targetCode.toLowerCase().includes('qualify')) {
      const lineIndex = targetCode.toLowerCase().split('\n').findIndex(line => 
        line.toLowerCase().includes('qualify'));
      
      issues.push({
        line: lineIndex + 1,
        message: "QUALIFY is not supported in IBM Db2",
        severity: 'error',
        solution: "Converted to standard SQL with ROW_NUMBER()"
      });
      
      // Attempt to match and transform QUALIFY pattern
      // This is a simplified simulation of what the Python parser would do
      const qualifyRegex = /QUALIFY\s+ROW_NUMBER\(\)\s+OVER\s+\(PARTITION\s+BY\s+([^\)]+)\s+ORDER\s+BY\s+([^\)]+)\)\s*=\s*1/i;
      const match = targetCode.match(qualifyRegex);
      
      if (match) {
        const partitionBy = match[1];
        const orderBy = match[2];
        
        // Extract the table and column names from the order by
        const orderParts = orderBy.split('.');
        let tableAlias = "";
        
        if (orderParts.length > 1) {
          tableAlias = orderParts[0].trim();
        }
        
        // Create a replacement subquery
        const replacement = `AND (
  SELECT COUNT(*) 
  FROM ${tableAlias ? tableAlias.split('.')[0] + '.' : ''}orders b2 
  WHERE b2.${partitionBy.includes('.') ? partitionBy.split('.')[1] : partitionBy} = ${
    partitionBy.includes('.') ? partitionBy : 'a.' + partitionBy
  } 
  AND (b2.${orderBy.split(' ')[0]} > ${
    orderBy.includes('.') ? orderBy.split(' ')[0] : 'a.' + orderBy.split(' ')[0]
  } OR 
      (b2.${orderBy.split(' ')[0]} = ${
    orderBy.includes('.') ? orderBy.split(' ')[0] : 'a.' + orderBy.split(' ')[0]
  } AND b2.order_id > ${
    tableAlias ? tableAlias + '.order_id' : 'a.order_id'
  }))
) = 0`;

        // Replace the QUALIFY clause with the subquery
        targetCode = targetCode.replace(qualifyRegex, replacement);
      } else {
        // Generic replacement if regex doesn't match
        targetCode = targetCode.replace(/QUALIFY\s+ROW_NUMBER\(\)\s+OVER\s+\(([^)]+)\)\s*=\s*1/gi, 
          `AND (
  SELECT COUNT(*) 
  FROM table_alias b2 
  WHERE b2.key = a.key 
  AND (b2.order_col > a.order_col OR 
      (b2.order_col = a.order_col AND b2.id > a.id))
) = 0`);
      }
    }
    
    // Replace DATE syntax
    if (targetCode.includes("DATE '")) {
      issues.push({
        line: targetCode.split('\n').findIndex(line => line.includes("DATE '")) + 1,
        message: "DATE literal format differs in Db2",
        severity: 'warning',
        solution: "Converted to DATE() function format"
      });
      
      targetCode = targetCode.replace(/DATE\s+'([^']+)'/gi, "DATE('$1')");
    }
    
    // Add warnings for potential issues
    if (targetCode.includes('.')) {
      issues.push({
        line: targetCode.split('\n').findIndex(line => line.includes('.')) + 1,
        message: "Table references may require schema qualification in Db2",
        severity: 'warning',
        solution: "Verify schema names in the target database"
      });
    }
    
    // Simulated ANTLR parser messages for Teradata syntax
    if (source.toLowerCase().includes('join')) {
      console.log("Python parser: Found JOIN clause in Teradata SQL");
    }
    
    if (source.toLowerCase().includes('where')) {
      console.log("Python parser: Found WHERE clause in Teradata SQL");
    }
  }
  
  // Calculate counts for reporting
  const successCount = targetCode !== source ? 1 : 0;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const errorCount = issues.filter(i => i.severity === 'error').length;
  
  return {
    sourceCode: source,
    targetCode,
    conversionTime: Math.random() * 1000 + 500, // Simulated conversion time in ms
    successCount,
    warningCount,
    errorCount,
    issues
  };
};

// Function to download a file (client-side functionality)
export const downloadSqlFile = (content: string, filename: string = 'converted_script.sql') => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

// Simulated schema browser data - would come from actual database connections
export const fetchDatabaseSchema = async (connectionId: string): Promise<any> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock schema data
  return {
    schemas: [
      {
        name: "SALES",
        tables: [
          { name: "CUSTOMERS", columns: ["CUSTOMER_ID", "NAME", "EMAIL", "ADDRESS"] },
          { name: "ORDERS", columns: ["ORDER_ID", "CUSTOMER_ID", "ORDER_DATE", "TOTAL"] },
          { name: "PRODUCTS", columns: ["PRODUCT_ID", "NAME", "PRICE", "CATEGORY"] }
        ],
        views: [
          { name: "CUSTOMER_ORDERS", definition: "SELECT c.NAME, o.ORDER_ID, o.ORDER_DATE FROM CUSTOMERS c JOIN ORDERS o ON c.CUSTOMER_ID = o.CUSTOMER_ID" }
        ],
        procedures: [
          { name: "UPDATE_INVENTORY", parameters: ["PRODUCT_ID INT", "QUANTITY INT"] }
        ],
        functions: [
          { name: "CALCULATE_DISCOUNT", parameters: ["PRICE DECIMAL", "CUSTOMER_TIER INT"], returnType: "DECIMAL" }
        ]
      },
      {
        name: "HR",
        tables: [
          { name: "EMPLOYEES", columns: ["EMPLOYEE_ID", "NAME", "POSITION", "SALARY"] },
          { name: "DEPARTMENTS", columns: ["DEPARTMENT_ID", "NAME", "MANAGER_ID"] }
        ],
        views: [
          { name: "DEPARTMENT_SUMMARY", definition: "SELECT d.NAME, COUNT(e.EMPLOYEE_ID) as EMP_COUNT FROM DEPARTMENTS d JOIN EMPLOYEES e ON d.DEPARTMENT_ID = e.DEPARTMENT_ID GROUP BY d.NAME" }
        ],
        procedures: [
          { name: "HIRE_EMPLOYEE", parameters: ["NAME VARCHAR(100)", "POSITION VARCHAR(50)", "SALARY DECIMAL"] }
        ],
        functions: [
          { name: "GET_MANAGER_NAME", parameters: ["DEPT_ID INT"], returnType: "VARCHAR(100)" }
        ]
      }
    ]
  };
};

// Upload and process SQL scripts
export const processSqlFile = async (file: File): Promise<{
  id: string;
  name: string;
  size: number;
  content: string;
  status: 'success' | 'error';
  error?: string;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        // Simulate backend processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        const content = e.target?.result as string;
        
        // Simulated Python parser analysis
        if (content.toLowerCase().includes('sel ') || content.toLowerCase().includes('qualify')) {
          console.log("Python TeradataSQL parser detected Teradata SQL syntax");
          
          // Log the parser output similar to Python sample code
          if (content.toLowerCase().includes('sel ')) {
            console.log("Found SELECT Statement:", content.split('\n').find(line => 
              line.toLowerCase().includes('sel ')));
          }
          
          if (content.toLowerCase().includes('qualify')) {
            console.log("Found QUALIFY clause:", content.split('\n').find(line => 
              line.toLowerCase().includes('qualify')));
          }
        }
        
        // Simple validation - in real app this would be done by the Python backend
        const hasError = Math.random() < 0.2 || content.includes('INVALID_SYNTAX');
        
        resolve({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          content,
          status: hasError ? 'error' : 'success',
          error: hasError ? 'Invalid SQL syntax detected' : undefined
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

// This function simulates parsing a script with the ANTLR4 TeradataSQL parser
export const parseTeradataScript = (sql: string): string[] => {
  // This would be a real call to Python backend in production
  // For now, we'll simulate the output of the parser
  
  const parsedSegments: string[] = [];
  
  // Check for select statements (SEL in Teradata)
  if (sql.toLowerCase().match(/\bsel\b|\bselect\b/g)) {
    parsedSegments.push("Found SELECT Statement");
  }
  
  // Check for QUALIFY clause
  if (sql.toLowerCase().includes('qualify')) {
    parsedSegments.push("Found QUALIFY clause - will require conversion for Db2");
  }
  
  // Check for specific Teradata syntax
  if (sql.toLowerCase().includes('collect stats')) {
    parsedSegments.push("Found COLLECT STATS - no direct equivalent in Db2");
  }
  
  // Check for Teradata specific datatypes
  if (sql.toLowerCase().includes('byteint') || sql.toLowerCase().includes('timestamp(6)')) {
    parsedSegments.push("Found Teradata-specific datatypes");
  }
  
  // If no Teradata specific features found
  if (parsedSegments.length === 0) {
    parsedSegments.push("No Teradata-specific syntax found");
  }
  
  return parsedSegments;
};

// This function would implement the logic from the Python parser for DB2 conversion
export const simulateTeradataToDb2Conversion = (sql: string): string => {
  let convertedSql = sql;
  
  // Replace SEL with SELECT
  convertedSql = convertedSql.replace(/\bSEL\b/gi, "SELECT");
  
  // Replace DATE literals
  convertedSql = convertedSql.replace(/DATE\s+'([^']+)'/gi, "DATE('$1')");
  
  // Replace QUALIFY clauses
  // This is a simplified approach; a real parser would handle this more precisely
  if (convertedSql.toLowerCase().includes('qualify')) {
    // Find the table alias used in the QUALIFY clause
    const tableMatches = sql.match(/from\s+(\w+)(?:\.\w+)?\s+([a-zA-Z][a-zA-Z0-9_]*)/i);
    const tableAlias = tableMatches ? tableMatches[2] : 'a';
    
    // Replace QUALIFY with a subquery
    convertedSql = convertedSql.replace(/QUALIFY\s+ROW_NUMBER\(\)\s+OVER\s+\(PARTITION\s+BY\s+([^\)]+)\s+ORDER\s+BY\s+([^\)]+)\)\s*=\s*1/gi, 
      `AND NOT EXISTS (
  SELECT 1
  FROM ${tableMatches ? tableMatches[1] + (tableMatches[2] ? '.' + tableMatches[2] : '') : 'table'} b
  WHERE b.$1 = ${tableAlias}.$1
  AND (b.$2 > ${tableAlias}.$2 OR (b.$2 = ${tableAlias}.$2 AND b.id > ${tableAlias}.id))
)`);
  }
  
  // Additional Teradata to DB2 conversions would go here
  
  return convertedSql;
};