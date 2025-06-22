
import React, { useState } from 'react';
import {
  Grid,
  Column,
  Button,
  TextInput,
  Tile,
  Select,
  SelectItem,
  Loading,
  Tag,
  ProgressIndicator,
  ProgressStep,
  NumberInput,
} from '@carbon/react';
import { CheckmarkOutline, ErrorFilled, ConnectionSignal } from '@carbon/icons-react';
import MovementResults from './MovementResults';
import { Checkbox } from './ui/checkbox';

interface DataMovementProps {
  onNavigate: (page: string) => void;
}

const DataMovement: React.FC<DataMovementProps> = ({ onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [movementResults, setMovementResults] = useState(null);
  const [sourceConnectionStatus, setSourceConnectionStatus] = useState<'none' | 'testing' | 'success' | 'error'>('none');
  const [targetConnectionStatus, setTargetConnectionStatus] = useState<'none' | 'testing' | 'success' | 'error'>('none');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    // Source Connection
    sourceDbType: '',
    sourceHost: '',
    sourcePort: '',
    sourceDatabase: '',
    
    // Target Connection
    targetDbType: '',
    targetHost: '',
    targetPort: '',
    targetDatabase: '',
    targetJdbcUrl: '',
    targetSchema: '',
    createIfNotExists: '',
    
    // Schema Discovery
    availableSchemas: '',
    targetSchemaName: '',
    
    // Migration Strategy
    movementMode: '',
    batchSize: 10000,
    parallelProcessing: '',
    conflictResolution: '',
    enableTransformation: '',
    maxConcurrentTables: 3,
    
    // Table Selection
    includePatterns: '',
    excludePatterns: '',
  });

  // Dropdown options
  const dbTypes = [
    { value: '', text: 'Select Database Type' },
    { value: 'postgresql', text: 'PostgreSQL' },
    { value: 'mysql', text: 'MySQL' },
    { value: 'sqlserver', text: 'SQL Server' },
    { value: 'oracle', text: 'Oracle' },
    { value: 'db2', text: 'IBM DB2' },
  ];

  const schemaOptions = [
    { value: '', text: 'Select Schema' },
    { value: 'public', text: 'public (15 tables, 2.3 GB)' },
    { value: 'analytics', text: 'analytics (8 tables, 1.1 GB)' },
    { value: 'staging', text: 'staging (5 tables, 456 MB)' },
    { value: 'raw_data', text: 'raw_data (12 tables, 3.8 GB)' },
  ];

  const targetSchemaOptions = [
    { value: '', text: 'Select Target Schema' },
    { value: 'migrated_public', text: 'migrated_public' },
    { value: 'new_analytics', text: 'new_analytics' },
    { value: 'production', text: 'production' },
    { value: 'staging_new', text: 'staging_new' },
  ];

  const patternOptions = [
    { value: '', text: 'Select Pattern' },
    { value: 'user*', text: 'user* (User related tables)' },
    { value: 'order*', text: 'order* (Order related tables)' },
    { value: 'product*', text: 'product* (Product related tables)' },
    { value: 'temp*', text: 'temp* (Temporary tables)' },
    { value: '*_archive', text: '*_archive (Archive tables)' },
    { value: '*_backup', text: '*_backup (Backup tables)' },
  ];

  const excludePatternOptions = [
    { value: '', text: 'Select Exclude Pattern' },
    { value: 'temp*', text: 'temp* (Temporary tables)' },
    { value: '*_temp', text: '*_temp (Temporary tables)' },
    { value: '*_archive', text: '*_archive (Archive tables)' },
    { value: '*_backup', text: '*_backup (Backup tables)' },
    { value: 'test*', text: 'test* (Test tables)' },
  ];

  const movementModeOptions = [
    { value: '', text: 'Select Movement Mode' },
    { value: 'full-load', text: 'Full Load (Replace All Data)' },
    { value: 'incremental', text: 'Incremental (New/Changed Only)' },
    { value: 'sync', text: 'Sync Mode (Continuous)' },
  ];

  const conflictResolutionOptions = [
    { value: '', text: 'Select Options' },
    { value: 'overwrite', text: 'Overwrite Existing' },
    { value: 'skip', text: 'Skip Conflicts' },
    { value: 'append', text: 'Append with Suffix' },
  ];

  const enableDisableOptions = [
    { value: '', text: 'Select Option' },
    { value: 'enabled', text: 'Enabled' },
    { value: 'disabled', text: 'Disabled' },
  ];

  const yesNoOptions = [
    { value: '', text: 'Select Option' },
    { value: 'yes', text: 'Yes' },
    { value: 'no', text: 'No' },
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async (type: 'source' | 'target') => {
    const setStatus = type === 'source' ? setSourceConnectionStatus : setTargetConnectionStatus;
    setStatus('testing');
    
    setTimeout(() => {
      const success = Math.random() > 0.3;
      setStatus(success ? 'success' : 'error');
    }, 2000);
  };

  const handleTableSelection = (tableName: string, checked: boolean) => {
    if (checked) {
      setSelectedTables(prev => [...prev, tableName]);
    } else {
      setSelectedTables(prev => prev.filter(t => t !== tableName));
    }
  };

  const handleBulkTableSelection = (action: 'all' | 'none') => {
    if (action === 'all') {
      setSelectedTables(['users', 'orders', 'products', 'analytics_summary', 'user_events']);
    } else if (action === 'none') {
      setSelectedTables([]);
    }
  };

  const handleDataMovement = async () => {
    setIsLoading(true);
    
    setTimeout(() => {
      setMovementResults({
        totalTables: selectedTables.length || 15,
        tablesMoved: selectedTables.length || 14,
        failedTables: 1,
        details: [
          { tableName: 'users', status: 'success', rows: '100,000', duration: '15m' },
          { tableName: 'orders', status: 'success', rows: '250,000', duration: '45m' },
          { tableName: 'products', status: 'failed', rows: '0', duration: '0m', error: 'Connection timeout' },
        ]
      });
      setIsLoading(false);
    }, 3000);
  };

  const steps = [
    'Connection Setup',
    'Schema Discovery',
    'Table Selection',
    'Migration Strategy',
    'Review & Execute'
  ];

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckmarkOutline size={16} style={{ color: 'green' }} />;
      case 'error':
        return <ErrorFilled size={16} style={{ color: 'red' }} />;
      case 'testing':
        return <Loading small />;
      default:
        return <ConnectionSignal size={16} style={{ color: 'gray' }} />;
    }
  };

  const renderConnectionSetup = () => (
    <div style={{ marginBottom: '2rem' }}>
      <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
        Database Connection Configuration
      </h3>
      
      <Grid>
        <Column lg={8} md={4} sm={4} style={{ marginBottom: '1.5rem' }}>
          <Tile style={{ padding: '2rem', backgroundColor: '#f4f4f4' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 className="cds--productive-heading-03" style={{ marginRight: '1rem' }}>
                Source Connection
              </h4>
              {getConnectionStatusIcon(sourceConnectionStatus)}
            </div>
            
            <Select
              id="source-db-type"
              labelText="Database Type"
              value={formData.sourceDbType}
              onChange={(e) => handleInputChange('sourceDbType', e.target.value)}
              style={{ marginBottom: '1rem' }}
            >
              {dbTypes.map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
            
            <Grid>
              <Column lg={8} md={4} sm={4}>
                <TextInput
                  id="source-host"
                  labelText="Host"
                  placeholder="localhost"
                  value={formData.sourceHost}
                  onChange={(e) => handleInputChange('sourceHost', e.target.value)}
                />
              </Column>
              <Column lg={8} md={4} sm={4}>
                <TextInput
                  id="source-port"
                  labelText="Port"
                  placeholder="5432"
                  value={formData.sourcePort}
                  onChange={(e) => handleInputChange('sourcePort', e.target.value)}
                />
              </Column>
            </Grid>
            
            <TextInput
              id="source-database"
              labelText="Database Name"
              placeholder="my_database"
              value={formData.sourceDatabase}
              onChange={(e) => handleInputChange('sourceDatabase', e.target.value)}
              style={{ marginTop: '1rem' }}
            />
            
            <Button
              kind="secondary"
              onClick={() => testConnection('source')}
              disabled={sourceConnectionStatus === 'testing'}
              style={{ marginTop: '1rem' }}
            >
              {sourceConnectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
          </Tile>
        </Column>
        
        <Column lg={8} md={4} sm={4} style={{ marginBottom: '1.5rem' }}>
          <Tile style={{ padding: '2rem', backgroundColor: '#f4f4f4' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 className="cds--productive-heading-03" style={{ marginRight: '1rem' }}>
                Target Connection
              </h4>
              {getConnectionStatusIcon(targetConnectionStatus)}
            </div>
            
            <Select
              id="target-db-type"
              labelText="Database Type"
              value={formData.targetDbType}
              onChange={(e) => handleInputChange('targetDbType', e.target.value)}
              style={{ marginBottom: '1rem' }}
            >
              {dbTypes.map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
            
            <TextInput
              id="target-jdbc"
              labelText="JDBC URL"
              placeholder="jdbc:postgresql://host:port/database"
              value={formData.targetJdbcUrl}
              onChange={(e) => handleInputChange('targetJdbcUrl', e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            
            <Grid>
              <Column lg={8} md={4} sm={4}>
                <TextInput
                  id="target-host"
                  labelText="Host"
                  placeholder="localhost"
                  value={formData.targetHost}
                  onChange={(e) => handleInputChange('targetHost', e.target.value)}
                />
              </Column>
              <Column lg={8} md={4} sm={4}>
                <TextInput
                  id="target-port"
                  labelText="Port"
                  placeholder="5432"
                  value={formData.targetPort}
                  onChange={(e) => handleInputChange('targetPort', e.target.value)}
                />
              </Column>
            </Grid>
            
            <TextInput
              id="target-database"
              labelText="Database Name"
              placeholder="target_database"
              value={formData.targetDatabase}
              onChange={(e) => handleInputChange('targetDatabase', e.target.value)}
              style={{ marginTop: '1rem' }}
            />
            
            <Select
              id="create-if-not-exists"
              labelText="Create database/schema if not exists"
              value={formData.createIfNotExists}
              onChange={(e) => handleInputChange('createIfNotExists', e.target.value)}
              style={{ marginTop: '1rem' }}
            >
              {yesNoOptions.map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
            
            <Button
              kind="secondary"
              onClick={() => testConnection('target')}
              disabled={targetConnectionStatus === 'testing'}
              style={{ marginTop: '1rem' }}
            >
              {targetConnectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
          </Tile>
        </Column>
      </Grid>
    </div>
  );

  const renderSchemaDiscovery = () => (
    <div style={{ marginBottom: '2rem' }}>
      <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
        Schema Discovery & Selection
      </h3>
      
      <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>
          Schema Configuration
        </h4>
        
        <Grid>
          <Column lg={8} md={4} sm={4}>
            <Select
              id="available-schemas"
              labelText="Available Schemas"
              value={formData.availableSchemas}
              onChange={(e) => handleInputChange('availableSchemas', e.target.value)}
            >
              {schemaOptions.map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
          </Column>
          <Column lg={8} md={4} sm={4}>
            <Select
              id="target-schema-name"
              labelText="Target Schema Name"
              value={formData.targetSchemaName}
              onChange={(e) => handleInputChange('targetSchemaName', e.target.value)}
            >
              {targetSchemaOptions.map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
          </Column>
        </Grid>
      </Tile>
    </div>
  );

  const renderTableSelection = () => (
    <div style={{ marginBottom: '2rem' }}>
      <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
        Table Selection & Management
      </h3>
      
      <Tile style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>
          Table Filtering Options
        </h4>
        
        <Grid>
          <Column lg={8} md={4} sm={4}>
            <Select
              id="include-patterns"
              labelText="Include Table Patterns"
              value={formData.includePatterns}
              onChange={(e) => handleInputChange('includePatterns', e.target.value)}
            >
              {patternOptions.map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
          </Column>
          <Column lg={8} md={4} sm={4}>
            <Select
              id="exclude-patterns"
              labelText="Exclude Table Patterns"
              value={formData.excludePatterns}
              onChange={(e) => handleInputChange('excludePatterns', e.target.value)}
            >
              {excludePatternOptions.map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
          </Column>
        </Grid>
        
        <div style={{ marginTop: '1rem' }}>
          <Button kind="ghost" size="sm" onClick={() => handleBulkTableSelection('all')}>
            Select All Tables
          </Button>
          <Button kind="ghost" size="sm" onClick={() => handleBulkTableSelection('none')} style={{ marginLeft: '1rem' }}>
            Clear Selection
          </Button>
        </div>
      </Tile>

      <Tile style={{ padding: '2rem' }}>
        <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>
          Available Tables (5)
        </h4>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {['users', 'orders', 'products', 'analytics_summary', 'user_events'].map((tableName) => (
            <div key={tableName} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0.5rem', 
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: selectedTables.includes(tableName) ? '#f0f8ff' : 'transparent'
            }}>
              <Checkbox
                id={`select-${tableName}`}
                checked={selectedTables.includes(tableName)}
                onCheckedChange={(checked) => handleTableSelection(tableName, !!checked)}
              />
              <label htmlFor={`select-${tableName}`} style={{ marginLeft: '1rem', flex: 1, cursor: 'pointer' }}>
                <div style={{ fontWeight: 'bold' }}>{tableName}</div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  Schema: public | Rows: 100,000 | Size: 45 MB | Modified: 2024-01-15
                </div>
              </label>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '1rem' }}>
          <Tag type="blue">Selected: {selectedTables.length} tables</Tag>
        </div>
      </Tile>
    </div>
  );

  const renderMigrationStrategy = () => (
    <div style={{ marginBottom: '2rem' }}>
      <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
        Migration Strategy Configuration
      </h3>

      <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>
          Data Movement Mode
        </h4>
        <Select
          id="movement-mode"
          labelText="Select movement mode"
          value={formData.movementMode}
          onChange={(e) => handleInputChange('movementMode', e.target.value)}
        >
          {movementModeOptions.map(option => (
            <SelectItem key={option.value} value={option.value} text={option.text} />
          ))}
        </Select>
      </Tile>

      <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>
          Processing Configuration
        </h4>
        <Grid>
          <Column lg={5} md={4} sm={4}>
            <NumberInput
              id="batch-size"
              label="Batch Size (rows)"
              value={formData.batchSize}
              onChange={(e, { value }) => handleInputChange('batchSize', value)}
              min={1000}
              max={100000}
              step={1000}
            />
          </Column>
          <Column lg={5} md={4} sm={4}>
            <NumberInput
              id="max-concurrent-tables"
              label="Max Concurrent Tables"
              value={formData.maxConcurrentTables}
              onChange={(e, { value }) => handleInputChange('maxConcurrentTables', value)}
              min={1}
              max={10}
            />
          </Column>
          <Column lg={6} md={4} sm={4}>
            <Select
              id="conflict-resolution"
              labelText="Conflict Resolution"
              value={formData.conflictResolution}
              onChange={(e) => handleInputChange('conflictResolution', e.target.value)}
            >
              {conflictResolutionOptions.map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
          </Column>
        </Grid>
        
        <div style={{ marginTop: '1rem' }}>
          <Grid>
            <Column lg={8} md={4} sm={4}>
              <Select
                id="parallel-processing"
                labelText="Parallel Table Processing"
                value={formData.parallelProcessing}
                onChange={(e) => handleInputChange('parallelProcessing', e.target.value)}
                style={{ marginBottom: '1rem' }}
              >
                {enableDisableOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} text={option.text} />
                ))}
              </Select>
            </Column>
            <Column lg={8} md={4} sm={4}>
              <Select
                id="enable-transformation"
                labelText="Schema Transformations"
                value={formData.enableTransformation}
                onChange={(e) => handleInputChange('enableTransformation', e.target.value)}
              >
                {enableDisableOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} text={option.text} />
                ))}
              </Select>
            </Column>
          </Grid>
        </div>
      </Tile>
    </div>
  );

  const renderReviewStep = () => (
    <div style={{ marginBottom: '2rem' }}>
      <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem' }}>
        Review & Execute Migration
      </h3>
      
      <Tile style={{ padding: '2rem', marginBottom: '1rem' }}>
        <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>
          Migration Summary
        </h4>
        
        <Grid>
          <Column lg={8} md={4} sm={4}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Source:</strong> {formData.sourceDbType} - {formData.sourceHost}:{formData.sourcePort}/{formData.sourceDatabase}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Target:</strong> {formData.targetDbType} - {formData.targetJdbcUrl || `${formData.targetHost}:${formData.targetPort}/${formData.targetDatabase}`}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Selected Tables:</strong> {selectedTables.length} tables
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Migration Mode:</strong> {formData.movementMode}
            </div>
          </Column>
          <Column lg={8} md={4} sm={4}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Settings:</strong>
              <div style={{ marginTop: '0.5rem' }}>
                <Tag type="blue">Batch: {formData.batchSize}</Tag>
                <Tag type="green">Concurrent: {formData.maxConcurrentTables}</Tag>
                {formData.parallelProcessing === 'enabled' && <Tag type="purple">Parallel Processing</Tag>}
                {formData.enableTransformation === 'enabled' && <Tag type="magenta">Transformations</Tag>}
              </div>
            </div>
          </Column>
        </Grid>
      </Tile>
    </div>
  );

  if (movementResults) {
    return <MovementResults results={movementResults} onNavigate={onNavigate} onReset={() => setMovementResults(null)} />;
  }

  return (
    <div className="cds--content" style={{ padding: '6rem 2rem 2rem' }}>
      <Grid className="cds--grid--full-width">
        <Column lg={16} md={8} sm={4}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Button
              kind="ghost"
              onClick={() => onNavigate('home')}
              style={{ marginBottom: '2rem' }}
            >
              ← Back to Home
            </Button>
            
            <h1 className="cds--productive-heading-06" style={{ marginBottom: '2rem' }}>
              Data Movement Tool
            </h1>
            
            <ProgressIndicator currentIndex={currentStep} style={{ marginBottom: '2rem' }}>
              {steps.map((step, index) => (
                <ProgressStep
                  key={index}
                  label={step}
                  complete={index < currentStep}
                  current={index === currentStep}
                />
              ))}
            </ProgressIndicator>
            
            {isLoading && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Loading description="Processing data movement..." />
                <p style={{ marginTop: '1rem' }}>This may take several minutes depending on data size...</p>
              </div>
            )}
            
            {!isLoading && (
              <Tile style={{ padding: '2rem', backgroundColor: 'white' }}>
                {currentStep === 0 && renderConnectionSetup()}
                {currentStep === 1 && renderSchemaDiscovery()}
                {currentStep === 2 && renderTableSelection()}
                {currentStep === 3 && renderMigrationStrategy()}
                {currentStep === 4 && renderReviewStep()}
                
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    kind="secondary"
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    Previous
                  </Button>
                  
                  {currentStep < 4 ? (
                    <Button
                      kind="primary"
                      onClick={() => setCurrentStep(currentStep + 1)}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      kind="primary"
                      onClick={handleDataMovement}
                      disabled={isLoading}
                    >
                      Start Data Movement
                    </Button>
                  )}
                </div>
              </Tile>
            )}
          </div>
        </Column>
      </Grid>
    </div>
  );
};

export default DataMovement;
