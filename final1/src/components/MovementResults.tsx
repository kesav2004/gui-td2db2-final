
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
  Tag,
  ProgressBar,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
} from '@carbon/react';

interface MovementResultsProps {
  results: any;
  onNavigate: (page: string) => void;
  onReset: () => void;
}

const MovementResults: React.FC<MovementResultsProps> = ({ results, onNavigate, onReset }) => {
  const [showDetails, setShowDetails] = useState(true);

  const summaryData = [
    { metric: 'Total Tables', value: results.totalTables.toLocaleString(), status: 'info' },
    { metric: 'Tables Moved', value: results.tablesMoved.toLocaleString(), status: 'success' },
    { metric: 'Failed Tables', value: results.failedTables.toLocaleString(), status: results.failedTables > 0 ? 'error' : 'success' },
    { metric: 'Success Rate', value: `${((results.tablesMoved / results.totalTables) * 100).toFixed(2)}%`, status: results.tablesMoved === results.totalTables ? 'success' : 'warning' },
  ];

  const detailHeaders = [
    { key: 'tableName', header: 'Table Name' },
    { key: 'rows', header: 'Rows Moved' },
    { key: 'duration', header: 'Duration' },
    { key: 'status', header: 'Status' },
  ];

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'success':
        return <Tag type="green">Success</Tag>;
      case 'failed':
        return <Tag type="red">Failed</Tag>;
      case 'warning':
        return <Tag type="magenta">Warning</Tag>;
      default:
        return <Tag type="gray">Unknown</Tag>;
    }
  };

  const getMetricTag = (status: string) => {
    switch (status) {
      case 'success':
        return <Tag type="green">Good</Tag>;
      case 'warning':
        return <Tag type="magenta">Warning</Tag>;
      case 'error':
        return <Tag type="red">Error</Tag>;
      default:
        return <Tag type="blue">Info</Tag>;
    }
  };

  const exportResults = (format: string) => {
    console.log(`Exporting results in ${format} format`);
    // Implementation would go here
  };

  return (
    <div className="cds--content" style={{ padding: '6rem 2rem 2rem' }}>
      <Grid className="cds--grid--full-width">
        <Column lg={16} md={8} sm={4}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h1 className="cds--productive-heading-06">
                Data Movement Results
              </h1>
              <div>
                <Button kind="secondary" onClick={onReset} style={{ marginRight: '1rem' }}>
                  Run New Movement
                </Button>
                <Button kind="ghost" onClick={() => onNavigate('home')}>
                  Back to Home
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <Grid style={{ marginBottom: '2rem' }}>
              {summaryData.map((item, index) => (
                <Column lg={4} md={4} sm={4} key={index} style={{ marginBottom: '1rem' }}>
                  <Tile style={{ 
                    padding: '1.5rem', 
                    textAlign: 'center',
                    backgroundColor: item.status === 'success' ? '#e8f5e8' : 
                                   item.status === 'warning' ? '#fff8e6' :
                                   item.status === 'error' ? '#ffe6e6' : '#e5f6ff'
                  }}>
                    <h3 className="cds--productive-heading-03" style={{ marginBottom: '0.5rem' }}>
                      {item.value}
                    </h3>
                    <p className="cds--body-short-01" style={{ marginBottom: '0.5rem' }}>
                      {item.metric}
                    </p>
                    {getMetricTag(item.status)}
                  </Tile>
                </Column>
              ))}
            </Grid>

            {/* Progress Bar */}
            <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>
                Movement Progress
              </h3>
              <ProgressBar 
                value={(results.tablesMoved / results.totalTables) * 100}
                max={100}
                label={`${results.tablesMoved} of ${results.totalTables} tables moved`}
              />
            </Tile>

            {/* Detailed Results */}
            <Tile style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="cds--productive-heading-04">
                  Table Movement Details
                </h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Button 
                    kind="ghost" 
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </Button>
                  <OverflowMenu>
                    <OverflowMenuItem itemText="Export as CSV" onClick={() => exportResults('csv')} />
                    <OverflowMenuItem itemText="Export as Excel" onClick={() => exportResults('excel')} />
                    <OverflowMenuItem itemText="Export as PDF" onClick={() => exportResults('pdf')} />
                  </OverflowMenu>
                </div>
              </div>

              {results.failedTables > 0 && (
                <InlineNotification
                  kind="error"
                  title="Movement Issues Found"
                  subtitle={`${results.failedTables} tables failed to move successfully`}
                  style={{ marginBottom: '1rem' }}
                />
              )}

              {showDetails && (
                <DataTable
                  rows={results.details.map((item, index) => ({ 
                    id: index.toString(), 
                    ...item 
                  }))}
                  headers={detailHeaders}
                  render={({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
                    <TableContainer title="Movement Details">
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
                                  {cell.info.header === 'status' 
                                    ? getStatusTag(cell.value)
                                    : cell.value
                                  }
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                />
              )}
            </Tile>
          </div>
        </Column>
      </Grid>
    </div>
  );
};

export default MovementResults;
