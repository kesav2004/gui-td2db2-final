import React, { useState } from 'react';
import {
  Grid,
  Column,
  Accordion,
  AccordionItem,
  Link
} from '@carbon/react';

const Footer: React.FC = () => {
  const [contactExpanded, setContactExpanded] = useState(false);
  const [faqExpanded, setFaqExpanded] = useState(false);

  const faqs = [
    {
      question: "What is the Database Migration tool?",
      answer: "The Database Migration tool automates the conversion of Teradata database schemas, tables, and stored procedures to DB2 format with minimal manual intervention."
    },
    {
      question: "How do I start a DataStage migration?",
      answer: "Navigate to the DataStage Migration page, select your source platform, upload your ETL files, and use our conversion engine to generate IBM DataStage jobs."
    },
    {
      question: "Can I migrate from platforms other than Teradata?",
      answer: "Currently, the platform primarily supports Teradata to DB2 migrations, but we're expanding to include other database platforms in future updates."
    },
    {
      question: "Is my data secure during migration?",
      answer: "Yes, we prioritize data security. All uploads and migrations are processed in secure environments with encryption at rest and in transit."
    }
  ];

  return (
    <footer style={{ 
      backgroundColor: '#161616', 
      color: 'white', 
      padding: '3rem 0 2rem',
      marginTop: '0',
      width: '100%'
    }}>
      <Grid className="cds--grid--full-width">
        <Column lg={16} md={8} sm={4}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
            <Grid>
              <Column lg={4} md={2} sm={4}>
                <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem', color: 'white' }}>
                  IBM Migration Dashboard
                </h4>
                <p className="cds--body-short-01" style={{ color: 'white' }}>
                  Modernizing data infrastructure with intelligent automation
                </p>
              </Column>
              
              <Column lg={3} md={2} sm={4}>
                <h5 className="cds--productive-heading-02" style={{ marginBottom: '1rem', color: 'white' }}>
                  Solutions
                </h5>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}><Link href="#" style={{ color: 'white' }}>Database Migration</Link></li>
                  <li style={{ marginBottom: '0.5rem' }}><Link href="#" style={{ color: 'white' }}>DataStage Migration</Link></li>
                </ul>
              </Column>

              <Column lg={3} md={2} sm={4}>
                <h5 className="cds--productive-heading-02" style={{ marginBottom: '1rem', color: 'white' }}>
                  About Us
                </h5>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}><Link href="https://www.ibm.com/in-en" style={{ color: 'white' }}>Company</Link></li>
                  <li style={{ marginBottom: '0.5rem' }}><Link href="https://www.ibm.com/in-en/careers" style={{ color: 'white' }}>Careers</Link></li>
                </ul>
              </Column>

              <Column lg={3} md={2} sm={4}>
                <h5 className="cds--productive-heading-02" style={{ marginBottom: '1rem', color: 'white' }}>
                  Legal
                </h5>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}><Link href="https://www.ibm.com/privacy" style={{ color: 'white' }}>Privacy Policy</Link></li>
                  <li style={{ marginBottom: '0.5rem' }}><Link href="https://www.ibm.com/legal" style={{ color: 'white' }}>Terms & Conditions</Link></li>
                </ul>
              </Column>
              
              <Column lg={3} md={2} sm={4}>
                <div>
                  <Accordion>
                    <AccordionItem 
                      title={<span style={{ color: 'white' }}>Contact Us</span>}
                      open={contactExpanded}
                      onClick={() => setContactExpanded(!contactExpanded)}
                    >
                      <div style={{ padding: '1rem', color: 'white' }}>
                        <Grid>
                          <Column lg={8} md={4} sm={4}>
                            <p><strong>Email:</strong> migration-support@ibm.com</p>
                            <p><strong>Phone:</strong> +1 (800) 123-4567</p>
                          </Column>
                          <Column lg={8} md={4} sm={4}>
                            <p><strong>Hours:</strong> Monday-Friday, 9am-5pm ET</p>
                            <p>
                              <strong>Address:</strong><br />
                              IBM Corporation, 1 New Orchard Road, Armonk, NY 10504-1722, US
                            </p>
                          </Column>
                        </Grid>
                      </div>
                    </AccordionItem>
                    
                    <AccordionItem 
                      title={<span style={{ color: 'white' }}>Frequently Asked Questions</span>}
                      open={faqExpanded}
                      onClick={() => setFaqExpanded(!faqExpanded)}
                    >
                      <div style={{ padding: '1rem', color: 'white' }}>
                        <Grid>
                          <Column lg={8} md={4} sm={4}>
                            {faqs.slice(0, 2).map((faq, index) => (
                              <div key={index} style={{ marginBottom: '1rem' }}>
                                <p><strong>Q: {faq.question}</strong></p>
                                <p>A: {faq.answer}</p>
                              </div>
                            ))}
                          </Column>
                          <Column lg={8} md={4} sm={4}>
                            {faqs.slice(2).map((faq, index) => (
                              <div key={index + 2} style={{ marginBottom: '1rem' }}>
                                <p><strong>Q: {faq.question}</strong></p>
                                <p>A: {faq.answer}</p>
                              </div>
                            ))}
                          </Column>
                        </Grid>
                      </div>
                    </AccordionItem>
                  </Accordion>
                </div>
              </Column>
              
              <Column lg={16} md={8} sm={4} style={{ marginTop: '2rem' }}>
                <p className="cds--body-short-01" style={{ color: 'white', textAlign: 'center' }}>
                  © 2025 IBM Corporation. All rights reserved.
                </p>
              </Column>
            </Grid>
          </div>
        </Column>
      </Grid>
    </footer>
  );
};

export default Footer;
