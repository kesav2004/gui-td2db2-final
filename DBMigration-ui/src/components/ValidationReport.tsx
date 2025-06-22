import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, Clock, Database, Download, Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ValidationReportProps {
  runId?: string;
}

interface TableValidationResult {
  tableName: string;
  sourceRows: number;
  targetRows: number;
  sourceTime: string;
  targetTime: string;
  rowsNotInTarget: number;
  rowsNotInSource: number;
  fieldsMismatch: number;
  sourceNotInTargetRows?: any[];
  targetNotInSourceRows?: any[];
  fieldMismatchRows?: any[];
  hasDifferences: boolean;
}

interface ValidationSummary {
  total_tables: number;
  tables_with_differences: number;
  total_source_rows: number;
  total_target_rows: number;
  start_time?: string;
  end_time?: string;
}

interface ValidationReport {
  success: boolean;
  tables: TableValidationResult[];
  summary: ValidationSummary;
  run_id?: string;
  run_path?: string;
}

export function ValidationReport({ runId }: ValidationReportProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableDetails, setTableDetails] = useState<any>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const fetchValidationReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get detailed validation results first
      const detailedResponse = await fetch("/api/validation-results-detailed");
      
      if (detailedResponse.ok) {
        const detailedData = await detailedResponse.json();
        if (detailedData.success) {
          setReport(detailedData);
          return;
        }
      }
      
      // Fallback to regular validation report
      const response = await fetch("/api/validation-report");
      const data = await response.json();
      
      if (data.success && data.report) {
        // Transform the report data to match our interface
        const transformedReport: ValidationReport = {
          success: true,
          tables: data.report.consolidated_report?.tables?.map((table: any) => ({
            tableName: table.table_name,
            sourceRows: table.source_rows,
            targetRows: table.target_rows,
            sourceTime: "N/A",
            targetTime: "N/A",
            rowsNotInTarget: table.source_missing || 0,
            rowsNotInSource: table.target_missing || 0,
            fieldsMismatch: table.field_mismatches || 0,
            hasDifferences: (table.source_missing > 0 || table.target_missing > 0 || table.field_mismatches > 0)
          })) || [],
          summary: data.report.summary || {
            total_tables: 0,
            tables_with_differences: 0,
            total_source_rows: 0,
            total_target_rows: 0
          }
        };
        setReport(transformedReport);
      } else {
        setError(data.message || "Failed to load validation report");
      }
    } catch (err) {
      setError("Error loading validation report");
      console.error("Error fetching validation report:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableDetails = async (tableName: string) => {
    try {
      const encodedTableName = encodeURIComponent(tableName);
      const response = await fetch(`/api/validation-table-details/${encodedTableName}`);
      const data = await response.json();
      
      if (data.success) {
        setTableDetails(data);
      } else {
        toast.error("Failed to load table details", {
          description: data.message
        });
      }
    } catch (err) {
      toast.error("Error loading table details", {
        description: "An error occurred while fetching table details"
      });
    }
  };

  useEffect(() => {
    fetchValidationReport();
  }, [runId]);

  const handleTableToggle = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
      if (!tableDetails || tableDetails.table_name !== tableName) {
        fetchTableDetails(tableName);
      }
    }
    setExpandedTables(newExpanded);
  };

  const downloadReport = async () => {
    try {
      const response = await fetch("/api/download-report");
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'validation_report.log.gz';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("Report downloaded successfully");
      } else {
        toast.error("Failed to download report");
      }
    } catch (err) {
      toast.error("Error downloading report");
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getDifferencesBadge = (count: number) => {
    if (count === 0) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">0</Badge>;
    }
    return <Badge variant="destructive">{formatNumber(count)}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading validation report...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <div>
              <h3 className="font-medium text-gray-900">Error Loading Report</h3>
              <p className="text-gray-600 mt-1">{error}</p>
            </div>
            <Button onClick={fetchValidationReport} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report || !report.tables || report.tables.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Database className="h-8 w-8 text-gray-400 mx-auto" />
            <div>
              <h3 className="font-medium text-gray-900">No Validation Results</h3>
              <p className="text-gray-600 mt-1">No validation report has been generated yet.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Validation Report</CardTitle>
            <CardDescription>
              Data validation results for {report.summary?.total_tables || 0} tables
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button onClick={fetchValidationReport} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={downloadReport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(report.summary?.total_tables || 0)}
              </div>
              <p className="text-sm text-gray-600">Total Tables</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(report.summary?.tables_with_differences || 0)}
              </div>
              <p className="text-sm text-gray-600">Tables with Differences</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(report.summary?.total_source_rows || 0)}
              </div>
              <p className="text-sm text-gray-600">Source Rows</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatNumber(report.summary?.total_target_rows || 0)}
              </div>
              <p className="text-sm text-gray-600">Target Rows</p>
            </div>
          </div>
          
          {(report.summary?.start_time || report.summary?.end_time) && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                {report.summary.start_time && (
                  <span>Started: {new Date(report.summary.start_time).toLocaleString()}</span>
                )}
                {report.summary.end_time && (
                  <span>Ended: {new Date(report.summary.end_time).toLocaleString()}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tables Results */}
      <Card>
        <CardHeader>
          <CardTitle>Table-by-Table Results</CardTitle>
          <CardDescription>
            Detailed validation results for each table
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.tables.map((table) => (
                  <>
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
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTableToggle(table.tableName)}
                          disabled={!table.hasDifferences}
                        >
                          {expandedTables.has(table.tableName) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Eye className="h-4 w-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Table Details */}
                    {expandedTables.has(table.tableName) && (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0">
                          <div className="p-4 bg-gray-50 border-t">
                            <Tabs defaultValue="missing-target" className="w-full">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="missing-target">
                                  Missing in Target ({table.rowsNotInTarget})
                                </TabsTrigger>
                                <TabsTrigger value="missing-source">
                                  Missing in Source ({table.rowsNotInSource})
                                </TabsTrigger>
                                <TabsTrigger value="field-mismatches">
                                  Field Mismatches ({table.fieldsMismatch})
                                </TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="missing-target" className="mt-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Rows present in source but missing in target:</h4>
                                  {table.sourceNotInTargetRows && table.sourceNotInTargetRows.length > 0 ? (
                                    <div className="border rounded-lg overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            {Object.keys(table.sourceNotInTargetRows[0]).map((key) => (
                                              <TableHead key={key}>{key}</TableHead>
                                            ))}
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {table.sourceNotInTargetRows.slice(0, 5).map((row, idx) => (
                                            <TableRow key={idx}>
                                              {Object.values(row).map((value: any, valueIdx) => (
                                                <TableCell key={valueIdx} className="font-mono text-sm">
                                                  {String(value)}
                                                </TableCell>
                                              ))}
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                      {table.sourceNotInTargetRows.length > 5 && (
                                        <div className="p-2 text-sm text-gray-600 text-center border-t">
                                          Showing 5 of {table.rowsNotInTarget} rows
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-gray-600 italic">No sample data available</p>
                                  )}
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="missing-source" className="mt-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Rows present in target but missing in source:</h4>
                                  {table.targetNotInSourceRows && table.targetNotInSourceRows.length > 0 ? (
                                    <div className="border rounded-lg overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            {Object.keys(table.targetNotInSourceRows[0]).map((key) => (
                                              <TableHead key={key}>{key}</TableHead>
                                            ))}
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {table.targetNotInSourceRows.slice(0, 5).map((row, idx) => (
                                            <TableRow key={idx}>
                                              {Object.values(row).map((value: any, valueIdx) => (
                                                <TableCell key={valueIdx} className="font-mono text-sm">
                                                  {String(value)}
                                                </TableCell>
                                              ))}
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                      {table.targetNotInSourceRows.length > 5 && (
                                        <div className="p-2 text-sm text-gray-600 text-center border-t">
                                          Showing 5 of {table.rowsNotInSource} rows
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-gray-600 italic">No sample data available</p>
                                  )}
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="field-mismatches" className="mt-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Rows with field-level differences:</h4>
                                  {table.fieldMismatchRows && table.fieldMismatchRows.length > 0 ? (
                                    <div className="space-y-2">
                                      {table.fieldMismatchRows.slice(0, 5).map((mismatch, idx) => (
                                        <div key={idx} className="p-3 border rounded-lg bg-yellow-50">
                                          <pre className="text-sm font-mono text-gray-800">
                                            {typeof mismatch === 'string' ? mismatch : JSON.stringify(mismatch, null, 2)}
                                          </pre>
                                        </div>
                                      ))}
                                      {table.fieldMismatchRows.length > 5 && (
                                        <div className="p-2 text-sm text-gray-600 text-center">
                                          Showing 5 of {table.fieldsMismatch} mismatches
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-gray-600 italic">No sample data available</p>
                                  )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 