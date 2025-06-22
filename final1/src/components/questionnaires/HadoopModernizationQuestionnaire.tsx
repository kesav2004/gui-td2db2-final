
import React from 'react';
import QuestionnaireBase from '../QuestionnaireBase';

interface HadoopModernizationQuestionnaireProps {
  onNavigate: (page: string) => void;
}

const HadoopModernizationQuestionnaire: React.FC<HadoopModernizationQuestionnaireProps> = ({ onNavigate }) => {
  const content = `Hadoop Modernization Pre-Workshop Questionnaire

Environment Overview: Describe your current Hadoop environment setup.

Current Hadoop Environment: What version and distribution are you currently using?

Cluster Configuration: How is your cluster currently configured?

Data Volume and Growth: What is your current data volume and expected growth?

Workload Analysis: Describe your current workload patterns.

Processing Frameworks: What processing frameworks are you currently using?

Workload Patterns: What are your typical workload patterns?

Performance Metrics: What are your current performance metrics?

Data Management: How do you currently manage your data?

Data Storage: What storage solutions are you using?

Data Ingestion: How do you currently ingest data?

Data Quality and Governance: What data quality and governance processes do you have?

User and Application Integration: How do users and applications integrate with your system?

User Community: Who are your primary users?

Integration Points: What are your key integration points?

Access Patterns: How do users typically access the data?

Modernization Considerations: What are your modernization goals?

Modernization Approach: What approach do you want to take for modernization?

Testing and Validation: How will you test and validate the modernized system?

Rollback Strategy: What is your rollback strategy if issues arise?

Additional Information: Any additional documentation or information?

Documentation: What documentation do you currently have?`;

  return (
    <QuestionnaireBase
      title="Hadoop Modernization Pre-Workshop Questionnaire"
      content={content}
      onNavigate={onNavigate}
    />
  );
};

export default HadoopModernizationQuestionnaire;
