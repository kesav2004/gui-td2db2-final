
import React, { useState } from 'react';
import { Menu } from 'lucide-react';

const DatabaseMigration: React.FC = () => {
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarHidden(!isSidebarHidden);
  };

  return (
    <div style={{ 
      height: 'calc(100vh - 120px)', 
      width: '100%', 
      padding: '1rem',
      backgroundColor: '#f4f4f4',
      position: 'relative'
    }}>
      <button
        onClick={toggleSidebar}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          zIndex: 10,
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          padding: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
        title="Toggle Migration Dashboard Sidebar"
      >
        <Menu size={16} />
      </button>
      
      <iframe
        src="http://localhost:8000"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          marginLeft: isSidebarHidden ? '-250px' : '0',
          transition: 'margin-left 0.3s ease'
        }}
        title="Database Migration Dashboard"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
};

export default DatabaseMigration;
