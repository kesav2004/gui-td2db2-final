
import Layout from "@/components/layout/Layout";
import DatabaseConnector from "@/components/migration/DatabaseConnector";

const DatabaseConnections = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-carbon-gray-100">Database Connections</h1>
          <p className="text-carbon-gray-70 mt-1">
            Configure your source and target database connections
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DatabaseConnector type="source" title="Source Database" />
          <DatabaseConnector type="target" title="Target Database" />
        </div>
      </div>
    </Layout>
  );
};

export default DatabaseConnections;
