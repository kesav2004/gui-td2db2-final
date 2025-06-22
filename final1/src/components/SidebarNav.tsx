
import React, { useState } from 'react';
import {
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
} from '@carbon/react';
import {
  Dashboard,
  DataBase,
  Flow,
  DocumentMultiple_01,
  ChevronDown,
  ChevronRight,
} from '@carbon/icons-react';

interface SidebarNavProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  isOpen?: boolean;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ 
  onNavigate, 
  currentPage,
  isOpen = true
}) => {
  const [isQuestionnaireExpanded, setIsQuestionnaireExpanded] = useState(false);

  const questionnaireItems = [
    { id: 'ibm-data-replication', title: 'IBM Data Replication for Continuous Availability' },
    { id: 'q-replication-health', title: 'Q-Replication Health Check' },
    { id: 'teradata-migration', title: 'Teradata Migration' },
    { id: 'hadoop-modernization', title: 'Hadoop Modernization Pre-Workshop Questionnaire' },
    { id: 'oracle-modernization', title: 'Oracle Modernization Questionnaire' },
  ];

  return (
    <SideNav 
      expanded={isOpen} 
      isFixedNav 
      aria-label="Side navigation" 
      style={{ 
        backgroundColor: '#f4f4f4', 
        height: '100%', 
        borderRight: '1px solid #e0e0e0',
        width: '350px'
      }}
    >
      <div style={{ paddingTop: '3rem' }}>
        <SideNavItems>
          <SideNavLink 
            renderIcon={Dashboard}
            href="#"
            isActive={currentPage === 'home'}
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }}
          >
            Home
          </SideNavLink>
          
          <SideNavLink 
            renderIcon={DataBase}
            href="#"
            isActive={currentPage === 'database-migration'}
            onClick={(e) => {
              e.preventDefault();
              onNavigate('database-migration');
            }}
          >
            Database Migration
          </SideNavLink>
          
          <SideNavLink 
            renderIcon={Flow}
            href="#"
            isActive={currentPage === 'datastage-migration'}
            onClick={(e) => {
              e.preventDefault();
              onNavigate('datastage-migration');
            }}
          >
            DataStage Migration
          </SideNavLink>

          <SideNavMenu
            renderIcon={DocumentMultiple_01}
            title="Questionnaire"
            isActive={currentPage.startsWith('questionnaire')}
          >
            {questionnaireItems.map((item) => (
              <SideNavMenuItem key={item.id}>
                <SideNavLink
                  href="#"
                  isActive={currentPage === `questionnaire-${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(`questionnaire-${item.id}`);
                  }}
                  style={{
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    lineHeight: '1.4',
                    padding: '0.75rem 1rem',
                    minHeight: 'auto'
                  }}
                >
                  {item.title}
                </SideNavLink>
              </SideNavMenuItem>
            ))}
          </SideNavMenu>
        </SideNavItems>
      </div>
    </SideNav>
  );
};

export default SidebarNav;
