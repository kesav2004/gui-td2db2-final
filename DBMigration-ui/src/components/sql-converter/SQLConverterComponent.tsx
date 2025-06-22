import React, { useState } from 'react';
import {
  Button,
  TextArea,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tile,
  Tag,
  InlineNotification,
  Loading,
  Grid,
  Column,
  Modal
} from '@carbon/react';
import {
  Copy,
  Document,
  CheckmarkFilled,
  WarningAltFilled,
  Download,
  Code,
  Application,
  CheckmarkOutline
} from '@carbon/icons-react';

interface ConversionResult {
  success: boolean;
  converted_sql: string;
  conversion_report: string;
  error_message: string;
  timestamp: string;
  conversion_id: string;
  warnings: string[];
}

interface ValidationResult {
  success: boolean;
  validation_output: string;
  db2_execution_success: boolean;
  error_message: string;
  timestamp: string;
  validation_id: string;
}

const SQLConverterComponent: React.FC = () => {
  const [inputSQL, setInputSQL] = useState<string>('');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);

  const showNotification = (title: string, subtitle: string, kind: 'success' | 'error' | 'info' = 'info') => {
    const notification = {
      id: Date.now(),
      title,
      subtitle,
      kind,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const loadSampleSQL = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/sql-conversion/sample');
      const data = await response.json();
      
      if (data.success) {
        setInputSQL(data.sample_sql);
        showNotification('Sample loaded', 'Sample Teradata SQL has been loaded', 'success');
      } else {
        throw new Error(data.error_message || 'Failed to load sample');
      }
    } catch (error) {
      showNotification('Error', 'Failed to load sample SQL', 'error');
    }
  };

  const convertSQL = async () => {
    if (!inputSQL.trim()) {
      showNotification('Input required', 'Please enter some Teradata SQL to convert', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/sql-conversion/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_sql: inputSQL
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setActiveTab(1);
        showNotification('Conversion successful', `SQL converted successfully (ID: ${data.conversion_id})`, 'success');
      } else {
        showNotification('Conversion failed', data.error_message, 'error');
      }
    } catch (error) {
      showNotification('Connection error', 'Failed to connect to conversion service', 'error');
      setResult({
        success: false,
        converted_sql: '',
        conversion_report: '',
        error_message: 'Network error: Unable to connect to conversion service',
        timestamp: new Date().toISOString(),
        conversion_id: '',
        warnings: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    showNotification('Copied', `${type} copied to clipboard`, 'success');
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Downloaded', `${filename} has been downloaded`, 'success');
  };

  const validateOnDB2 = async () => {
    if (!result?.converted_sql) {
      showNotification('No SQL to validate', 'Please convert SQL first before validation', 'error');
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch('http://localhost:5001/api/sql-conversion/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          converted_sql: result.converted_sql
        }),
      });

      const data = await response.json();
      setValidationResult(data);
      setShowValidationModal(true);

      if (data.success && data.db2_execution_success) {
        showNotification('Validation successful', 'SQL executed successfully on DB2 server', 'success');
      } else {
        showNotification('Validation failed', data.error_message || 'DB2 validation failed', 'error');
      }
    } catch (error) {
      showNotification('Connection error', 'Failed to connect to validation service', 'error');
      setValidationResult({
        success: false,
        validation_output: '',
        db2_execution_success: false,
        error_message: 'Network error: Unable to connect to validation service',
        timestamp: new Date().toISOString(),
        validation_id: ''
      });
      setShowValidationModal(true);
    } finally {
      setIsValidating(false);
    }
  };

  const clearAll = () => {
    setInputSQL('');
    setResult(null);
    setValidationResult(null);
    setActiveTab(0);
    setShowValidationModal(false);
    showNotification('Cleared', 'All data has been cleared', 'info');
  };

  return (
    <div className="cds--grid cds--grid--full-width">
      {/* Notifications */}
      <div className="notification-container" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
        {notifications.map((notification) => (
          <div key={notification.id} style={{ marginBottom: '12px' }}>
            <InlineNotification
              kind={notification.kind}
              title={notification.title}
              subtitle={notification.subtitle}
              onCloseButtonClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              hideCloseButton={false}
              role="status"
            />
          </div>
        ))}
      </div>

      <Column lg={16} md={8} sm={4}>
        <div style={{ marginBottom: '2rem' }}>
          <h3 className="cds--productive-heading-04" style={{ marginBottom: '0.5rem' }}>
            SQL Converter (Teradata → DB2)
          </h3>
          <p className="cds--body-long-01" style={{ color: '#525252' }}>
            Convert Teradata stored procedures to DB2-compatible SQL syntax
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <Button
            kind="tertiary"
            size="md"
            renderIcon={Document}
            onClick={loadSampleSQL}
          >
            Load Sample
          </Button>
          <Button
            kind="primary"
            size="md"
            renderIcon={Application}
            onClick={convertSQL}
            disabled={isLoading || !inputSQL.trim()}
          >
            {isLoading ? 'Converting...' : 'Convert SQL'}
          </Button>
          <Button
            kind="ghost"
            size="md"
            onClick={clearAll}
          >
            Clear All
          </Button>
        </div>

        <Tabs selectedIndex={activeTab} onChange={(e) => setActiveTab(e.selectedIndex)}>
          <TabList aria-label="SQL Conversion tabs">
            <Tab>Input (Teradata)</Tab>
            <Tab disabled={!result}>
              Output (DB2)
              {result?.success && <CheckmarkFilled size={16} style={{ marginLeft: '8px', color: '#24a148' }} />}
              {result && !result.success && <WarningAltFilled size={16} style={{ marginLeft: '8px', color: '#da1e28' }} />}
            </Tab>
            <Tab disabled={!result}>Report</Tab>
            <Tab disabled={!result}>Report-AI</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Tile style={{ padding: '1.5rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h4 className="cds--productive-heading-03">Teradata SQL Input</h4>
                    <p className="cds--body-compact-01" style={{ color: '#525252', marginTop: '0.25rem' }}>
                      Paste your Teradata stored procedure here
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Tag type="outline">Teradata</Tag>
                    {inputSQL && (
                      <Button
                        kind="ghost"
                        size="sm"
                        renderIcon={Copy}
                        iconDescription="Copy input SQL"
                        hasIconOnly
                        onClick={() => copyToClipboard(inputSQL, 'Input SQL')}
                      />
                    )}
                  </div>
                </div>
                <TextArea
                  id="teradata-input"
                  labelText="Teradata SQL Input"
                  placeholder="REPLACE PROCEDURE MySchema.MyProcedure(...)&#10;BEGIN&#10;    -- Your Teradata SQL here&#10;END;"
                  value={inputSQL}
                  onChange={(e) => setInputSQL(e.target.value)}
                  rows={20}
                  style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px' }}
                />
                <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#525252' }}>
                  Characters: {inputSQL.length}
                </div>
              </Tile>
            </TabPanel>

            <TabPanel>
              {result && (
                <Tile style={{ padding: '1.5rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h4 className="cds--productive-heading-03">
                        {result.success ? 'DB2 SQL Output' : 'Conversion Error'}
                      </h4>
                      <p className="cds--body-compact-01" style={{ color: '#525252', marginTop: '0.25rem' }}>
                        {result.success 
                          ? `Converted on ${new Date(result.timestamp).toLocaleString()}`
                          : 'Conversion failed - see error details below'
                        }
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {result.success && <Tag type="green">Success</Tag>}
                      {!result.success && <Tag type="red">Failed</Tag>}
                      {result.converted_sql && (
                        <>
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={Copy}
                            iconDescription="Copy converted SQL"
                            hasIconOnly
                            onClick={() => copyToClipboard(result.converted_sql, 'Converted SQL')}
                          />
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={Download}
                            iconDescription="Download converted SQL"
                            hasIconOnly
                            onClick={() => downloadFile(result.converted_sql, `converted_${result.conversion_id}.sql`)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  {result.success ? (
                    <>
                      <TextArea
                        id="db2-output"
                        labelText="DB2 SQL Output"
                        value={result.converted_sql}
                        readOnly
                        rows={20}
                        style={{ 
                          fontFamily: 'IBM Plex Mono, monospace', 
                          fontSize: '14px',
                          backgroundColor: '#f4f4f4'
                        }}
                      />
                      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          kind="secondary"
                          size="md"
                          renderIcon={CheckmarkOutline}
                          onClick={validateOnDB2}
                          disabled={isValidating}
                        >
                          {isValidating ? 'Validating...' : 'Validate on DB2'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <InlineNotification
                      kind="error"
                      title="Conversion Error"
                      subtitle={result.error_message}
                      hideCloseButton
                      onCloseButtonClick={() => {}}
                      role="alert"
                    />
                  )}
                </Tile>
              )}
            </TabPanel>

            <TabPanel>
              {result && (
                <Tile style={{ padding: '1.5rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h4 className="cds--productive-heading-03">Conversion Report</h4>
                      <p className="cds--body-compact-01" style={{ color: '#525252', marginTop: '0.25rem' }}>
                        Detailed conversion analysis and warnings
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Tag type="outline">ID: {result.conversion_id}</Tag>
                      {result.conversion_report && (
                        <>
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={Copy}
                            iconDescription="Copy conversion report"
                            hasIconOnly
                            onClick={() => copyToClipboard(result.conversion_report, 'Conversion Report')}
                          />
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={Download}
                            iconDescription="Download conversion report"
                            hasIconOnly
                            onClick={() => downloadFile(result.conversion_report, `report_${result.conversion_id}.txt`)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  {result.conversion_report ? (
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      backgroundColor: '#f4f4f4', 
                      padding: '1rem', 
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'IBM Plex Mono, monospace',
                      overflow: 'auto'
                    }}>
                      {result.conversion_report}
                    </pre>
                  ) : (
                    <p style={{ color: '#525252' }}>No conversion report available</p>
                  )}
                  
                  {result.warnings && result.warnings.length > 0 && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h5 className="cds--productive-heading-02" style={{ marginBottom: '0.75rem' }}>Warnings:</h5>
                      {result.warnings.map((warning, index) => (
                        <div key={index} style={{ marginBottom: '0.75rem' }}>
                                                     <InlineNotification
                             kind="warning"
                             title="Warning"
                             subtitle={warning}
                             hideCloseButton
                             onCloseButtonClick={() => {}}
                             role="alert"
                           />
                        </div>
                      ))}
                    </div>
                  )}
                </Tile>
              )}
            </TabPanel>

            <TabPanel>
              {result && (
                <Tile style={{ padding: '1.5rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h4 className="cds--productive-heading-03">AI-Powered Report</h4>
                      <p className="cds--body-compact-01" style={{ color: '#525252', marginTop: '0.25rem' }}>
                        AI-generated insights and recommendations for SQL conversion
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Tag type="purple">AI Analysis</Tag>
                      <Tag type="outline">ID: {result.conversion_id}</Tag>
                    </div>
                  </div>

                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    backgroundColor: '#f4f4f4', 
                    borderRadius: '4px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <h5 className="cds--productive-heading-02" style={{ marginBottom: '1rem', color: '#525252' }}>
                      🤖 AI Analysis Coming Soon
                    </h5>
                    <p className="cds--body-compact-01" style={{ color: '#6f6f6f' }}>
                      AI-powered insights and recommendations will appear here after conversion analysis is complete.
                    </p>
                  </div>
                </Tile>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Validation Modal */}
        <Modal
          open={showValidationModal}
          modalHeading="DB2 Validation Results"
          modalLabel="SQL Validation"
          primaryButtonText="Close"
          onRequestClose={() => setShowValidationModal(false)}
          onRequestSubmit={() => setShowValidationModal(false)}
          size="lg"
        >
          {validationResult && (
            <div style={{ padding: '1rem 0' }}>
              {/* Validation Status */}
              <div style={{ marginBottom: '1.5rem' }}>
                <Tag type={validationResult.db2_execution_success ? "green" : "red"} style={{ marginBottom: '0.5rem' }}>
                  {validationResult.db2_execution_success ? "✅ DB2 Execution Successful" : "❌ DB2 Execution Failed"}
                </Tag>
                <p className="cds--body-compact-01" style={{ color: '#525252' }}>
                  Validation ID: {validationResult.validation_id} | 
                  Timestamp: {new Date(validationResult.timestamp).toLocaleString()}
                </p>
              </div>

              {/* Validation Output */}
              <div>
                <h5 className="cds--productive-heading-02" style={{ marginBottom: '0.75rem' }}>
                  DB2 Server Output:
                </h5>
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  backgroundColor: '#f4f4f4', 
                  padding: '1rem', 
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  overflow: 'auto',
                  maxHeight: '300px',
                  border: '1px solid #e0e0e0'
                }}>
                  {validationResult.validation_output || 'No output available'}
                </pre>
              </div>

              {/* Error Message */}
              {validationResult.error_message && (
                <div style={{ marginTop: '1rem' }}>
                  <InlineNotification
                    kind="error"
                    title="Validation Error"
                    subtitle={validationResult.error_message}
                    hideCloseButton
                    onCloseButtonClick={() => {}}
                    role="alert"
                  />
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Loading Overlays */}
        {isLoading && (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.3)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 9998
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Loading withOverlay={false} />
              <p className="cds--body-compact-01">Converting SQL...</p>
            </div>
          </div>
        )}

        {isValidating && (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.3)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 9998
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Loading withOverlay={false} />
              <p className="cds--body-compact-01">Validating on DB2 server...</p>
            </div>
          </div>
        )}
      </Column>
    </div>
  );
};

export default SQLConverterComponent;