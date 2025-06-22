
import React, { useState } from 'react';
import { Grid, Column, Button, TextArea, Tile, Select, SelectItem } from '@carbon/react';

interface QuestionnaireBaseProps {
  title: string;
  content: string;
  onNavigate: (page: string) => void;
}

const QuestionnaireBase: React.FC<QuestionnaireBaseProps> = ({ title, content, onNavigate }) => {
  const [responses, setResponses] = useState<{ [key: string]: string }>({});

  const handleResponseChange = (questionIndex: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  const handleCustomResponseChange = (questionIndex: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [`${questionIndex}_custom`]: value
    }));
  };

  const handleSubmit = () => {
    const finalResponses: { [key: string]: string } = {};
    
    Object.keys(responses).forEach(key => {
      if (key.endsWith('_custom')) {
        const baseKey = key.replace('_custom', '');
        if (responses[baseKey] === 'custom') {
          finalResponses[baseKey] = responses[key];
        }
      } else if (!responses[`${key}_custom`] || responses[key] !== 'custom') {
        finalResponses[key] = responses[key];
      }
    });

    console.log('Questionnaire Responses:', finalResponses);
    alert('Questionnaire responses saved successfully!');
  };

  const getDefaultAnswers = (questionText: string) => {
    const lowerQuestion = questionText.toLowerCase();
    
    if (lowerQuestion.includes('ibm data replication')) {
      return ['Yes, we use IBM Data Replication', 'No, we do not use it', 'We are evaluating it'];
    } else if (lowerQuestion.includes('q-replication')) {
      return ['Currently using Q-Replication', 'Planning to implement', 'Not using Q-Replication'];
    } else if (lowerQuestion.includes('teradata')) {
      return ['Yes, we have Teradata environment', 'No Teradata currently', 'Planning migration from Teradata'];
    } else if (lowerQuestion.includes('hadoop')) {
      return ['Active Hadoop cluster', 'Legacy Hadoop setup', 'No Hadoop environment'];
    } else if (lowerQuestion.includes('oracle')) {
      return ['Oracle Database in use', 'Oracle applications deployed', 'No Oracle systems'];
    }
    
    return ['Yes', 'No', 'Maybe'];
  };

  const combineQuestions = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    const combinedQuestions: { [key: string]: string[] } = {};
    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip headers and non-question lines
      if (trimmedLine.toLowerCase().includes('questionnaire') ||
          trimmedLine.toLowerCase().includes('information') ||
          trimmedLine.toLowerCase().includes('overview') ||
          trimmedLine.toLowerCase().includes('section') ||
          trimmedLine.length <= 5) {
        continue;
      }
      
      if (trimmedLine.endsWith(':') && !trimmedLine.endsWith('?:')) {
        currentSection = trimmedLine;
        if (!combinedQuestions[currentSection]) {
          combinedQuestions[currentSection] = [];
        }
      } else if ((trimmedLine.endsWith('?') || trimmedLine.includes('?')) && trimmedLine.length > 5) {
        if (currentSection && combinedQuestions[currentSection]) {
          combinedQuestions[currentSection].push(trimmedLine);
        } else {
          // Create a general section for standalone questions
          const generalSection = 'General Questions:';
          if (!combinedQuestions[generalSection]) {
            combinedQuestions[generalSection] = [];
          }
          combinedQuestions[generalSection].push(trimmedLine);
        }
      }
    }
    
    return combinedQuestions;
  };

  const renderCombinedQuestions = () => {
    const combinedQuestions = combineQuestions(content);
    
    return Object.entries(combinedQuestions).map(([section, questions], sectionIndex) => {
      if (questions.length === 0) return null;
      
      return (
        <div key={sectionIndex} style={{ marginBottom: '3rem' }}>
          <h3 className="cds--productive-heading-04" style={{ marginBottom: '1.5rem', color: '#161616' }}>
            {section}
          </h3>
          
          {questions.map((question, questionIndex) => {
            const questionKey = `section-${sectionIndex}-question-${questionIndex}`;
            const defaultAnswers = getDefaultAnswers(question);
            const selectedValue = responses[questionKey] || '';
            
            return (
              <div key={questionIndex} style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f4f4f4', borderRadius: '8px' }}>
                <h4 className="cds--productive-heading-03" style={{ marginBottom: '1rem' }}>
                  {question}
                </h4>
                
                <Select
                  id={`select-${questionKey}`}
                  labelText="Select Response"
                  value={selectedValue}
                  onChange={(e) => handleResponseChange(questionKey, e.target.value)}
                  style={{ marginBottom: '1rem' }}
                >
                  <SelectItem value="" text="Choose an option" />
                  {defaultAnswers.map((answer, index) => (
                    <SelectItem key={index} value={answer} text={answer} />
                  ))}
                  <SelectItem value="custom" text="Enter custom response" />
                </Select>
                
                {selectedValue && selectedValue !== 'custom' && (
                  <div style={{ 
                    padding: '0.75rem', 
                    backgroundColor: '#e8f5e8', 
                    borderRadius: '4px',
                    marginBottom: '1rem',
                    border: '1px solid #42be65'
                  }}>
                    <strong>Selected:</strong> {selectedValue}
                  </div>
                )}
                
                {selectedValue === 'custom' && (
                  <div style={{ marginTop: '1rem' }}>
                    <TextArea
                      id={`custom-response-${questionKey}`}
                      labelText="Enter your custom response"
                      placeholder="Type your response here..."
                      rows={4}
                      value={responses[`${questionKey}_custom`] || ''}
                      onChange={(e) => handleCustomResponseChange(questionKey, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    });
  };

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
            
            <h1 className="cds--productive-heading-06" style={{ marginBottom: '1rem' }}>
              {title}
            </h1>
            
            <Tile style={{ padding: '2rem', marginBottom: '2rem', backgroundColor: 'white' }}>
              {renderCombinedQuestions()}
              
              <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                <Button
                  kind="primary"
                  size="lg"
                  onClick={handleSubmit}
                >
                  Submit Questionnaire
                </Button>
              </div>
            </Tile>
          </div>
        </Column>
      </Grid>
    </div>
  );
};

export default QuestionnaireBase;
