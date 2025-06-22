import React, { useEffect, useState } from 'react';
import {
  Grid,
  Column,
  Tile,
  Tag,
  Loading,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Accordion,
  AccordionItem,
  InlineNotification,
} from '@carbon/react';

interface ValidationReportProps {
  runId?: string;
}

interface ValidationReport {
  detailed_report: {
    tables: Array<{
      name: string;
      checksum: {
        source: string;
        target: string;
        match: boolean;
      };
      timing: {
        source: {
          start: string;
          end: string;
          elapsed: string;
        };
        target: {
          start: string;
          end: string;
          elapsed: string;
        };
      };
      differences: {
        source_missing: string[];
        target_missing: string[];
        field_mismatches: string[];
      };
    }>;
  };
  consolidated_report: {
    tables: Array<{
      table_name: string;
      source_rows: number;
      target_rows: number;
      source_missing: number;
      target_missing: number;
      field_mismatches: number;
    }>;
  };
  summary: {
    total_tables: number;
    total_differences: number;
    tables_with_differences: number;
    total_source_rows: number;
    total_target_rows: number;
  };
  job_info: {
    start_time: string;
    end_time: string;
  };
}

export function ValidationReport({ runId }: ValidationReportProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/validation-report");
        const data = await response.json();
        
        if (data.success) {
          setReport(data.report);
          setError(null);
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

    fetchReport();
  }, [runId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '64px' }}>
        <Loading 
          description="Loading validation report..."
          withOverlay={false}
        />
      </div>
    );
  }

  if (error) {
    return (
      <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          style={{ marginBottom: '1rem' }}
          role="alert"
          onCloseButtonClick={() => {}}
        />
      </Tile>
    );
  }

  if (!report) {
    return (
      <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="cds--productive-heading-04">No Report Available</h3>
        <p className="cds--body-long-01">No validation report has been generated yet.</p>
      </Tile>
    );
  }

  return (
    <div className="cds--content" style={{ padding: '2rem' }}>
      {/* Summary Section */}
      <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>
          Validation Summary
        </h3>
        <p className="cds--body-short-01" style={{ marginBottom: '2rem', color: '#6f6f6f' }}>
          Job ran from {report.job_info.start_time} to {report.job_info.end_time}
        </p>

        <Grid>
          <Column lg={4} md={2} sm={2}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="cds--label-01">Total Tables</p>
              <p className="cds--productive-heading-03">{report.summary.total_tables}</p>
            </div>
          </Column>
          <Column lg={4} md={2} sm={2}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="cds--label-01">Tables with Differences</p>
              <p className="cds--productive-heading-03">{report.summary.tables_with_differences}</p>
            </div>
          </Column>
          <Column lg={4} md={2} sm={2}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="cds--label-01">Total Differences</p>
              <p className="cds--productive-heading-03">{report.summary.total_differences}</p>
            </div>
          </Column>
          <Column lg={4} md={2} sm={2}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="cds--label-01">Source Rows</p>
              <p className="cds--productive-heading-03">{report.summary.total_source_rows}</p>
            </div>
          </Column>
          <Column lg={4} md={2} sm={2}>
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="cds--label-01">Target Rows</p>
              <p className="cds--productive-heading-03">{report.summary.total_target_rows}</p>
            </div>
          </Column>
        </Grid>
      </Tile>

      {/* Consolidated Report Table */}
      <Tile style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>
          Consolidated Report
        </h3>
        <p className="cds--body-short-01" style={{ marginBottom: '2rem', color: '#6f6f6f' }}>
          Overview of all validated tables
        </p>

        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Table Name</TableHeader>
              <TableHeader style={{ textAlign: 'right' }}>Source Rows</TableHeader>
              <TableHeader style={{ textAlign: 'right' }}>Target Rows</TableHeader>
              <TableHeader style={{ textAlign: 'right' }}>Missing in Target</TableHeader>
              <TableHeader style={{ textAlign: 'right' }}>Missing in Source</TableHeader>
              <TableHeader style={{ textAlign: 'right' }}>Field Mismatches</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.consolidated_report.tables.map((table) => (
              <TableRow key={table.table_name}>
                <TableCell>{table.table_name}</TableCell>
                <TableCell style={{ textAlign: 'right' }}>{table.source_rows}</TableCell>
                <TableCell style={{ textAlign: 'right' }}>{table.target_rows}</TableCell>
                <TableCell style={{ textAlign: 'right' }}>
                  {table.source_missing > 0 ? (
                    <Tag type="red">{table.source_missing}</Tag>
                  ) : (
                    table.source_missing
                  )}
                </TableCell>
                <TableCell style={{ textAlign: 'right' }}>
                  {table.target_missing > 0 ? (
                    <Tag type="red">{table.target_missing}</Tag>
                  ) : (
                    table.target_missing
                  )}
                </TableCell>
                <TableCell style={{ textAlign: 'right' }}>
                  {table.field_mismatches > 0 ? (
                    <Tag type="red">{table.field_mismatches}</Tag>
                  ) : (
                    table.field_mismatches
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Tile>

      {/* Detailed Report Section */}
      <Tile style={{ padding: '2rem' }}>
        <h3 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>
          Detailed Report
        </h3>
        <p className="cds--body-short-01" style={{ marginBottom: '2rem', color: '#6f6f6f' }}>
          Detailed validation results for each table
        </p>

        <Accordion>
          {report.detailed_report.tables.map((table) => (
            <AccordionItem
              key={table.name}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>{table.name}</span>
                  {!table.checksum.match && (
                    <Tag type="red">Differences Found</Tag>
                  )}
                </div>
              }
            >
              <div style={{ padding: '1rem' }}>
                {/* Timing Information */}
                <Grid style={{ marginBottom: '2rem' }}>
                  <Column lg={8} md={4} sm={4}>
                    <h4 className="cds--productive-heading-02" style={{ marginBottom: '1rem' }}>Source Timing</h4>
                    <p className="cds--body-short-01">Start: {table.timing.source.start}</p>
                    <p className="cds--body-short-01">End: {table.timing.source.end}</p>
                    <p className="cds--body-short-01">Elapsed: {table.timing.source.elapsed}</p>
                  </Column>
                  <Column lg={8} md={4} sm={4}>
                    <h4 className="cds--productive-heading-02" style={{ marginBottom: '1rem' }}>Target Timing</h4>
                    <p className="cds--body-short-01">Start: {table.timing.target.start}</p>
                    <p className="cds--body-short-01">End: {table.timing.target.end}</p>
                    <p className="cds--body-short-01">Elapsed: {table.timing.target.elapsed}</p>
                  </Column>
                </Grid>

                {/* Differences */}
                {(table.differences.source_missing.length > 0 ||
                  table.differences.target_missing.length > 0 ||
                  table.differences.field_mismatches.length > 0) && (
                  <div>
                    {table.differences.source_missing.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 className="cds--productive-heading-02" style={{ marginBottom: '1rem' }}>
                          Rows Missing in Source
                        </h4>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e0e0e0', padding: '1rem' }}>
                          {table.differences.source_missing.map((row, idx) => (
                            <p key={idx} className="cds--body-short-01" style={{ marginBottom: '0.5rem' }}>{row}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {table.differences.target_missing.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 className="cds--productive-heading-02" style={{ marginBottom: '1rem' }}>
                          Rows Missing in Target
                        </h4>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e0e0e0', padding: '1rem' }}>
                          {table.differences.target_missing.map((row, idx) => (
                            <p key={idx} className="cds--body-short-01" style={{ marginBottom: '0.5rem' }}>{row}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {table.differences.field_mismatches.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 className="cds--productive-heading-02" style={{ marginBottom: '1rem' }}>
                          Field Mismatches
                        </h4>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e0e0e0', padding: '1rem' }}>
                          {table.differences.field_mismatches.map((mismatch, idx) => (
                            <p key={idx} className="cds--body-short-01" style={{ marginBottom: '0.5rem' }}>{mismatch}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AccordionItem>
          ))}
        </Accordion>
      </Tile>
    </div>
  );
} 