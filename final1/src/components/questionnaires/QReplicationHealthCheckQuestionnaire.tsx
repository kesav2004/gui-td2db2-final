
import React from 'react';
import QuestionnaireBase from '../QuestionnaireBase';

interface QReplicationHealthCheckQuestionnaireProps {
  onNavigate: (page: string) => void;
}

const QReplicationHealthCheckQuestionnaire: React.FC<QReplicationHealthCheckQuestionnaireProps> = ({ onNavigate }) => {
  const content = `Q-Replication Health Check Questionnaire

What is db2 version?

Is it appliance or DB2 on Cloud on On-Prim?

What is the distance between database servers configured in Q-Replication?

Are the Compute and Storage etc. same on Primary as well as DR Servers?

What is the current cross-site network bandwidth between these servers today and is that shared with multiple applications or dedicated?

What is total size of the database?

What is the size of the largest table (in GB/TB)?

What is the MIN/MAX of daily transactional volume (in GB or TB per day) for changed data on your Source system targeted for replication?

Do you currently have Primary Keys (or some unique constraint) defined for most of your database tables? Do you leverage Sequences or Identity Columns as part of your data models?

Is it Row Based Replication or Columnar Based?

How many Replication Sets are there and in each replication set how many tables are there?

Currently Supported DDL Operations: Please review the supported DDL operations.

Replication of data is only supported. Views/Stored Procedures cannot be replicated.

Please share the below for initial analysis:
 `;

  return (
    <QuestionnaireBase
      title="Q-Replication Health Check Questionnaire"
      content={content}
      onNavigate={onNavigate}
    />
  );
};

export default QReplicationHealthCheckQuestionnaire;
