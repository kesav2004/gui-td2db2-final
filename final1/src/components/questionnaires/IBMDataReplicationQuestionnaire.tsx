
import React from 'react';
import QuestionnaireBase from '../QuestionnaireBase';

interface IBMDataReplicationQuestionnaireProps {
  onNavigate: (page: string) => void;
}

const IBMDataReplicationQuestionnaire: React.FC<IBMDataReplicationQuestionnaireProps> = ({ onNavigate }) => {
  const content = `IBM Data Replication for Continuous Availability – Questionnaire

This document is meant to capture information related to customer business continuity as it relates to critical business applications utilizing IBM's hybrid data management portfolio for general business operations.

Business Drivers: What are the primary business objectives when it comes to business continuity and Disaster Recovery?

Is an outage acceptable for initial setup?

What are business requirements for RPO/RTO?

What are business requirements around elapsed time or latency between replicate servers?

Replication topology: What is the distance between database servers planned for replication use for continuous availability or disaster recovery for tier 1 or tier 2 level business applications?

What is the current cross-site network bandwidth between these servers today and is that shared with multiple applications or dedicated?

Primary use cases: Do you plan to use replication for workload balancing to offload queries to one or more Target replicate servers?

Will you use replication as part of your Build/Test/Deploy for new applications by leveraging Target replicate servers?

Do you plan to use replication to assure Disaster Recovery for your data, in the event your primary database server is lost? What are specific requirements for RTO/RPO in this area?

Do you plan to leverage replication to run two live versions of the same application in parallel, particularly for upgrades and migrations?

Supplemental Storage: What is total size of the database (in TB)?

What is the size of the largest table (in GB/TB)?

What is the MIN/MAX of daily transactional volume (in GB or TB per day) for changed data on your Source system targeted for replication?

How do you plan to perform Initial Load of your data from Primary server to Secondary server?

Are you open to leveraging external SAN/NAS for supplemental storage?

DDL support: What type of DDL is performed in BULK or with high frequency as part of regular operations?

Application workloads: Do you have a maintenance window for deploying application upgrades to production system during which you take the server offline?

Are you planning to leverage Active-Active or Active-Standby deployment?

Are you planning to leverage only Failover to Secondary server scenario? OR also plan to leverage Fallback to Primary server when it is back from maintenance or disaster?

Do you currently have Primary Keys (or some unique constraint) defined for most of your database tables?

Do you leverage Sequences or Identity Columns as part of your data models?

Do you plan to use both row and column organized tables in the same schema? In the same transaction?

How many tables you plan to replicate as part of Replication Set?`;

  return (
    <QuestionnaireBase
      title="IBM Data Replication for Continuous Availability Questionnaire"
      content={content}
      onNavigate={onNavigate}
    />
  );
};

export default IBMDataReplicationQuestionnaire;
