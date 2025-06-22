import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import CodeEditor from "@/components/migration/CodeEditor";
import { ValidationReport } from "@/components/ValidationReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download, AlertTriangle, CheckCircle, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { downloadSqlFile, convertSqlSyntax } from "@/services/databaseService";

const ConversionEditor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedScript, setSelectedScript] = useState<{
    id: string;
    name: string;
    content: string;
    sqlType?: "teradata" | "db2" | "other";
  } | null>(null);
  
  const [sourceCode, setSourceCode] = useState("");
  const [convertedCode, setConvertedCode] = useState("");
  const [validationRunId, setValidationRunId] = useState<string | undefined>();
  const [sourceSchema, setSourceSchema] = useState("");
  const [targetSchema, setTargetSchema] = useState("");
  const [sourceTable, setSourceTable] = useState("");
  const [targetTable, setTargetTable] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  
  const [conversionIssues, setConversionIssues] = useState<Array<{
    line: number;
    message: string;
    severity: 'warning' | 'error';
    solution?: string;
  }>>([]);
  
  // Load the selected script from session storage
  useEffect(() => {
    const storedScript = sessionStorage.getItem('selectedScript');
    if (storedScript) {
      try {
        const parsedScript = JSON.parse(storedScript);
        setSelectedScript(parsedScript);
        setSourceCode(parsedScript.content);
        
        // For demo purposes, if the script contains specific Teradata features, highlight them
        if (parsedScript.sqlType === 'teradata' || parsedScript.content?.toLowerCase().includes('sel ') || 
            parsedScript.content?.toLowerCase().includes('qualify')) {
          const issues = [];
          
          if (parsedScript.content?.toLowerCase().includes('qualify')) {
            issues.push({
              line: parsedScript.content.toLowerCase().split('\n').findIndex(line => 
                line.toLowerCase().includes('qualify')) + 1,
              message: "QUALIFY is not supported in IBM Db2 syntax",
              severity: "error" as const,
              solution: "Use subquery with ROW_NUMBER() function instead"
            });
          }
          
          if (parsedScript.content?.toLowerCase().includes('sel ')) {
            issues.push({
              line: parsedScript.content.toLowerCase().split('\n').findIndex(line => 
                line.toLowerCase().trim().startsWith('sel ')) + 1,
              message: "SEL abbreviation is not supported in Db2, use SELECT instead",
              severity: "warning" as const,
              solution: "Replace 'SEL' with 'SELECT'"
            });
          }
          
          if (parsedScript.content?.toLowerCase().includes('.')) {
            issues.push({
              line: parsedScript.content.toLowerCase().split('\n').findIndex(line => 
                line.toLowerCase().includes('.')) + 1,
              message: "Table references may require schema qualification in Db2",
              severity: "warning" as const,
              solution: "Check schema names in target database"
            });
          }
          
          setConversionIssues(issues);
        }
      } catch (error) {
        console.error("Error loading selected script:", error);
      }
    } else {
      // Default content if no script is selected
      setSourceCode(`-- Teradata sample query
SELECT 
  a.customer_id,
  a.customer_name,
  b.order_id,
  b.order_date,
  b.order_amount
FROM customer_db.customers a
INNER JOIN order_db.orders b
ON a.customer_id = b.customer_id
WHERE b.order_date BETWEEN DATE '2023-01-01' AND DATE '2023-12-31'
QUALIFY ROW_NUMBER() OVER (PARTITION BY a.customer_id ORDER BY b.order_date DESC) = 1;`);
    }
  }, []);

  const handleRunMigration = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate conversion process using the databaseService
      const result = await convertSqlSyntax(
        sourceCode,
        selectedScript?.sqlType === 'teradata' ? 'teradata' : 'other',
        'db2'
      );
      
      setConvertedCode(result.targetCode);
      setConversionIssues(result.issues);
      
      toast.success("Migration completed successfully", {
        description: `SQL conversion applied with ${result.warningCount} warnings and ${result.errorCount} errors`
      });
    } catch (error) {
      toast.error("Migration failed", {
        description: "An error occurred during SQL conversion"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDownload = () => {
    if (!convertedCode) {
      toast.error("No converted code available", {
        description: "Please run the migration process first"
      });
      return;
    }
    
    const fileName = selectedScript?.name 
      ? `${selectedScript.name.split('.')[0]}_db2.sql` 
      : "converted_script.sql";
      
    downloadSqlFile(convertedCode, fileName);
    
    toast.success("Download started", {
      description: "Your converted SQL script is being downloaded"
    });
  };

  const handleRunValidation = async () => {
    setIsProcessing(true);
    
    try {
      // Get the actual configuration from your form or state
      const config = {
        sourceSchema: sourceSchema,
        targetSchema: targetSchema,
        sourceTable: sourceTable,
        targetTable: targetTable,
        keys: selectedKeys,
        // ... other configuration
      };
      
      // Call the validation API
      const response = await fetch('/api/run-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      
      if (data.success) {
        setValidationRunId(data.runId);
        toast.success("Validation completed", {
          description: "View the validation report for details"
        });
      } else {
        toast.error("Validation failed", {
          description: data.message || "An error occurred during validation"
        });
      }
    } catch (error) {
      toast.error("Validation failed", {
        description: "An error occurred while running the validation"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-medium text-carbon-gray-100">SQL Conversion</h1>
            <p className="text-carbon-gray-70 mt-1">
              {selectedScript 
                ? `Converting: ${selectedScript.name}`
                : "View and edit your converted SQL code"}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              className="carbon-button-secondary"
              disabled={!convertedCode}
              onClick={handleDownload}
            >
              <Download size={16} className="mr-2" />
              Download Scripts
            </Button>
            
            <Button 
              className="carbon-button-primary"
              disabled={isProcessing || !sourceCode}
              onClick={handleRunMigration}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Run Migration
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </Button>

            <Button
              className="carbon-button-primary"
              disabled={isProcessing || !convertedCode}
              onClick={handleRunValidation}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Running Validation...
                </>
              ) : (
                <>
                  Run Validation
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
        
        {selectedScript?.sqlType === 'teradata' && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 flex items-start gap-3">
            <Info size={20} className="text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-800">Teradata SQL Detected</h3>
              <p className="text-gray-600 mt-1">
                This script has been identified as Teradata SQL. The parser will convert Teradata-specific 
                syntax to IBM Db2 compatible SQL.
              </p>
            </div>
          </div>
        )}
        
        <Tabs defaultValue="editor">
          <TabsList className="carbon-tabs border-none">
            <TabsTrigger value="editor" className="carbon-tab-selected">
              Code Editor
            </TabsTrigger>
            <TabsTrigger value="validation" className="carbon-tab-selected">
              Validation Report
            </TabsTrigger>
            {/* <TabsTrigger value="visual" className="carbon-tab-unselected">
              Visual Comparison
            </TabsTrigger> */}
          </TabsList>
          
          <TabsContent value="editor" className="pt-4">
            <CodeEditor 
              sourceCode={sourceCode} 
              targetCode={convertedCode}
              errors={conversionIssues}
              onSourceChange={setSourceCode}
            />
          </TabsContent>
          
          <TabsContent value="issues" className="pt-4">
            <div className="border border-carbon-gray-20">
              <div className="border-b border-carbon-gray-20 bg-carbon-gray-10 px-4 py-3">
                <h3 className="font-medium">Conversion Issues</h3>
              </div>
              <div className="divide-y divide-carbon-gray-20">
                {conversionIssues.map((issue, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-start">
                      <div className={`w-2 h-2 rounded-full mt-1.5 mr-2 ${
                        issue.severity === 'error' ? 'bg-carbon-error' : 'bg-carbon-warning'
                      }`}></div>
                      <div>
                        <p className="font-medium">
                          {issue.severity === 'error' ? 'Error' : 'Warning'} at line {issue.line}
                        </p>
                        <p className="text-carbon-gray-70 mt-1">{issue.message}</p>
                        {issue.solution && (
                          <p className="text-carbon-blue mt-1 text-sm">
                            Suggested solution: {issue.solution}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {(!conversionIssues || conversionIssues.length === 0) && (
                  <div className="p-6 text-center text-carbon-gray-70">
                    <p>No issues found in your SQL conversion</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="visual" className="pt-4">
            <div className="border border-carbon-gray-20 p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Teradata (Source)</h3>
                  <div className="border border-carbon-gray-20 p-3 bg-carbon-gray-10 font-mono text-sm whitespace-pre-line">
                    {sourceCode || `SELECT 
  a.customer_id,
  a.customer_name,
  b.order_id,
  b.order_date,
  b.order_amount
FROM customer_db.customers a
INNER JOIN order_db.orders b
ON a.customer_id = b.customer_id
WHERE b.order_date BETWEEN DATE '2023-01-01' AND DATE '2023-12-31'
QUALIFY ROW_NUMBER() OVER (PARTITION BY a.customer_id ORDER BY b.order_date DESC) = 1;`}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-3">IBM Db2 (Target)</h3>
                  <div className="border border-carbon-gray-20 p-3 bg-carbon-gray-10 font-mono text-sm whitespace-pre-line">
                    {convertedCode || `SELECT 
  a.customer_id,
  a.customer_name,
  b.order_id,
  b.order_date,
  b.order_amount
FROM customer_db.customers a
INNER JOIN order_db.orders b
ON a.customer_id = b.customer_id
WHERE b.order_date BETWEEN DATE('2023-01-01') AND DATE('2023-12-31')
AND (
  SELECT COUNT(*) 
  FROM order_db.orders b2 
  WHERE b2.customer_id = a.customer_id 
  AND (b2.order_date {'>'} b.order_date OR 
      (b2.order_date = b.order_date AND b2.order_id {'>'} b.order_id))
) = 0;`}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-medium mb-3">Key Differences</h3>
                <ul className="list-disc list-inside space-y-2 text-carbon-gray-80">
                  <li>DATE literal syntax changed from <code>DATE '2023-01-01'</code> to <code>DATE('2023-01-01')</code></li>
                  <li>QUALIFY with ROW_NUMBER() replaced with equivalent subquery logic</li>
                  <li>Table schema references maintained for compatibility</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ConversionEditor;