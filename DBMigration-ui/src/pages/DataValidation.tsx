import Layout from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertCircle, 
  CheckCircle, 
  Database, 
  Play, 
  Settings, 
  Table as TableIcon,
  Loader2,
  RefreshCw,
  ArrowRight,
  Download,
  Eye,
  ChevronDown,
  ChevronRight,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface DatabaseConfig {
  db_type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

interface TableMatch {
  source_table: string;
  target_table: string;
  match_type: string;
  suggested_primary_keys?: string[];
  all_columns?: string[];
  primary_keys?: string[];
}

interface ValidationConfig {
  sourceSchema: string;
  targetSchema: string;
  sourceTable?: string;
  targetTable?: string;
  keys: string[];
  comparisonType: "single" | "full";
  predicate?: string;
  includeColumns?: string[];
  excludeColumns?: string[];
  groupby?: string[];
  matched_tables?: TableMatch[];
  defaultKeys?: string[];
  defaultPredicate?: string;
  defaultIncludeFields?: string[];
  defaultExcludeFields?: string[];
  defaultGroupBy?: string[];
}

interface ValidationResult {
  success: boolean;
  tables: Array<{
    tableName: string;
    sourceRows: number;
    targetRows: number;
    sourceTime?: string;
    targetTime?: string;
    rowsNotInTarget: number;
    rowsNotInSource: number;
    fieldsMismatch: number;
    sourceNotInTargetRows?: any[];
    targetNotInSourceRows?: any[];
    fieldMismatchRows?: any[];
    hasDifferences: boolean;
  }>;
  summary?: {
    total_tables?: number;
    tables_with_differences?: number;
    total_source_rows?: number;
    total_target_rows?: number;
    start_time?: string;
    end_time?: string;
  };
  run_id?: string;
  run_path?: string;
}

const DataValidation = () => {
  // Connection states
  const [sourceDB, setSourceDB] = useState<DatabaseConfig>({
    db_type: "teradata",
    host: "",
    port: "1025",
    database: "",
    username: "",
    password: ""
  });
  
  const [targetDB, setTargetDB] = useState<DatabaseConfig>({
    db_type: "db2", 
    host: "",
    port: "50000",
    database: "",
    username: "",
    password: ""
  });

  // Connection status
  const [sourceConnected, setSourceConnected] = useState(false);
  const [targetConnected, setTargetConnected] = useState(false);
  const [testingConnection, setTestingConnection] = useState<"source" | "target" | null>(null);

  // Schema and table data
  const [sourceSchemas, setSourceSchemas] = useState<string[]>([]);
  const [targetSchemas, setTargetSchemas] = useState<string[]>([]);
  const [sourceTables, setSourceTables] = useState<string[]>([]);
  const [targetTables, setTargetTables] = useState<string[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  
  // Matched tables for full schema validation
  const [matchedTables, setMatchedTables] = useState<TableMatch[]>([]);
  const [discoveredTables, setDiscoveredTables] = useState(false);

  // Validation configuration
  const [validationConfig, setValidationConfig] = useState<ValidationConfig>({
    sourceSchema: "",
    targetSchema: "",
    keys: [],
    comparisonType: "single"
  });

  // Validation execution and results
  const [isRunningValidation, setIsRunningValidation] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [validationComplete, setValidationComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState<"connection" | "configuration" | "execution" | "results">("connection");
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [formattedReport, setFormattedReport] = useState<string | null>(null);

  // Test database connection
  const testConnection = async (type: "source" | "target") => {
    setTestingConnection(type);
    const config = type === "source" ? sourceDB : targetDB;
    
    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (type === "source") {
          setSourceConnected(true);
          fetchSchemas("source");
        } else {
          setTargetConnected(true);
          fetchSchemas("target");
        }
        
        toast.success(`${type === "source" ? "Source" : "Target"} database connected successfully`);
      } else {
        toast.error(`${type === "source" ? "Source" : "Target"} connection failed`, {
          description: data.message
        });
      }
    } catch (error) {
      toast.error("Connection test failed", {
        description: "An error occurred while testing the connection"
      });
    } finally {
      setTestingConnection(null);
    }
  };

  // Fetch schemas
  const fetchSchemas = async (type: "source" | "target") => {
    const config = type === "source" ? sourceDB : targetDB;
    
    try {
      const response = await fetch("/api/schemas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.schemas) {
        if (type === "source") {
          setSourceSchemas(data.schemas);
        } else {
          setTargetSchemas(data.schemas);
        }
      }
    } catch (error) {
      toast.error(`Failed to fetch ${type} schemas`);
    }
  };

  // Fetch tables for selected schema
  const fetchTables = async (type: "source" | "target", schema: string) => {
    const config = type === "source" ? sourceDB : targetDB;
    
    try {
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, schema })
      });
      
      const data = await response.json();
      
      if (data.tables) {
        if (type === "source") {
          setSourceTables(data.tables);
        } else {
          setTargetTables(data.tables);
        }
      }
    } catch (error) {
      toast.error(`Failed to fetch ${type} tables`);
    }
  };

  // Fetch columns for selected table
  const fetchColumns = async (type: "source" | "target", schema: string, table: string) => {
    const config = type === "source" ? sourceDB : targetDB;
    
    try {
      const response = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, schema, table })
      });
      
      const data = await response.json();
      
      if (data.columns) {
        if (type === "source") {
          setSourceColumns(data.columns);
        }
      }
    } catch (error) {
      toast.error(`Failed to fetch ${type} columns`);
    }
  };

  // Discover and match tables for full schema validation
  const discoverTables = async () => {
    if (!validationConfig.sourceSchema || !validationConfig.targetSchema) {
      toast.error("Please select source and target schemas first");
      return;
    }

    try {
      const response = await fetch("/api/discover-schema-tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_db: sourceDB,
          target_db: targetDB,
          sourceSchema: validationConfig.sourceSchema,
          targetSchema: validationConfig.targetSchema
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMatchedTables(data.matched_tables || []);
        setDiscoveredTables(true);
        toast.success(`Discovered ${data.matched_tables?.length || 0} table matches`);
      } else {
        toast.error("Table discovery failed", {
          description: data.message
        });
      }
    } catch (error) {
      toast.error("Error during table discovery");
    }
  };

  // Run validation - FIXED TO PROPERLY HANDLE RESULTS
  const runValidation = async () => {
    setIsRunningValidation(true);
    setValidationResults(null);
    
    try {
      const requestBody = {
        ...validationConfig,
        source_db: sourceDB,
        target_db: targetDB
      };

      console.log("🔄 Sending validation request:", requestBody);

      const response = await fetch("/api/run-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📊 Validation response received:", data);
      
      if (data.success) {
        // Store the validation results directly from the API response
        setValidationResults(data);
        setValidationComplete(true);
        setCurrentStep("results");
        
        // Show success message with actual data
        const tableCount = data.tables?.length || 0;
        const differencesFound = data.tables?.filter((t: any) => t.hasDifferences)?.length || 0;
        
        toast.success("✅ Validation completed successfully!", {
          description: `Processed ${tableCount} tables, found differences in ${differencesFound} tables. Loading detailed report...`
        });
        
        console.log("✅ Validation complete! Tables processed:", tableCount);
        console.log("📈 Results stored in state:", data);
        
        // Automatically fetch the formatted report immediately
        console.log("🎯 About to fetch formatted report...");
        setTimeout(() => {
          console.log("🕐 Fetching formatted report after 2 second delay...");
          fetchFormattedReport();
        }, 2000);
        
      } else {
        console.error("❌ Validation failed:", data.message);
        toast.error("Validation failed", {
          description: data.message
        });
      }
    } catch (error) {
      console.error("❌ Validation error:", error);
      toast.error("Error running validation", {
        description: "An unexpected error occurred. Check console for details."
      });
    } finally {
      setIsRunningValidation(false);
    }
  };

  // Update matched table primary keys
  const updateTableKeys = (index: number, keys: string[]) => {
    const updatedTables = [...matchedTables];
    updatedTables[index].primary_keys = keys;
    setMatchedTables(updatedTables);
    
    setValidationConfig(prev => ({
      ...prev,
      matched_tables: updatedTables
    }));
  };

  // Check if ready for validation
  const isReadyForValidation = () => {
    if (!sourceConnected || !targetConnected) return false;
    if (!validationConfig.sourceSchema || !validationConfig.targetSchema) return false;
    
    if (validationConfig.comparisonType === "single") {
      return validationConfig.sourceTable && validationConfig.targetTable && validationConfig.keys.length > 0;
    } else {
      return discoveredTables && matchedTables.length > 0;
    }
  };

  // Toggle table expansion for details
  const handleTableToggle = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Get badge for differences
  const getDifferencesBadge = (count: number) => {
    if (count === 0) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">0</Badge>;
    }
    return <Badge variant="destructive">{formatNumber(count)}</Badge>;
  };

  // Fetch formatted report
  const fetchFormattedReport = async () => {
    try {
      console.log("🔄 Fetching formatted validation report...");
      const response = await fetch("/api/formatted-validation-report");
      console.log("📡 Response status:", response.status);
      
      const data = await response.json();
      console.log("📊 Formatted report response:", data);
      
      if (data.success) {
        setFormattedReport(data.formatted_report);
        console.log("✅ Formatted report loaded successfully");
        toast.success("Detailed validation report loaded successfully");
      } else {
        console.error("❌ Failed to load formatted report:", data.message);
        toast.error("Failed to load detailed report", {
          description: data.message
        });
      }
    } catch (error) {
      console.error("❌ Error loading formatted report:", error);
      toast.error("Error loading detailed report", {
        description: "Check console for details"
      });
    }
  };

  // Download report
  const downloadReport = async () => {
    try {
      const response = await fetch("/api/download-report");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'validation_report.log.gz';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Report downloaded successfully");
      } else {
        toast.error("Failed to download report");
      }
    } catch (error) {
      toast.error("Error downloading report");
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Report copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-carbon-gray-100">Data Validation</h1>
          <p className="text-carbon-gray-70 mt-1">
            Compare and validate data between source and target databases
          </p>
        </div>

        {/* Progress Indicator */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {["connection", "configuration", "execution", "results"].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentStep === step ? "bg-blue-600 text-white border-blue-600" :
                    index < ["connection", "configuration", "execution", "results"].indexOf(currentStep) ? 
                    "bg-green-600 text-white border-green-600" : "border-gray-300 text-gray-500"
                  }`}>
                    {index < ["connection", "configuration", "execution", "results"].indexOf(currentStep) ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep === step ? "text-blue-600" : 
                    index < ["connection", "configuration", "execution", "results"].indexOf(currentStep) ?
                    "text-green-600" : "text-gray-500"
                  }`}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </span>
                  {index < 3 && <ArrowRight className="h-4 w-4 text-gray-400 mx-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection">Database Connection</TabsTrigger>
            <TabsTrigger value="configuration" disabled={!sourceConnected || !targetConnected}>
              Validation Configuration
            </TabsTrigger>
            <TabsTrigger value="execution" disabled={!isReadyForValidation()}>
              Execute Validation
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!validationComplete}>
              View Results
            </TabsTrigger>
          </TabsList>

          {/* Database Connection Tab */}
          <TabsContent value="connection" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Source Database */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <CardTitle>Source Database</CardTitle>
                  </div>
                  {sourceConnected && <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Database Type</Label>
                    <Select 
                      value={sourceDB.db_type} 
                      onValueChange={(value) => setSourceDB(prev => ({ ...prev, db_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teradata">Teradata</SelectItem>
                        <SelectItem value="db2">IBM Db2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Host</Label>
                      <Input
                        value={sourceDB.host}
                        onChange={(e) => setSourceDB(prev => ({ ...prev, host: e.target.value }))}
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <Label>Port</Label>
                      <Input
                        value={sourceDB.port}
                        onChange={(e) => setSourceDB(prev => ({ ...prev, port: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Database</Label>
                    <Input
                      value={sourceDB.database}
                      onChange={(e) => setSourceDB(prev => ({ ...prev, database: e.target.value }))}
                      placeholder="Database name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Username</Label>
                      <Input
                        value={sourceDB.username}
                        onChange={(e) => setSourceDB(prev => ({ ...prev, username: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={sourceDB.password}
                        onChange={(e) => setSourceDB(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => testConnection("source")}
                    disabled={testingConnection === "source"}
                    className="w-full"
                  >
                    {testingConnection === "source" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Target Database */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <CardTitle>Target Database</CardTitle>
                  </div>
                  {targetConnected && <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Database Type</Label>
                    <Select 
                      value={targetDB.db_type} 
                      onValueChange={(value) => setTargetDB(prev => ({ ...prev, db_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="db2">IBM Db2</SelectItem>
                        <SelectItem value="teradata">Teradata</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Host</Label>
                      <Input
                        value={targetDB.host}
                        onChange={(e) => setTargetDB(prev => ({ ...prev, host: e.target.value }))}
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <Label>Port</Label>
                      <Input
                        value={targetDB.port}
                        onChange={(e) => setTargetDB(prev => ({ ...prev, port: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Database</Label>
                    <Input
                      value={targetDB.database}
                      onChange={(e) => setTargetDB(prev => ({ ...prev, database: e.target.value }))}
                      placeholder="Database name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Username</Label>
                      <Input
                        value={targetDB.username}
                        onChange={(e) => setTargetDB(prev => ({ ...prev, username: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={targetDB.password}
                        onChange={(e) => setTargetDB(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => testConnection("target")}
                    disabled={testingConnection === "target"}
                    className="w-full"
                  >
                    {testingConnection === "target" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {sourceConnected && targetConnected && (
              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep("configuration")}>
                  Next: Configure Validation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Validation Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comparison Type */}
                <div>
                  <Label>Comparison Type</Label>
                  <Select 
                    value={validationConfig.comparisonType} 
                    onValueChange={(value: "single" | "full") => setValidationConfig(prev => ({ 
                      ...prev, 
                      comparisonType: value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Table Comparison</SelectItem>
                      <SelectItem value="full">Full Schema Comparison</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Schema Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Source Schema</Label>
                    <Select 
                      value={validationConfig.sourceSchema} 
                      onValueChange={(value) => {
                        setValidationConfig(prev => ({ ...prev, sourceSchema: value }));
                        fetchTables("source", value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source schema" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceSchemas.map(schema => (
                          <SelectItem key={schema} value={schema}>{schema}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target Schema</Label>
                    <Select 
                      value={validationConfig.targetSchema} 
                      onValueChange={(value) => {
                        setValidationConfig(prev => ({ ...prev, targetSchema: value }));
                        fetchTables("target", value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target schema" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetSchemas.map(schema => (
                          <SelectItem key={schema} value={schema}>{schema}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Single Table Configuration */}
                {validationConfig.comparisonType === "single" && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Source Table</Label>
                        <Select 
                          value={validationConfig.sourceTable || ""} 
                          onValueChange={(value) => {
                            setValidationConfig(prev => ({ ...prev, sourceTable: value }));
                            if (validationConfig.sourceSchema) {
                              fetchColumns("source", validationConfig.sourceSchema, value);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select source table" />
                          </SelectTrigger>
                          <SelectContent>
                            {sourceTables.map(table => (
                              <SelectItem key={table} value={table}>{table}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Target Table</Label>
                        <Select 
                          value={validationConfig.targetTable || ""} 
                          onValueChange={(value) => {
                            setValidationConfig(prev => ({ ...prev, targetTable: value }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select target table" />
                          </SelectTrigger>
                          <SelectContent>
                            {targetTables.map(table => (
                              <SelectItem key={table} value={table}>{table}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Primary Keys */}
                    <div>
                      <Label>Primary Key Columns</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {sourceColumns.map(column => (
                          <Badge
                            key={column}
                            variant={validationConfig.keys.includes(column) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const newKeys = validationConfig.keys.includes(column)
                                ? validationConfig.keys.filter(k => k !== column)
                                : [...validationConfig.keys, column];
                              setValidationConfig(prev => ({ ...prev, keys: newKeys }));
                            }}
                          >
                            {column}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Advanced Options */}
                    <div>
                      <Label>WHERE Clause (Optional)</Label>
                      <Textarea
                        value={validationConfig.predicate || ""}
                        onChange={(e) => setValidationConfig(prev => ({ ...prev, predicate: e.target.value }))}
                        placeholder="e.g., status = 'ACTIVE' AND created_date > '2023-01-01'"
                      />
                    </div>
                  </>
                )}

                {/* Full Schema Configuration */}
                {validationConfig.comparisonType === "full" && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Schema-Level Configuration</h3>
                        <Button 
                          onClick={discoverTables}
                          disabled={!validationConfig.sourceSchema || !validationConfig.targetSchema}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Discover Tables
                        </Button>
                      </div>

                      {discoveredTables && matchedTables.length > 0 && (
                        <div className="space-y-4">
                          <div>
                            <Label>Default Primary Keys</Label>
                            <Input
                              value={validationConfig.defaultKeys?.join(", ") || ""}
                              onChange={(e) => setValidationConfig(prev => ({
                                ...prev,
                                defaultKeys: e.target.value.split(",").map(k => k.trim()).filter(k => k)
                              }))}
                              placeholder="e.g., ID, PRIMARY_KEY"
                            />
                          </div>

                          <div>
                            <h4 className="font-medium">Matched Tables ({matchedTables.length})</h4>
                            <div className="max-h-60 overflow-y-auto space-y-2 mt-2">
                              {matchedTables.map((match, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center space-x-2">
                                    <TableIcon className="h-4 w-4" />
                                    <span className="font-medium">{match.source_table}</span>
                                    <ArrowRight className="h-3 w-3 text-gray-400" />
                                    <span>{match.target_table}</span>
                                    <Badge variant="outline">{match.match_type}</Badge>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Label className="text-xs">Keys:</Label>
                                    <Input
                                      className="w-32"
                                      value={match.primary_keys?.join(", ") || match.suggested_primary_keys?.join(", ") || ""}
                                      onChange={(e) => updateTableKeys(index, e.target.value.split(",").map(k => k.trim()).filter(k => k))}
                                      placeholder="Primary keys"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {isReadyForValidation() && (
              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep("execution")}>
                  Next: Execute Validation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Execution Tab */}
          <TabsContent value="execution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Play className="h-5 w-5" />
                  <span>Execute Validation</span>
                </CardTitle>
                <CardDescription>
                  Review your configuration and run the validation process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Configuration Summary */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Source Configuration</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Database: {sourceDB.db_type} ({sourceDB.host}:{sourceDB.port})</p>
                      <p>Schema: {validationConfig.sourceSchema}</p>
                      {validationConfig.comparisonType === "single" && (
                        <p>Table: {validationConfig.sourceTable}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Target Configuration</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Database: {targetDB.db_type} ({targetDB.host}:{targetDB.port})</p>
                      <p>Schema: {validationConfig.targetSchema}</p>
                      {validationConfig.comparisonType === "single" && (
                        <p>Table: {validationConfig.targetTable}</p>
                      )}
                    </div>
                  </div>
                </div>

                {validationConfig.comparisonType === "single" && (
                  <div>
                    <h4 className="font-medium mb-2">Validation Settings</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Primary Keys: {validationConfig.keys.join(", ")}</p>
                      {validationConfig.predicate && <p>WHERE Clause: {validationConfig.predicate}</p>}
                    </div>
                  </div>
                )}

                {validationConfig.comparisonType === "full" && (
                  <div>
                    <h4 className="font-medium mb-2">Schema Validation Settings</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Tables to validate: {matchedTables.length}</p>
                      <p>Default keys: {validationConfig.defaultKeys?.join(", ") || "Auto-detected"}</p>
                    </div>
                  </div>
                )}

                {/* Run Validation Button */}
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={runValidation}
                    disabled={isRunningValidation}
                    size="lg"
                    className="px-8"
                  >
                    {isRunningValidation ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Running Validation...
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        Run Validation
                      </>
                    )}
                  </Button>
                </div>

                {isRunningValidation && (
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-blue-800">
                      Validation is running. This may take several minutes depending on the data size.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab - DISPLAYS FORMATTED VALIDATION REPORT */}
          <TabsContent value="results" className="space-y-6">
            {validationResults ? (
              <div className="space-y-6">
                {/* Quick Summary */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-2xl font-bold">Validation Results</CardTitle>
                      <CardDescription>
                        Data validation completed for {validationResults.tables?.length || 0} tables
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => fetchFormattedReport()}
                        className="flex items-center space-x-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Refresh Detailed Report</span>
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => downloadReport()}
                        className="flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Report</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {validationResults.tables?.length || 0}
                        </div>
                        <p className="text-sm text-gray-600">Total Tables</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {validationResults.tables?.filter(t => t.hasDifferences).length || 0}
                        </div>
                        <p className="text-sm text-gray-600">Tables with Differences</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatNumber(validationResults.tables?.reduce((sum, t) => sum + t.sourceRows, 0) || 0)}
                        </div>
                        <p className="text-sm text-gray-600">Source Rows</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatNumber(validationResults.tables?.reduce((sum, t) => sum + t.targetRows, 0) || 0)}
                        </div>
                        <p className="text-sm text-gray-600">Target Rows</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Formatted Report Display */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>Detailed Validation Report</span>
                    </CardTitle>
                    <CardDescription>
                      Complete validation report with checksums, differences, and summary tables
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Status indicator */}
                      <div className={`p-4 rounded-lg border ${
                        formattedReport 
                          ? "bg-green-50 border-green-200" 
                          : "bg-blue-50 border-blue-200"
                      }`}>
                        <div className="flex items-center space-x-2">
                          {formattedReport ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="text-green-800 font-medium">
                                ✅ Complete Detailed Report Available
                              </span>
                            </>
                          ) : (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                              <span className="text-blue-800 font-medium">
                                🔄 Loading Detailed Validation Report...
                              </span>
                            </>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${
                          formattedReport ? "text-green-700" : "text-blue-700"
                        }`}>
                          {formattedReport 
                            ? "Including: Checksum comparison, Source/Target differences, Field mismatches, and Summary tables"
                            : "Report includes: Checksum timing, Source rows not in target, Target rows not in source, Field mismatches"
                          }
                        </p>
                      </div>

                      {/* Report display area */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[400px]">
                        {formattedReport ? (
                          <div className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-auto max-h-[500px] border-2 border-green-500">
                            <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                              {formattedReport}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <div className="text-6xl mb-4">📄</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              Detailed Report Loading...
                            </h3>
                            <p className="text-gray-600 mb-4">
                              The complete validation report with all sections is being prepared
                            </p>
                            <div className="flex justify-center space-x-2">
                              <Button 
                                variant="outline" 
                                onClick={() => fetchFormattedReport()}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Load Report Now
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => {
                                  console.log("🔍 Manual debug - checking report state:", formattedReport);
                                  alert(`Report state: ${formattedReport ? 'LOADED' : 'NOT LOADED'}`);
                                }}
                              >
                                Debug Status
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                          📄 Complete report with checksums, differences, and field mismatches
                        </p>
                        <div className="flex space-x-2">
                          {formattedReport && (
                            <Button 
                              variant="outline"
                              onClick={() => copyToClipboard(formattedReport)}
                              className="text-sm"
                            >
                              Copy Report
                            </Button>
                          )}
                          <Button 
                            variant="outline"
                            onClick={() => fetchFormattedReport()}
                            className="text-sm"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Refresh Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Table Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Table-by-Table Summary</CardTitle>
                    <CardDescription>
                      Quick overview of validation results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Table Name</TableHead>
                          <TableHead className="text-right">Source Rows</TableHead>
                          <TableHead className="text-right">Target Rows</TableHead>
                          <TableHead className="text-right">Missing in Target</TableHead>
                          <TableHead className="text-right">Missing in Source</TableHead>
                          <TableHead className="text-right">Field Mismatches</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationResults.tables?.map((table) => (
                          <TableRow key={table.tableName} className={table.hasDifferences ? "bg-red-50" : "bg-green-50"}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Database className="h-4 w-4 text-gray-500" />
                                <span>{table.tableName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(table.sourceRows)}</TableCell>
                            <TableCell className="text-right">{formatNumber(table.targetRows)}</TableCell>
                            <TableCell className="text-right">{getDifferencesBadge(table.rowsNotInTarget)}</TableCell>
                            <TableCell className="text-right">{getDifferencesBadge(table.rowsNotInSource)}</TableCell>
                            <TableCell className="text-right">{getDifferencesBadge(table.fieldsMismatch)}</TableCell>
                            <TableCell className="text-center">
                              {table.hasDifferences ? (
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Differences Found
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Match
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Success Message */}
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">
                        ✅ Validation complete! Report generated successfully.
                      </span>
                    </div>
                    {validationResults.run_id && (
                      <p className="text-sm text-green-700 mt-2">
                        Run ID: {validationResults.run_id}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center p-8">
                  <div className="text-center space-y-4">
                    <Database className="h-8 w-8 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="font-medium text-gray-900">No Validation Results</h3>
                      <p className="text-gray-600 mt-1">Run a validation to see results here.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DataValidation; 