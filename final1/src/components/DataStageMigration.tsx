import React, { useState } from 'react';
import {
  Grid,
  Column,
  Tile,
  Button,
  Select,
  SelectItem,
  FileUploader,
  Accordion,
  AccordionItem,
  InlineNotification,
  ProgressBar,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  ToastNotification,
} from '@carbon/react';
import { Upload, Play, CheckmarkFilled, ArrowRight, Download } from '@carbon/icons-react';

const DataStageMigration: React.FC = () => {
  const [selectedConnection, setSelectedConnection] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [conversionStatus, setConversionStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [conversionProgress, setConversionProgress] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const connectionOptions = ['DataStage', 'Informatica', 'SSIS', 'OBIEE', 'MuleSoft', 'Talend'];
  const fileTypes = ['XML files', '.isx dump files', 'Mapping files', 'Sequence files'];

  const handleConversion = () => {
    setConversionStatus('running');
    setConversionProgress(0);

    const interval = setInterval(() => {
      setConversionProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setConversionStatus('completed');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files) as File[];
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDownload = () => {
    const fileContent = 'This is the converted DataStage job output.\nReplace this with real content.';
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted_output.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNextTab = () => {
    if (activeTab < 2) setActiveTab(activeTab + 1);
  };

  const handlePreviousTab = () => {
    if (activeTab > 0) setActiveTab(activeTab - 1);
  };

  return (
    <div className="cds--content" style={{ padding: '2rem', paddingTop: '5rem' }}>
      <Grid className="cds--grid--full-width">
        <Column lg={16} md={8} sm={4}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '3rem' }}>
              <h1 className="cds--productive-heading-06" style={{ marginBottom: '1rem' }}>
                DataStage Modernization
              </h1>
              <p className="cds--body-long-02" style={{ color: '#525252' }}>
                Convert and migrate your ETL processes from various platforms to IBM DataStage
              </p>
            </div>

            {showToast && (
              <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999 }}>
                <ToastNotification
                  subtitle="Your migration job has been completed successfully."
                  title="Conversion Complete"
                  kind="success"
                  caption={new Date().toLocaleTimeString()}
                  timeout={5000}
                  onClose={() => setShowToast(false)}
                />
              </div>
            )}

            <Tabs selectedIndex={activeTab} onChange={({ selectedIndex }) => setActiveTab(selectedIndex)}>
              <TabList aria-label="Migration steps">
                <Tab>1. Select Connection</Tab>
                <Tab>2. Upload Files</Tab>
                <Tab>3. Convert & Migrate</Tab>
              </TabList>

              <TabPanels>
                {/* Step 1 */}
                <TabPanel>
                  <div style={{ padding: '2rem 0' }}>
                    <h2 className="cds--productive-heading-04" style={{ marginBottom: '2rem' }}>
                      Select Source Platform
                    </h2>
                    <Grid>
                      <Column lg={8} md={4} sm={4}>
                        <Select
                          id="connection-select"
                          labelText="Choose your source platform"
                          value={selectedConnection}
                          onChange={(e) => setSelectedConnection(e.target.value)}
                          helperText="Select the platform you're migrating from"
                        >
                          <SelectItem value="" text="Select a platform..." />
                          {connectionOptions.map((option) => (
                            <SelectItem key={option} value={option} text={option} />
                          ))}
                        </Select>
                      </Column>
                    </Grid>

                    {selectedConnection && (
                      <div style={{ marginTop: '2rem' }}>
                        <Tile style={{ padding: '2rem', backgroundColor: '#e5f6ff' }}>
                          <h3 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>
                            {selectedConnection} Migration
                          </h3>
                          <p className="cds--body-long-01">
                            You've selected {selectedConnection} as your source platform. Our AI agent will analyze and convert your {selectedConnection} jobs and mappings to IBM DataStage format.
                          </p>
                        </Tile>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                      <Button kind="primary" renderIcon={ArrowRight} onClick={handleNextTab} disabled={!selectedConnection}>
                        Next
                      </Button>
                    </div>
                  </div>
                </TabPanel>

                {/* Step 2 */}
                <TabPanel>
                  <div style={{ padding: '2rem 0' }}>
                    <h2 className="cds--productive-heading-04" style={{ marginBottom: '2rem' }}>
                      Upload Migration Files
                    </h2>

                    <Accordion>
                      {fileTypes.map((fileType, index) => (
                        <AccordionItem key={index} title={fileType} open={index === 0}>
                          <div style={{ padding: '1rem 0' }}>
                            <FileUploader
                              accept={['.xml', '.isx', '.txt', '.json']}
                              buttonLabel="Choose files"
                              filenameStatus="edit"
                              iconDescription="Upload files"
                              labelDescription={`Upload your ${fileType.toLowerCase()}`}
                              labelTitle={`${fileType} Upload`}
                              multiple
                              onChange={handleFileUpload}
                            />
                          </div>
                        </AccordionItem>
                      ))}
                    </Accordion>

                    {uploadedFiles.length > 0 && (
                      <div style={{ marginTop: '2rem' }}>
                        <InlineNotification
                          kind="success"
                          subtitle={`${uploadedFiles.length} file(s) uploaded successfully`}
                          title="Files Ready"
                          hideCloseButton
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                      <Button kind="secondary" onClick={handlePreviousTab}>
                        Previous
                      </Button>
                      <Button kind="primary" renderIcon={ArrowRight} onClick={handleNextTab} disabled={uploadedFiles.length === 0}>
                        Next
                      </Button>
                    </div>
                  </div>
                </TabPanel>

                {/* Step 3 */}
                <TabPanel>
                  <div style={{ padding: '2rem 0' }}>
                    <h2 className="cds--productive-heading-04" style={{ marginBottom: '2rem' }}>
                      Convert & Execute Migration
                    </h2>

                    <Grid>
                      <Column lg={8} md={4} sm={4}>
                        <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
                          <h3 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>
                            Conversion Scripts
                          </h3>
                          <p className="cds--body-long-01" style={{ marginBottom: '2rem' }}>
                            Our AI-powered conversion engine will analyze your uploaded files and generate optimized IBM DataStage jobs.
                          </p>

                          <div style={{ marginBottom: '1rem' }}>
                            <Button
                              kind="primary"
                              size="lg"
                              onClick={handleConversion}
                              disabled={conversionStatus === 'running' || !selectedConnection || uploadedFiles.length === 0}
                              renderIcon={conversionStatus === 'completed' ? CheckmarkFilled : Play}
                            >
                              {conversionStatus === 'idle' && 'Start Conversion'}
                              {conversionStatus === 'running' && 'Converting...'}
                              {conversionStatus === 'completed' && 'Conversion Complete'}
                            </Button>
                          </div>

                          {conversionStatus === 'running' && (
                            <div style={{ marginTop: '1rem' }}>
                              <ProgressBar
                                label="Conversion Progress"
                                value={conversionProgress}
                                max={100}
                                helperText={`${conversionProgress}% complete`}
                              />
                            </div>
                          )}

                          {conversionStatus === 'completed' && (
                            <>
                              <InlineNotification
                                kind="success"
                                subtitle="Your files have been successfully converted to IBM DataStage format"
                                title="Conversion Successful"
                                hideCloseButton
                              />
                              <div style={{ marginTop: '1rem' }}>
                                <Button kind="secondary" renderIcon={Download} onClick={handleDownload}>
                                  Download Output
                                </Button>
                              </div>
                            </>
                          )}
                        </Tile>
                      </Column>

                      <Column lg={8} md={4} sm={4}>
                        <Tile style={{ padding: '2rem' }}>
                          <h3 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>
                            Migration Summary
                          </h3>
                          <div style={{ marginBottom: '1rem' }}>
                            <p className="cds--label-01">Source Platform:</p>
                            <p className="cds--body-short-01">{selectedConnection || 'Not selected'}</p>
                          </div>
                          <div style={{ marginBottom: '1rem' }}>
                            <p className="cds--label-01">Files Uploaded:</p>
                            <p className="cds--body-short-01">{uploadedFiles.length} files</p>
                          </div>
                          <div style={{ marginBottom: '1rem' }}>
                            <p className="cds--label-01">Status:</p>
                            <p className="cds--body-short-01">
                              {conversionStatus === 'idle' && 'Ready to start'}
                              {conversionStatus === 'running' && 'Converting...'}
                              {conversionStatus === 'completed' && 'Completed successfully'}
                            </p>
                          </div>
                        </Tile>
                      </Column>
                    </Grid>

                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '2rem' }}>
                      <Button kind="secondary" onClick={handlePreviousTab}>
                        Previous
                      </Button>
                    </div>
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>
        </Column>
      </Grid>
    </div>
  );
};

export default DataStageMigration;
