import React from 'react';
import QuestionnaireBase from '../QuestionnaireBase';

interface TeradataMigrationQuestionnaireProps {
  onNavigate: (page: string) => void;
}

const TeradataMigrationQuestionnaire: React.FC<TeradataMigrationQuestionnaireProps> = ({ onNavigate }) => {
  const content = `This questionnaire is used to collect metrics to support an estimation for a Teradata migration initiative. Please return the questionnaire to the sender. Thank you for your response.

Customer Information: Please provide your company details and contact information.

Primary Point of Contact Information: Who is the main contact person for this project?

Point of Contact for Database Information: Who can provide technical database details?

Point of Contact for Application Information: Who can provide application-specific information?

General Information: Please provide a brief description of your goal(s) for migrating from Teradata.

What are the time frames for the project?

Teradata Environment Information: Please provide the following information for each environment being migrated.

Rule of Thumb (ROT) to determine complexity of database objects: How complex are your current database objects?

`;

  return (
    <QuestionnaireBase
      title="Teradata Migration Questionnaire"
      content={content}
      onNavigate={onNavigate}
    />
  );
};

export default TeradataMigrationQuestionnaire;