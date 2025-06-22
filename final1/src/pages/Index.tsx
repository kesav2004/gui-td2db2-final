import React, { useState } from 'react';
import DashboardNav from '../components/DashboardNav';
import HomePage from '../components/HomePage';
import DatabaseMigration from '../components/DatabaseMigration';
import DataStageMigration from '../components/DataStageMigration';
import DataValidation from '../components/DataValidation';
import DataMovement from '../components/DataMovement';
import DataValidationDashboard from '../components/DataValidationDashboard';
import { ValidationReport } from '../components/ValidationReport';
import SidebarNav from '../components/SidebarNav';
import Footer from '../components/Footer';
import TeradataMigrationQuestionnaire from '../components/questionnaires/TeradataMigrationQuestionnaire';
import HadoopModernizationQuestionnaire from '../components/questionnaires/HadoopModernizationQuestionnaire';
import OracleModernizationQuestionnaire from '../components/questionnaires/OracleModernizationQuestionnaire';
import QReplicationHealthCheckQuestionnaire from '../components/questionnaires/QReplicationHealthCheckQuestionnaire';
import IBMDataReplicationQuestionnaire from '../components/questionnaires/IBMDataReplicationQuestionnaire';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [validationResults, setValidationResults] = useState(null);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);

  // Mock validation results data
  const mockValidationResults = {
    totalRows: 10000,
    matchingRows: 9850,
    mismatchedRows: 150,
    countDifference: 0,
    checksumMatch: true,
    details: [
      { column: 'customer_id', source: '12345', target: '12345', status: 'match' },
      { column: 'customer_name', source: 'John Doe', target: 'John Doe', status: 'match' },
      { column: 'email', source: 'john@example.com', target: 'john.doe@example.com', status: 'mismatch' },
      { column: 'phone', source: '555-0123', target: '555-0123', status: 'match' },
      { column: 'address', source: '123 Main St', target: '123 Main Street', status: 'mismatch' },
    ]
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCreateWorkspace = (workspaceData: any) => {
    console.log('Creating workspace:', workspaceData);
    setCurrentWorkspace(workspaceData);
    setCurrentPage('data-validation-tool');
  };

  const handleCompareData = () => {
    setValidationResults(mockValidationResults);
    setCurrentPage('validation-results');
  };

  const handleResetValidation = () => {
    setValidationResults(null);
    setCurrentPage('data-validation-dashboard');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'database-migration':
        return <DatabaseMigration />;
      case 'datastage-migration':
        return <DataStageMigration />;
      case 'data-validation-dashboard':
        return (
          <DataValidationDashboard 
            onNavigate={setCurrentPage} 
            onCreateWorkspace={handleCreateWorkspace}
            onBack={() => setCurrentPage('home')}
          />
        );
      case 'data-validation-tool':
        return (
          <DataValidation 
            onNavigate={setCurrentPage} 
            onCompareData={handleCompareData}
            workspaceData={currentWorkspace}
          />
        );
      case 'validation-results':
        return (
          <ValidationReport 
            runId={validationResults?.runId}
          />
        );
      case 'data-movement':
        return <DataMovement onNavigate={setCurrentPage} />;
      case 'questionnaire-teradata-migration':
        return <TeradataMigrationQuestionnaire onNavigate={setCurrentPage} />;
      case 'questionnaire-hadoop-modernization':
        return <HadoopModernizationQuestionnaire onNavigate={setCurrentPage} />;
      case 'questionnaire-oracle-modernization':
        return <OracleModernizationQuestionnaire onNavigate={setCurrentPage} />;
      case 'questionnaire-q-replication-health':
        return <QReplicationHealthCheckQuestionnaire onNavigate={setCurrentPage} />;
      case 'questionnaire-ibm-data-replication':
        return <IBMDataReplicationQuestionnaire onNavigate={setCurrentPage} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DashboardNav 
        onNavigate={setCurrentPage} 
        currentPage={currentPage}
        onToggleSidebar={handleToggleSidebar}
      />
      <div style={{ display: 'flex', flex: 1 }}>
        <SidebarNav 
          onNavigate={setCurrentPage}
          currentPage={currentPage}
          isOpen={sidebarOpen}
        />
        <main style={{ flex: 1, backgroundColor: '#f4f4f4' }}>
          {renderCurrentPage()}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Index;