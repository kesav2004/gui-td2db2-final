
import React from 'react';
import QuestionnaireBase from '../QuestionnaireBase';

interface OracleModernizationQuestionnaireProps {
  onNavigate: (page: string) => void;
}

const OracleModernizationQuestionnaire: React.FC<OracleModernizationQuestionnaireProps> = ({ onNavigate }) => {
  const content = `This questionnaire is used to collect metrics that help provide an estimate of effort for Oracle database modernization. The target database and tools are assumed to be the current generally available release on Linux®, Unix®, or Windows® platforms.

Customer Information: Please provide your company details and contact information.

Point of Contact Information: Who is the main contact for this modernization project?

General Information: Please provide a brief description of your goals/outcome expected from the database modernization.

What are the time frames for the project?

Database Information: Please provide the following information for each database being migrated.

Target Modernization Database: What is your target database platform?

Application Implementation: How are your applications currently implemented?

List secondary database names, vendors and versions: What other databases are in your environment?

Development/Maintenance/Testing: Please provide any on-going, new, or anticipated development efforts and their corresponding implementation dates.

Documentation: What documentation do you currently have available?

Any additional comments that help to describe your system?

`;

  return (
    <QuestionnaireBase
      title="Oracle Modernization Questionnaire"
      content={content}
      onNavigate={onNavigate}
    />
  );
};

export default OracleModernizationQuestionnaire;
