
import React from 'react';
import {
  Grid,
  Column,
  Tile,
  Button,
  ClickableTile,
} from '@carbon/react';
import { DataBase, Flow, CheckmarkOutline, Move } from '@carbon/icons-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="cds--content">
      {/* Hero Section - Full Width */}
      <div style={{ 
        backgroundColor: '#0f62fe', 
        color: 'white', 
        padding: '4rem 0',
        textAlign: 'center',
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
        marginRight: 'calc(-50vw + 50%)'
      }}>
        <h1 className="cds--productive-heading-06">
          TEL GDC Migration Automation
        </h1>
        <p className="cds--body-long-02" style={{ marginTop: '1rem', color: '#e5f6ff' }}>
          Streamline your database and DataStage migration process with our intelligent automation platform
        </p>
      </div>

      {/* Main Content */}
      <Grid className="cds--grid--full-width" style={{ padding: '2rem 0' }}>
        <Column lg={16} md={8} sm={4}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
            
            {/* Introduction Section */}
            <div style={{ marginBottom: '3rem' }}>
              <h2 className="cds--productive-heading-05" style={{ marginBottom: '1rem' }}>
                Modernize Your Data Infrastructure
              </h2>
              <p className="cds--body-long-02">
                Our AI agent automates the complex process of migrating from Teradata to DB2, 
                ensuring data integrity, optimal performance, and minimal downtime. Choose your migration path below.
              </p>
            </div>

            {/* Migration Options Cards */}
            <Grid>
              <Column lg={8} md={4} sm={4} style={{ marginBottom: '2rem' }}>
                <ClickableTile
                  className="card-shadow"
                  style={{ 
                    height: '350px', 
                    padding: '2rem',
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onClick={() => onNavigate('database-migration')}
                >
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <DataBase size={48} style={{ color: '#0f62fe', marginBottom: '1rem' }} />
                    <h3 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>
                      Database Modernization
                    </h3>
                    <p className="cds--body-long-01" style={{ color: '#525252', marginBottom: '2rem' }}>
                      Migrate your Teradata database schemas, tables, views, and stored procedures 
                      to DB2 with automated conversion and optimization.
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Button kind="primary" size="md">
                      Start Database Modernization
                    </Button>
                  </div>
                </ClickableTile>
              </Column>

              <Column lg={8} md={4} sm={4} style={{ marginBottom: '2rem' }}>
                <ClickableTile
                  className="card-shadow"
                  style={{ 
                    height: '350px', 
                    padding: '2rem',
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onClick={() => onNavigate('datastage-migration')}
                >
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <Flow size={48} style={{ color: '#0f62fe', marginBottom: '1rem' }} />
                    <h3 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>
                      DataStage Modernization
                    </h3>
                    <p className="cds--body-long-01" style={{ color: '#525252', marginBottom: '2rem' }}>
                      Convert and migrate your ETL processes from various platforms including 
                      DataStage, Informatica, SSIS, and more to IBM DataStage.
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Button kind="primary" size="md">
                      Start DataStage Modernization
                    </Button>
                  </div>
                </ClickableTile>
              </Column>

              <Column lg={8} md={4} sm={4} style={{ marginBottom: '2rem' }}>
                <ClickableTile
                  className="card-shadow"
                  style={{ 
                    height: '350px', 
                    padding: '2rem',
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onClick={() => onNavigate('data-validation-dashboard')}
                >
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <CheckmarkOutline size={48} style={{ color: '#0f62fe', marginBottom: '1rem' }} />
                    <h3 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>
                      Data Validation
                    </h3>
                    <p className="cds--body-long-01" style={{ color: '#525252', marginBottom: '2rem' }}>
                      Validate data integrity between source and target databases with comprehensive 
                      checksum, row comparison, and count difference analysis.
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Button kind="primary" size="md">
                      Start Data Validation
                    </Button>
                  </div>
                </ClickableTile>
              </Column>

              <Column lg={8} md={4} sm={4} style={{ marginBottom: '2rem' }}>
                <ClickableTile
                  className="card-shadow"
                  style={{ 
                    height: '350px', 
                    padding: '2rem',
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onClick={() => onNavigate('data-movement')}
                >
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <Move size={48} style={{ color: '#0f62fe', marginBottom: '1rem' }} />
                    <h3 className="cds--productive-heading-04" style={{ marginBottom: '1rem' }}>
                      Data Movement
                    </h3>
                    <p className="cds--body-long-01" style={{ color: '#525252', marginBottom: '2rem' }}>
                      Transfer data efficiently between source and target connections using JDBC 
                      with comprehensive schema comparison and table management.
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Button kind="primary" size="md">
                      Start Data Movement
                    </Button>
                  </div>
                </ClickableTile>
              </Column>
            </Grid>

            {/* Features Section */}
            <div style={{ marginTop: '4rem', marginBottom: '3rem' }}>
              <h2 className="cds--productive-heading-05" style={{ marginBottom: '2rem' }}>
                Key Features
              </h2>
              <Grid>
                <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Tile style={{ 
                    padding: '2rem', 
                    backgroundColor: '#e5f6ff', 
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>AI-Powered Analysis</h4>
                    <p className="cds--body-short-01">
                      Intelligent code analysis and automatic conversion recommendations
                    </p>
                  </Tile>
                </Column>
                <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Tile style={{ 
                    padding: '2rem', 
                    backgroundColor: '#e5f6ff', 
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>Multi-Platform Support</h4>
                    <p className="cds--body-short-01">
                      Support for DataStage, Informatica, SSIS, OBIEE, MuleSoft, and Talend
                    </p>
                  </Tile>
                </Column>
                <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Tile style={{ 
                    padding: '2rem', 
                    backgroundColor: '#e5f6ff', 
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>Automated Conversion</h4>
                    <p className="cds--body-short-01">
                      Streamlined conversion process with minimal manual intervention
                    </p>
                  </Tile>
                </Column>
                <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Tile style={{ 
                    padding: '2rem', 
                    backgroundColor: '#e5f6ff', 
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>Real-time Monitoring</h4>
                    <p className="cds--body-short-01">
                      Track migration progress with comprehensive monitoring and reporting
                    </p>
                  </Tile>
                </Column>
                <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Tile style={{ 
                    padding: '2rem', 
                    backgroundColor: '#e5f6ff', 
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>Data Validation</h4>
                    <p className="cds--body-short-01">
                      Ensure data integrity with automated validation and quality checks
                    </p>
                  </Tile>
                </Column>
                <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Tile style={{ 
                    padding: '2rem', 
                    backgroundColor: '#e5f6ff', 
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>Expert Support</h4>
                    <p className="cds--body-short-01">
                      24/7 technical support from migration experts and specialists
                    </p>
                  </Tile>
                </Column>
                <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Tile style={{ 
                    padding: '2rem', 
                    backgroundColor: '#e5f6ff', 
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>Cloud Integration</h4>
                    <p className="cds--body-short-01">
                      Seamless integration with IBM Cloud and hybrid cloud environments
                    </p>
                  </Tile>
                </Column>
                <Column lg={4} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                  <Tile style={{ 
                    padding: '2rem', 
                    backgroundColor: '#e5f6ff', 
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>Security Compliance</h4>
                    <p className="cds--body-short-01">
                      Enterprise-grade security with compliance to industry standards
                    </p>
                  </Tile>
                </Column>
              </Grid>
            </div>
          </div>
        </Column>
      </Grid>
    </div>
  );
};

export default HomePage;
