import React, { useState } from 'react';
import {
  Grid,
  Column,
  Button,
  Tile,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Modal,
  TextInput,
  TextArea,
  Tag,
} from '@carbon/react';
import { Add, Settings, Edit } from '@carbon/icons-react';

interface DataValidationDashboardProps {
  onNavigate: (page: string) => void;
  onCreateWorkspace: (workspaceData: any) => void;
  onBack: () => void;
}

const DataValidationDashboard: React.FC<DataValidationDashboardProps> = ({ 
  onNavigate, 
  onCreateWorkspace,
  onBack 
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');

  const [workspaces] = useState([
    {
      id: '1',
      name: 'Teradata to DB2',
      description: 'Customer data migration',
      source: 'Teradata',
      target: 'DB2 Staging',
      status: 'Validated',
      lastRun: '2024-06-10 14:30'
    }
  ]);

  const summaryStats = [
    { label: 'Total Workspaces', value: '5', color: 'blue' },
    { label: 'Validated', value: '2', color: 'green' },
    { label: 'Drafts', value: '2', color: 'red' },
    { label: 'Connected', value: '1', color: 'purple' }
  ];

  const handleCreateWorkspace = () => {
    if (workspaceName.trim()) {
      const newWorkspace = {
        name: workspaceName,
        description: workspaceDescription
      };
      onCreateWorkspace(newWorkspace);
      setIsCreateModalOpen(false);
      setWorkspaceName('');
      setWorkspaceDescription('');
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig = {
      'Validated': { type: 'green', text: 'Validated' },
      'Draft': { type: 'gray', text: 'Draft' },
      'Connected': { type: 'blue', text: 'Connected' },
      'Failed': { type: 'red', text: 'Failed' }
    };
    
    const config = statusConfig[status] || statusConfig['Draft'];
    return <Tag type={config.type as any}>{config.text}</Tag>;
  };

  const headers = [
    { key: 'name', header: 'Workspace Name' },
    { key: 'description', header: 'Description' },
    { key: 'source', header: 'Source' },
    { key: 'target', header: 'Target' },
    { key: 'status', header: 'Status' },
    { key: 'lastRun', header: 'Last Run' },
    { key: 'actions', header: 'Actions' }
  ];

  const rows = workspaces.map(workspace => ({
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    source: workspace.source,
    target: workspace.target,
    status: workspace.status,
    lastRun: workspace.lastRun,
    actions: workspace.id
  }));

  return (
    <div className="cds--content" style={{ padding: '6rem 2rem 2rem' }}>
      <Grid className="cds--grid--full-width">
        <Column lg={16} md={8} sm={4}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Button
              kind="ghost"
              onClick={onBack}
              style={{ marginBottom: '2rem' }}
            >
              ← Back
            </Button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 className="cds--productive-heading-06" style={{ marginBottom: '0.5rem' }}>
                  Data Validation Dashboard
                </h1>
                <p className="cds--body-long-01" style={{ color: '#6f6f6f' }}>
                  Manage your database validation workspaces
                </p>
              </div>
              <Button
                kind="primary"
                renderIcon={Add}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create New Workspace
              </Button>
            </div>

            {/* Summary Statistics */}
            <Grid style={{ marginBottom: '3rem' }}>
              {summaryStats.map((stat, index) => (
                <Column lg={4} md={4} sm={4} key={index} style={{ marginBottom: '1rem' }}>
                  <Tile style={{ 
                    padding: '2rem', 
                    textAlign: 'center',
                    backgroundColor: stat.color === 'blue' ? '#e5f6ff' :
                                   stat.color === 'green' ? '#e8f5e8' :
                                   stat.color === 'red' ? '#ffe6e6' : '#f4e6ff'
                  }}>
                    <h2 className="cds--productive-heading-05" style={{ 
                      marginBottom: '0.5rem',
                      color: stat.color === 'blue' ? '#0f62fe' :
                             stat.color === 'green' ? '#198038' :
                             stat.color === 'red' ? '#da1e28' : '#8a3ffc'
                    }}>
                      {stat.value}
                    </h2>
                    <p className="cds--body-short-01" style={{ color: '#525252' }}>
                      {stat.label}
                    </p>
                  </Tile>
                </Column>
              ))}
            </Grid>

            {/* Workspaces Table */}
            <Tile style={{ padding: '2rem' }}>
              <h3 className="cds--productive-heading-04" style={{ marginBottom: '2rem' }}>
                Your Workspaces
              </h3>
              
              <DataTable
                rows={rows}
                headers={headers}
                render={({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
                  <TableContainer>
                    <Table {...getTableProps()}>
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader key={header.key} {...getHeaderProps({ header })}>
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id} {...getRowProps({ row })}>
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>
                                {cell.info.header === 'status' ? (
                                  getStatusTag(cell.value)
                                ) : cell.info.header === 'actions' ? (
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <Button 
                                      kind="ghost" 
                                      size="sm" 
                                      renderIcon={Settings}
                                      onClick={() => onNavigate('data-validation-tool')}
                                    >
                                      Configure
                                    </Button>
                                    <Button 
                                      kind="ghost" 
                                      size="sm" 
                                      renderIcon={Edit}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                ) : (
                                  cell.value
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              />
            </Tile>

            {/* Create Workspace Modal */}
            <Modal
              open={isCreateModalOpen}
              onRequestClose={() => setIsCreateModalOpen(false)}
              modalHeading="Create New Workspace"
              primaryButtonText="Create"
              secondaryButtonText="Cancel"
              onRequestSubmit={handleCreateWorkspace}
              preventCloseOnClickOutside
            >
              <div style={{ marginBottom: '1rem' }}>
                <TextInput
                  id="workspace-name"
                  labelText="Workspace Name"
                  placeholder="Enter workspace name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
              <div>
                <TextArea
                  id="workspace-description"
                  labelText="Description"
                  placeholder="Enter workspace description"
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </Modal>
          </div>
        </Column>
      </Grid>
    </div>
  );
};

export default DataValidationDashboard;
