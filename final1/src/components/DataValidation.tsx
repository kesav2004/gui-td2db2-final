import React, { useState, useEffect } from 'react';
import {
  Grid,
  Column,
  Button,
  TextInput,
  Tile,
  Select,
  SelectItem,
  Toggle,
  Loading,
  Tag,
  MultiSelect,
  RadioButton,
  RadioButtonGroup,
  FileUploader,
  NumberInput,
  InlineNotification,
} from '@carbon/react';

interface DataValidationProps {
  onNavigate: (page: string) => void;
  onCompareData?: () => void;
  workspaceData?: {
    name: string;
    description: string;
  };
}

const DataValidation: React.FC<DataValidationProps> = ({ onNavigate, onCompareData, workspaceData }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Source, 2: Target, 3: Comparison
  const [isSourceConnected, setIsSourceConnected] = useState(false);
  const [isTargetConnected, setIsTargetConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonType, setComparisonType] = useState('single');
  const [columnSelectionType, setColumnSelectionType] = useState('');

  // Dynamic schema and table states
  const [sourceSchemas, setSourceSchemas] = useState<string[]>([]);
  const [targetSchemas, setTargetSchemas] = useState<string[]>([]);
  const [sourceTables, setSourceTables] = useState<string[]>([]);
  const [targetTables, setTargetTables] = useState<string[]>([]);

  const [schemaError, setSchemaError] = useState<{ source?: string; target?: string }>({});
  const [tableError, setTableError] = useState<{ source?: string; target?: string }>({});

  const [reportContent, setReportContent] = useState<string>('');
  const [showReport, setShowReport] = useState(false);
  const [formattedReportContent, setFormattedReportContent] = useState<string>('');
  const [showFormattedReport, setShowFormattedReport] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [sourceSchema, setSourceSchema] = useState("");
  const [sourceTable, setSourceTable] = useState("");
  const [targetSchema, setTargetSchema] = useState("");
  const [targetTable, setTargetTable] = useState("");
  const [keys, setKeys] = useState([]);
  const [predicate, setPredicate] = useState("");
  const [includeFields, setIncludeFields] = useState([]);
  const [groupByFields, setGroupByFields] = useState([]);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    sourceDatabaseType: '',
    sourceHost: '',
    sourcePort: '',
    sourceUsername: '',
    sourcePassword: '',
    sourceDatabaseName: '',
    sourceUrl: '',
    sourceSchema: '',
    sourceTable: '',
    sourceFile: null,
    targetDatabaseType: '',
    targetHost: '',
    targetPort: '',
    targetUsername: '',
    targetPassword: '',
    targetDatabaseName: '',
    targetUrl: '',
    targetSchema: '',
    targetTable: '',
    targetFile: null,
    keys: '',
    predicate: '',
    groupby: '',
    includeColumns: [],
    excludeColumns: [],
    enableChecksum: false,
    checksumType: 'SHA2',
    enableRowCount: false,
  });
  
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const [errors, setErrors] = useState<{ source?: string; target?: string }>({});

  // Load schemas after source connection
  useEffect(() => {
    const fetchColumns = async () => {
      if (!formData.sourceSchema || !formData.sourceTable || comparisonType !== 'single') return;
      try {
        const res = await fetch("http://localhost:5000/api/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            db_type: formData.sourceDatabaseType,
            host: formData.sourceHost,
            port: formData.sourcePort,
            username: formData.sourceUsername,
            password: formData.sourcePassword,
            database: formData.sourceDatabaseName,
            schema: formData.sourceSchema,
            table: formData.sourceTable
          })
        });
        const result = await res.json();
        if (res.ok && result.columns) {
          setColumnOptions(result.columns.map((col: string) => ({ id: col, text: col })));
        } else {
          setColumnOptions([]);
        }
      } catch {
        setColumnOptions([]);
      }
    };

    fetchColumns();
  }, [formData.sourceSchema, formData.sourceTable, comparisonType]);


  useEffect(() => {
    const fetchSourceSchemas = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/schemas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            db_type: formData.sourceDatabaseType,
            host: formData.sourceHost,
            port: formData.sourcePort,
            username: formData.sourceUsername,
            password: formData.sourcePassword,
            database: formData.sourceDatabaseName,
          }),
        });
        const result = await res.json();
        if (res.ok && result.schemas) {
          setSourceSchemas(result.schemas);
          setSchemaError(prev => ({ ...prev, source: undefined }));
        } else {
          setSchemaError(prev => ({ ...prev, source: result.message || 'Failed to load schemas' }));
          setSourceSchemas([]);
        }
      } catch (error) {
        setSchemaError(prev => ({ ...prev, source: 'Could not load schemas from backend' }));
        setSourceSchemas([]);
      }
    };

    if (isSourceConnected) fetchSourceSchemas();
  }, [isSourceConnected, formData.sourceDatabaseType, formData.sourceHost, formData.sourcePort, formData.sourceUsername, formData.sourcePassword, formData.sourceDatabaseName]);

  // Load schemas after target connection
  useEffect(() => {
    const fetchTargetSchemas = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/schemas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            db_type: formData.targetDatabaseType,
            host: formData.targetHost,
            port: formData.targetPort,
            username: formData.targetUsername,
            password: formData.targetPassword,
            database: formData.targetDatabaseName,
          }),
        });
        const result = await res.json();
        if (res.ok && result.schemas) {
          setTargetSchemas(result.schemas);
          setSchemaError(prev => ({ ...prev, target: undefined }));
        } else {
          setSchemaError(prev => ({ ...prev, target: result.message || 'Failed to load schemas' }));
          setTargetSchemas([]);
        }
      } catch (error) {
        setSchemaError(prev => ({ ...prev, target: 'Could not load schemas from backend' }));
        setTargetSchemas([]);
      }
    };

    if (isTargetConnected) fetchTargetSchemas();
  }, [isTargetConnected, formData.targetDatabaseType, formData.targetHost, formData.targetPort, formData.targetUsername, formData.targetPassword, formData.targetDatabaseName]);

  // Load source tables after schema selection
  useEffect(() => {
    const fetchSourceTables = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            db_type: formData.sourceDatabaseType,
            host: formData.sourceHost,
            port: formData.sourcePort,
            username: formData.sourceUsername,
            password: formData.sourcePassword,
            database: formData.sourceDatabaseName,
            schema: formData.sourceSchema,
          }),
        });
        const result = await res.json();
        if (res.ok && result.tables) {
          setSourceTables(result.tables);
          setTableError(prev => ({ ...prev, source: undefined }));
        } else {
          setTableError(prev => ({ ...prev, source: result.message || 'Failed to load tables' }));
          setSourceTables([]);
        }
      } catch (error) {
        setTableError(prev => ({ ...prev, source: 'Could not load tables from backend' }));
        setSourceTables([]);
      }
    };

    if (formData.sourceSchema && isSourceConnected) {
      fetchSourceTables();
      // Reset selected table when schema changes
      setFormData(prev => ({ ...prev, sourceTable: '' }));
    }
  }, [formData.sourceSchema, isSourceConnected]);

  // Load target tables after schema selection
  useEffect(() => {
    const fetchTargetTables = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            db_type: formData.targetDatabaseType,
            host: formData.targetHost,
            port: formData.targetPort,
            username: formData.targetUsername,
            password: formData.targetPassword,
            database: formData.targetDatabaseName,
            schema: formData.targetSchema,
          }),
        });
        const result = await res.json();
        if (res.ok && result.tables) {
          setTargetTables(result.tables);
          setTableError(prev => ({ ...prev, target: undefined }));
        } else {
          setTableError(prev => ({ ...prev, target: result.message || 'Failed to load tables' }));
          setTargetTables([]);
        }
      } catch (error) {
        setTableError(prev => ({ ...prev, target: 'Could not load tables from backend' }));
        setTargetTables([]);
      }
    };

    if (formData.targetSchema && isTargetConnected) {
      fetchTargetTables();
      // Reset selected table when schema changes
      setFormData(prev => ({ ...prev, targetTable: '' }));
    }
  }, [formData.targetSchema, isTargetConnected]);

  const renderColumnSelection = () => {
    if (comparisonType !== 'single') return null;
    return (
      <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
          Column Selection
        </h3>
        <Grid>
          <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
            <Select
              id="column-selection-type"
              labelText="Column Selection Type"
              value={columnSelectionType}
              onChange={(e) => {
                const value = (e.target as HTMLSelectElement).value;
                setColumnSelectionType(value);
                handleInputChange('includeColumns', []);
                handleInputChange('excludeColumns', []);
              }}
            >
              <SelectItem value="" text="Select Option" />
              <SelectItem value="include" text="Include Columns" />
              <SelectItem value="exclude" text="Exclude Columns" />
            </Select>
          </Column>
          {columnSelectionType === 'include' && (
            <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
              <MultiSelect
                id="include-columns"
                titleText="Include Columns"
                label="Select columns to include"
                items={columnOptions}
                itemToString={(item) => (item ? item.text : '')}
                onChange={({ selectedItems }) =>
                  handleInputChange('includeColumns', selectedItems.map(item => item.id))
                }
              />
            </Column>
          )}
          {columnSelectionType === 'exclude' && (
            <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
              <MultiSelect
                id="exclude-columns"
                titleText="Exclude Columns"
                label="Select columns to exclude"
                items={columnOptions}
                itemToString={(item) => (item ? item.text : '')}
                onChange={({ selectedItems }) =>
                  handleInputChange('excludeColumns', selectedItems.map(item => item.id))
                }
              />
            </Column>
          )}
        </Grid>
      </Tile>
    );
  };

  const handleViewReport = async () => {
    setIsLoadingReport(true);
    try {
      // First try to get the formatted report
      const formattedResponse = await fetch('http://localhost:5000/api/formatted-validation-report');
      if (formattedResponse.ok) {
        const formattedResult = await formattedResponse.json();
        if (formattedResult.success && formattedResult.report) {
          setFormattedReportContent(formattedResult.report);
          setShowFormattedReport(true);
          setIsLoadingReport(false);
          return;
        }
      }

      // Fallback to original report endpoint
      const response = await fetch('http://localhost:5000/api/report');
      const result = await response.json();
      if (response.ok && result.report) {
        setReportContent(result.report);
        setShowReport(true);
      } else {
        setReportContent('No report found or error fetching report.');
        setShowReport(true);
      }
    } catch (err) {
      setReportContent('Failed to load report.');
      setShowReport(true);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(formattedReportContent);
      alert('✅ Report copied to clipboard!');
    } catch (err) {
      alert('❌ Failed to copy report to clipboard');
    }
  };

  const handleDownloadFormattedReport = () => {
    const blob = new Blob([formattedReportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation_report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };
  
  const handleSourceConnection = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      const response = await fetch('http://localhost:5000/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          db_type: formData.sourceDatabaseType,
          host: formData.sourceHost,
          port: formData.sourcePort,
          username: formData.sourceUsername,
          password: formData.sourcePassword,
          database: formData.sourceDatabaseName
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setIsSourceConnected(true);
        setCurrentStep(2);
      } else {
        setErrors(prev => ({ ...prev, source: result.message || 'Source connection failed.' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, source: 'Could not connect to backend.' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTargetConnection = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      const response = await fetch('http://localhost:5000/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          db_type: formData.targetDatabaseType,
          host: formData.targetHost,
          port: formData.targetPort,
          username: formData.targetUsername,
          password: formData.targetPassword,
          database: formData.targetDatabaseName
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setIsTargetConnected(true);
        setCurrentStep(3);
      } else {
        setErrors(prev => ({ ...prev, target: result.message || 'Target connection failed.' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, target: 'Could not connect to backend.' }));
    } finally {
      setIsLoading(false);
    }
  };

  const databaseTypeOptions = [
    { id: '', text: 'Select Option' },
    { id: 'teradata', text: 'Teradata' },
    { id: 'db2', text: 'DB2' },
    { id: 'sqlserver', text: 'SQL Server' },
    { id: 'mysql', text: 'MySQL' },
  ];

  const payload = {
    sourceSchema: formData.sourceSchema,
    targetSchema: formData.targetSchema,
    sourceTable: formData.sourceTable,
    targetTable: formData.targetTable,
    includeColumns: formData.includeColumns,
    excludeColumns: formData.excludeColumns,
    keys: formData.keys.split(',').map((k) => k.trim()),
    predicate: formData.predicate,
    groupby: formData.groupby.split(',').map((g) => g.trim()),
    comparisonType,
    source_db: {
      db_type: formData.sourceDatabaseType,
      host: formData.sourceHost,
      port: formData.sourcePort,
      username: formData.sourceUsername,
      password: formData.sourcePassword,
      database: formData.sourceDatabaseName
    },
    target_db: {
      db_type: formData.targetDatabaseType,
      host: formData.targetHost,
      port: formData.targetPort,
      username: formData.targetUsername,
      password: formData.targetPassword,
      database: formData.targetDatabaseName
    }
  };

  const [columnOptions, setColumnOptions] = useState<{ id: string; text: string }[]>([]);

  const columnSelectionOptions = [
    { id: '', text: 'Select Option' },
    { id: 'include', text: 'Include Columns' },
    { id: 'exclude', text: 'Exclude Columns' },
  ];

  const renderSourceTable = () => (
    <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="cds--productive-heading-04">
          Source Database Connection
        </h3>
        {isSourceConnected && (
          <Tag type="green">Connected</Tag>
        )}
      </div>

      {errors.source && (
        <InlineNotification
          kind="error"
          title="Connection Error"
          subtitle={errors.source}
          style={{ marginBottom: '1rem' }}
        />
      )}

      <Grid>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <Select
            id="source-database-type"
            labelText="Database Type"
            value={formData.sourceDatabaseType}
            onChange={(e) => handleInputChange('sourceDatabaseType', (e.target as HTMLSelectElement).value)}
            disabled={isSourceConnected}
          >
            {databaseTypeOptions.map(option => (
              <SelectItem key={option.id} value={option.id} text={option.text} />
            ))}
          </Select>
        </Column>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <TextInput
            id="source-host"
            labelText="Host/Server"
            value={formData.sourceHost}
            onChange={(e) => handleInputChange('sourceHost', e.target.value)}
            disabled={isSourceConnected}
          />
        </Column>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <TextInput
            id="source-port"
            labelText="Port"
            value={formData.sourcePort}
            onChange={(e) => handleInputChange('sourcePort', e.target.value)}
            disabled={isSourceConnected}
          />
        </Column>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <TextInput
            id="source-database-name"
            labelText="Database Name"
            value={formData.sourceDatabaseName}
            onChange={(e) => handleInputChange('sourceDatabaseName', e.target.value)}
            disabled={isSourceConnected}
          />
        </Column>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <TextInput
            id="source-username"
            labelText="Username"
            value={formData.sourceUsername}
            onChange={(e) => handleInputChange('sourceUsername', e.target.value)}
            disabled={isSourceConnected}
          />
        </Column>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <TextInput
            id="source-password"
            labelText="Password"
            type="password"
            value={formData.sourcePassword}
            onChange={(e) => handleInputChange('sourcePassword', e.target.value)}
            disabled={isSourceConnected}
          />
        </Column>
      </Grid>

      {!isSourceConnected && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Button
            kind="primary"
            onClick={handleSourceConnection}
            disabled={isLoading || !formData.sourceDatabaseType || !formData.sourceHost}
          >
            {isLoading ? 'Connecting...' : 'Connect to Source'}
          </Button>
        </div>
      )}
    </Tile>
  );

  const renderTargetTable = () => (
    <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="cds--productive-heading-04">
          Target Database Connection
        </h3>
        {isTargetConnected && (
          <Tag type="green">Connected</Tag>
        )}
      </div>

      {errors.target && (
        <InlineNotification
          kind="error"
          title="Connection Error"
          subtitle={errors.target}
          style={{ marginBottom: '1rem' }}
        />
      )}

      <Grid>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <Select
            id="target-database-type"
            labelText="Database Type"
            value={formData.targetDatabaseType}
            onChange={(e) => handleInputChange('targetDatabaseType', (e.target as HTMLSelectElement).value)}
            disabled={isTargetConnected}
          >
            {databaseTypeOptions.map(option => (
              <SelectItem key={option.id} value={option.id} text={option.text} />
            ))}
          </Select>
        </Column>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <TextInput
            id="target-host"
            labelText="Host/Server"
            value={formData.targetHost}
            onChange={(e) => handleInputChange('targetHost', e.target.value)}
            disabled={isTargetConnected}
          />
        </Column>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <TextInput
            id="target-port"
            labelText="Port"
            value={formData.targetPort}
            onChange={(e) => handleInputChange('targetPort', e.target.value)}
            disabled={isTargetConnected}
          />
        </Column>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <TextInput
            id="target-database-name"
            labelText="Database Name"
            value={formData.targetDatabaseName}
            onChange={(e) => handleInputChange('targetDatabaseName', e.target.value)}
            disabled={isTargetConnected}
          />
        </Column>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <TextInput
            id="target-username"
            labelText="Username"
            value={formData.targetUsername}
            onChange={(e) => handleInputChange('targetUsername', e.target.value)}
            disabled={isTargetConnected}
          />
        </Column>
        <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
          <TextInput
            id="target-password"
            labelText="Password"
            type="password"
            value={formData.targetPassword}
            onChange={(e) => handleInputChange('targetPassword', e.target.value)}
            disabled={isTargetConnected}
          />
        </Column>
      </Grid>

      {!isTargetConnected && currentStep >= 2 && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Button
            kind="primary"
            onClick={handleTargetConnection}
            disabled={isLoading || !formData.targetDatabaseType || !formData.targetHost}
          >
            {isLoading ? 'Connecting...' : 'Connect to Target'}
          </Button>
        </div>
      )}
    </Tile>
  );

  const handleCompareData = async () => {
    const payload = {
      sourceSchema: formData.sourceSchema,
      targetSchema: formData.targetSchema,
      sourceTable: formData.sourceTable,
      targetTable: formData.targetTable,
      includeColumns: formData.includeColumns,
      excludeColumns: formData.excludeColumns,
      keys: formData.keys.split(',').map((k) => k.trim()),
      predicate: formData.predicate,
      groupby: formData.groupby.split(',').map((g) => g.trim()),
      comparisonType,
      source_db: {
        db_type: formData.sourceDatabaseType,
        host: formData.sourceHost,
        port: formData.sourcePort,
        username: formData.sourceUsername,
        password: formData.sourcePassword,
        database: formData.sourceDatabaseName
      },
      target_db: {
        db_type: formData.targetDatabaseType,
        host: formData.targetHost,
        port: formData.targetPort,
        username: formData.targetUsername,
        password: formData.targetPassword,
        database: formData.targetDatabaseName
      }
    };

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/run-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        if (result.results) {
          setValidationResults(result.results);
          setShowResults(true);
        } else if (result.tables) {
          // Handle the new detailed validation results format
          const formattedResults = {
            summary: {
              total_tables: result.tables.length,
              total_mismatches: result.tables.filter(t => t.hasDifferences).length,
              total_source_rows: result.tables.reduce((sum, t) => sum + t.sourceRows, 0),
              total_target_rows: result.tables.reduce((sum, t) => sum + t.targetRows, 0)
            },
            tables: result.tables,
            row_counts: result.tables.reduce((acc, table) => {
              acc[table.tableName] = {
                source_rows: table.sourceRows,
                target_rows: table.targetRows,
                source_diff: table.rowsNotInTarget,
                target_diff: table.rowsNotInSource,
                field_mismatch: table.fieldsMismatch
              };
              return acc;
            }, {}),
            mismatches: [],
            job_info: result.summary || {}
          };
          setValidationResults(formattedResults);
          setShowResults(true);
        } else if (result.report_file) {
          alert(`✅ Validation complete!\nReport: ${result.report_file}`);
          window.open(`http://localhost:5000/${result.report_file}`, '_blank');
        } else {
          // Handle case where validation completed but no specific report format
          alert(`✅ Validation completed successfully!\nProcessed ${result.run_id ? 'Run ID: ' + result.run_id : 'validation request'}`);
          
          // Try to fetch the latest validation results and formatted report
          setTimeout(async () => {
            try {
              const reportResponse = await fetch("http://localhost:5000/api/validation-results-detailed");
              if (reportResponse.ok) {
                const reportData = await reportResponse.json();
                if (reportData.success && reportData.tables) {
                  const formattedResults = {
                    summary: {
                      total_tables: reportData.tables.length,
                      total_mismatches: reportData.tables.filter(t => t.hasDifferences).length,
                      total_source_rows: reportData.tables.reduce((sum, t) => sum + t.sourceRows, 0),
                      total_target_rows: reportData.tables.reduce((sum, t) => sum + t.targetRows, 0)
                    },
                    tables: reportData.tables,
                    row_counts: reportData.tables.reduce((acc, table) => {
                      acc[table.tableName] = {
                        source_rows: table.sourceRows,
                        target_rows: table.targetRows,
                        source_diff: table.rowsNotInTarget,
                        target_diff: table.rowsNotInSource,
                        field_mismatch: table.fieldsMismatch
                      };
                      return acc;
                    }, {}),
                    mismatches: [],
                    job_info: reportData.summary || {}
                  };
                  setValidationResults(formattedResults);
                  setShowResults(true);
                }
              }

              // Also try to pre-load the formatted report
              try {
                const formattedResponse = await fetch('http://localhost:5000/api/formatted-validation-report');
                if (formattedResponse.ok) {
                  const formattedResult = await formattedResponse.json();
                  if (formattedResult.success && formattedResult.report) {
                    setFormattedReportContent(formattedResult.report);
                  }
                }
              } catch (error) {
                console.log("Could not pre-load formatted report:", error);
              }
            } catch (error) {
              console.log("Could not fetch detailed results:", error);
            }
          }, 2000);
        }
      } else {
        alert(`❌ Failed: ${result.message}`);
      }
    } catch (err) {
      alert("❌ Error contacting backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderValidationResults = () => {
    if (!showResults || !validationResults) return null;

    const { summary, tables, mismatches, row_counts, job_info } = validationResults;

    return (
      <div style={{ marginTop: '2rem' }}>
        <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="cds--productive-heading-05">Validation Results</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button kind="secondary" onClick={() => setShowResults(false)}>
                Close Results
              </Button>
              <Button kind="primary" onClick={handleViewReport} disabled={isLoadingReport}>
                {isLoadingReport ? 'Loading Report...' : 'View Full Report'}
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <Grid style={{ marginBottom: '2rem' }}>
            <Column lg={4} md={4} sm={4}>
              <Tile style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#e8f5e8' }}>
                <h3 className="cds--productive-heading-03">{summary.total_tables || 0}</h3>
                <p className="cds--body-short-01">Tables Validated</p>
              </Tile>
            </Column>
            <Column lg={4} md={4} sm={4}>
              <Tile style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: summary.total_mismatches > 0 ? '#fff8e6' : '#e8f5e8' }}>
                <h3 className="cds--productive-heading-03">{summary.total_mismatches || 0}</h3>
                <p className="cds--body-short-01">Mismatches Found</p>
              </Tile>
            </Column>
            <Column lg={4} md={4} sm={4}>
              <Tile style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#e5f6ff' }}>
                <h3 className="cds--productive-heading-03">{summary.total_source_rows || 0}</h3>
                <p className="cds--body-short-01">Total Source Rows</p>
              </Tile>
            </Column>
          </Grid>

          {/* Job Information */}
          {job_info && (job_info.start_time || job_info.end_time) && (
            <Tile style={{ padding: '1.5rem', marginBottom: '2rem', backgroundColor: '#f4f4f4' }}>
              <h4 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>Job Information</h4>
              <Grid>
                {job_info.start_time && (
                  <Column lg={8} md={4} sm={4}>
                    <p><strong>Start Time:</strong> {job_info.start_time}</p>
                  </Column>
                )}
                {job_info.end_time && (
                  <Column lg={8} md={4} sm={4}>
                    <p><strong>End Time:</strong> {job_info.end_time}</p>
                  </Column>
                )}
              </Grid>
            </Tile>
          )}

          {/* Table Details */}
          {Object.keys(row_counts).length > 0 && (
            <Tile style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h4 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>Table Comparison Summary</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="cds--data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th>Source Rows</th>
                      <th>Target Rows</th>
                      <th>Source Diff</th>
                      <th>Target Diff</th>
                      <th>Field Mismatches</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(row_counts).map(([tableName, counts]: [string, any]) => (
                      <tr key={tableName}>
                        <td>{tableName}</td>
                        <td>{counts.source_rows}</td>
                        <td>{counts.target_rows}</td>
                        <td>{counts.source_diff}</td>
                        <td>{counts.target_diff}</td>
                        <td>{counts.field_mismatch}</td>
                        <td>
                          {counts.field_mismatch === 0 && counts.source_diff === 0 && counts.target_diff === 0 ? (
                            <Tag type="green">Match</Tag>
                          ) : (
                            <Tag type="red">Mismatch</Tag>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tile>
          )}

          {/* Checksums */}
          {tables && tables.length > 0 && (
            <Tile style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h4 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>Checksum Comparison</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="cds--data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th>Source Checksum</th>
                      <th>Target Checksum</th>
                      <th>Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((table, index) => (
                      <tr key={index}>
                        <td>{table.name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{table.checksum_source}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{table.checksum_target}</td>
                        <td>
                          {table.checksum_source === table.checksum_target ? (
                            <Tag type="green">Match</Tag>
                          ) : (
                            <Tag type="red">Mismatch</Tag>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tile>
          )}

          {/* Mismatches Details */}
          {mismatches && mismatches.length > 0 && (
            <Tile style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h4 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>Field Mismatches</h4>
              <p style={{ marginBottom: '1rem', color: '#6f6f6f' }}>
                Showing {Math.min(mismatches.length, 10)} of {mismatches.length} mismatches
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table className="cds--data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th>Employee ID</th>
                      <th>Field Differences</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mismatches.slice(0, 10).map((mismatch, index) => (
                      <tr key={index}>
                        <td>{mismatch.table}</td>
                        <td>{mismatch.empno}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '400px', wordWrap: 'break-word' }}>
                          {mismatch.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mismatches.length > 10 && (
                <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <Button kind="ghost" onClick={handleViewReport}>
                    View All {mismatches.length} Mismatches in Full Report
                  </Button>
                </p>
              )}
            </Tile>
          )}
        </Tile>
      </div>
    );
  };

  const renderComparisonOptions = () => {
    return (
      <div>
        {/* Step 1: Comparison Type Selection */}
        <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
            Comparison Type
          </h3>
          <RadioButtonGroup
            legendText="Select comparison type"
            name="comparison-type"
            value={comparisonType}
            onChange={(value) => {
              setComparisonType(value as string);
              setFormData(prev => ({
                ...prev,
                sourceSchema: '',
                targetSchema: '',
                sourceTable: '',
                targetTable: '',
                includeColumns: [],
                excludeColumns: []
              }));
            }}
          >
            <RadioButton labelText="Single Table" value="single" id="single" />
            <RadioButton labelText="Full Schema" value="full" id="full" />
          </RadioButtonGroup>
        </Tile>

        {/* Step 2: Schema Selection */}
        {comparisonType && (
          <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
              Select Schemas
            </h3>

            {schemaError.source && (
              <InlineNotification
                kind="error"
                title="Source Schema Error"
                subtitle={schemaError.source}
                style={{ marginBottom: '1rem' }}
              />
            )}

            {schemaError.target && (
              <InlineNotification
                kind="error"
                title="Target Schema Error"
                subtitle={schemaError.target}
                style={{ marginBottom: '1rem' }}
              />
            )}

            <Grid>
              <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                <Select
                  id="source-schema"
                  labelText="Source Schema"
                  value={formData.sourceSchema}
                  onChange={(e) => handleInputChange('sourceSchema', e.target.value)}
                >
                  <SelectItem value="" text="Select Schema" />
                  {sourceSchemas.map(schema => (
                    <SelectItem key={schema} value={schema} text={schema} />
                  ))}
                </Select>
              </Column>
              <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                <Select
                  id="target-schema"
                  labelText="Target Schema"
                  value={formData.targetSchema}
                  onChange={(e) => handleInputChange('targetSchema', e.target.value)}
                >
                  <SelectItem value="" text="Select Schema" />
                  {targetSchemas.map(schema => (
                    <SelectItem key={schema} value={schema} text={schema} />
                  ))}
                </Select>
              </Column>
            </Grid>
          </Tile>
        )}
        {/* Additional Inputs for Keys, Predicate, GroupBy */}
        <Grid>
          <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
            <TextInput
              id="keys"
              labelText="Keys (comma-separated)"
              placeholder="e.g. id,account_id"
              value={formData.keys}
              onChange={(e) => handleInputChange("keys", e.target.value)}
            />
          </Column>

          <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
            <TextInput
              id="predicate"
              labelText="Predicate (optional)"
              placeholder="e.g. REGION = 'Europe'"
              value={formData.predicate}
              onChange={(e) => handleInputChange("predicate", e.target.value)}
            />
          </Column>

          <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
            <TextInput
              id="groupby"
              labelText="Group By Fields (comma-separated)"
              placeholder="e.g. region,state"
              value={formData.groupby}
              onChange={(e) => handleInputChange("groupby", e.target.value)}
            />
          </Column>
        </Grid>

        {/* Step 3: Table Selection */}
        {comparisonType === 'single' &&
          formData.sourceSchema &&
          formData.targetSchema && (
            <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
                Select Tables
              </h3>

              {tableError.source && (
                <InlineNotification
                  kind="error"
                  title="Source Table Error"
                  subtitle={tableError.source}
                  style={{ marginBottom: '1rem' }}
                />
              )}

              {tableError.target && (
                <InlineNotification
                  kind="error"
                  title="Target Table Error"
                  subtitle={tableError.target}
                  style={{ marginBottom: '1rem' }}
                />
              )}

              <Grid>
                <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Select
                    id="source-table"
                    labelText="Source Table"
                    value={formData.sourceTable}
                    onChange={(e) => handleInputChange('sourceTable', e.target.value)}
                  >
                    <SelectItem value="" text="Select Table" />
                    {sourceTables.map(table => (
                      <SelectItem key={table} value={table} text={table} />
                    ))}
                  </Select>
                </Column>
                <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Select
                    id="target-table"
                    labelText="Target Table"
                    value={formData.targetTable}
                    onChange={(e) => handleInputChange('targetTable', e.target.value)}
                  >
                    <SelectItem value="" text="Select Table" />
                    {targetTables.map(table => (
                      <SelectItem key={table} value={table} text={table} />
                    ))}
                  </Select>
                </Column>
              </Grid>
            </Tile>
          )}

        {/* Step 4: Validation Options (once schemas selected, and tables if required) */}
        {(comparisonType === 'full' && formData.sourceSchema && formData.targetSchema) ||
          (comparisonType === 'single' &&
            formData.sourceSchema &&
            formData.targetSchema &&
            formData.sourceTable &&
            formData.targetTable) ? (
          <>
            {/* Column Selection */}
            <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
                Column Selection
              </h3>
              <Grid>
                <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Select
                    id="column-selection-type"
                    labelText="Column Selection Type"
                    value={columnSelectionType}
                    onChange={(e) => {
                      const value = (e.target as HTMLSelectElement).value;
                      setColumnSelectionType(value);
                      handleInputChange('includeColumns', []);
                      handleInputChange('excludeColumns', []);
                    }}
                  >
                    {columnSelectionOptions.map(option => (
                      <SelectItem key={option.id} value={option.id} text={option.text} />
                    ))}
                  </Select>
                </Column>
                {columnSelectionType === 'include' && (
                  <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                    <MultiSelect
                      id="include-columns"
                      titleText="Include Columns"
                      label="Select columns to include"
                      items={columnOptions}
                      itemToString={(item) => (item ? item.text : '')}
                      onChange={({ selectedItems }) =>
                        handleInputChange(
                          'includeColumns',
                          selectedItems.map(item => item.id)
                        )
                      }
                    />
                  </Column>
                )}
                {columnSelectionType === 'exclude' && (
                  <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                    <MultiSelect
                      id="exclude-columns"
                      titleText="Exclude Columns"
                      label="Select columns to exclude"
                      items={columnOptions}
                      itemToString={(item) => (item ? item.text : '')}
                      onChange={({ selectedItems }) =>
                        handleInputChange(
                          'excludeColumns',
                          selectedItems.map(item => item.id)
                        )
                      }
                    />
                  </Column>
                )}
              </Grid>
            </Tile>

            {/* Checksum + Row Count Toggles */}
            <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
                Validation Options
              </h3>
              <Grid>
                <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Toggle
                    id="enable-checksum"
                    labelText="Enable Checksum Comparison"
                    toggled={formData.enableChecksum}
                    onToggle={(toggled) => handleInputChange('enableChecksum', toggled)}
                  />
                  {formData.enableChecksum && (
                    <div style={{ marginTop: '1rem' }}>
                      <TextInput
                        id="checksum-type"
                        labelText="Hash Type"
                        value="SHA2"
                        readOnly
                      />
                    </div>
                  )}
                </Column>
                <Column lg={8} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Toggle
                    id="enable-row-count"
                    labelText="Quick Row Count Check"
                    toggled={formData.enableRowCount}
                    onToggle={(toggled) => handleInputChange('enableRowCount', toggled)}
                  />
                </Column>
              </Grid>
            </Tile>

            {/* Final Run Button */}
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Button kind="primary" onClick={handleCompareData}>
                Run Data Validation
              </Button>
            </div>
          </>
        ) : null}
      </div>
    );
  };

  // --- Utilities Handlers ---
  const handleDownloadReport = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/download-report");
      if (!response.ok) {
        alert("No compressed report found.");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "validation_report.log.gz";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download report.");
    }
  };

  const handleGenerateDDL = async () => {
    if (!formData.sourceDatabaseType || !formData.sourceHost || !formData.sourcePort || !formData.sourceUsername || !formData.sourcePassword || !formData.sourceDatabaseName || !formData.sourceSchema || !formData.sourceTable) {
      alert("Please fill all source DB and table details to generate DDL.");
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/api/generate-ddl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db_type: formData.sourceDatabaseType,
          host: formData.sourceHost,
          port: formData.sourcePort,
          username: formData.sourceUsername,
          password: formData.sourcePassword,
          database: formData.sourceDatabaseName,
          schema: formData.sourceSchema,
          table: formData.sourceTable
        })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        // Show the DDL to the user, or allow them to download it
        const blob = new Blob([result.ddl], { type: "text/sql" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ddl.sql";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        alert("DDL generated and downloaded as ddl.sql");
      } else {
        alert("Failed to generate DDL: " + (result.message || "Unknown error"));
      }
    } catch (err) {
      alert("Error generating DDL.");
    }
  };

  return (
    <div className="cds--content" style={{ padding: '6rem 2rem 2rem' }}>
      <Grid className="cds--grid--full-width">
        <Column lg={16} md={8} sm={4}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Button
              kind="ghost"
              onClick={() => onNavigate('data-validation-dashboard')}
              style={{ marginBottom: '2rem' }}
            >
              ← Back to Dashboard
            </Button>

            {/* Workspace Info */}
            {workspaceData && (
              <Tile style={{ padding: '2rem', marginBottom: '2rem', backgroundColor: '#f4f4f4' }}>
                <h2 className="cds--productive-heading-05" style={{ marginBottom: '0.5rem' }}>
                  {workspaceData.name}
                </h2>
                <p className="cds--body-long-01" style={{ color: '#6f6f6f' }}>
                  {workspaceData.description}
                </p>
              </Tile>
            )}

            <h1 className="cds--productive-heading-06" style={{ marginBottom: '2rem' }}>
              Data Validation Dashboard
            </h1>

            {/* Progress Indicator */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Tag type={currentStep >= 1 ? 'green' : 'gray'}>
                1. Source Database
              </Tag>
              <Tag type={currentStep >= 2 ? 'green' : 'gray'}>
                2. Target Database
              </Tag>
              <Tag type={currentStep >= 3 ? 'green' : 'gray'}>
                3. Comparison Setup
              </Tag>
            </div>

            {isLoading && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Loading description="Establishing connection..." />
              </div>
            )}

            {!isLoading && (
              <div>
                {/* Source Table - Always shown */}
                {renderSourceTable()}

                {/* Target Table - Shown after source connection */}
                {currentStep >= 2 && renderTargetTable()}

                {/* Comparison Options - Shown after target connection */}
                {currentStep >= 3 && renderComparisonOptions()}

                {/* Validation Results */}
                {renderValidationResults()}
              </div>
            )}

            {/* Formatted Report Modal */}
            {showFormattedReport && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
              }}>
                <div style={{
                  backgroundColor: '#1e1e1e',
                  border: '2px solid #4a4a4a',
                  borderRadius: '8px',
                  width: '95%',
                  height: '90%',
                  display: 'flex',
                  flexDirection: 'column',
                  color: '#00ff00',
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                }}>
                  {/* Report Header */}
                  <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid #4a4a4a',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#2a2a2a'
                  }}>
                    <h3 style={{ margin: 0, color: '#00ff00' }}>📊 Data Validation Report</h3>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <Button 
                        kind="secondary" 
                        size="sm" 
                        onClick={handleCopyReport}
                        style={{ backgroundColor: '#3a3a3a', border: '1px solid #5a5a5a', color: '#00ff00' }}
                      >
                        📋 Copy
                      </Button>
                      <Button 
                        kind="secondary" 
                        size="sm" 
                        onClick={handleDownloadFormattedReport}
                        style={{ backgroundColor: '#3a3a3a', border: '1px solid #5a5a5a', color: '#00ff00' }}
                      >
                        💾 Download
                      </Button>
                      <Button 
                        kind="danger" 
                        size="sm" 
                        onClick={() => setShowFormattedReport(false)}
                        style={{ backgroundColor: '#ff4444', border: '1px solid #ff6666' }}
                      >
                        ✕ Close
                      </Button>
                    </div>
                  </div>

                  {/* Report Content */}
                  <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '1rem',
                    backgroundColor: '#1e1e1e',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    <pre style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      color: '#00ff00',
                      fontFamily: 'inherit'
                    }}>
                      {formattedReportContent || 'Loading report...'}
                    </pre>
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '0.5rem 1rem',
                    borderTop: '1px solid #4a4a4a',
                    backgroundColor: '#2a2a2a',
                    fontSize: '12px',
                    color: '#888'
                  }}>
                    💡 Tip: Use Ctrl+F to search within the report • Generated on {new Date().toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Column>
      </Grid>
    </div>
  );
};

export default DataValidation;