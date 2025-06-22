
import Layout from "@/components/layout/Layout";
import FileUploader from "@/components/migration/FileUploader";
import { Info } from "lucide-react";

const ScriptUpload = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-carbon-gray-100">Upload SQL Scripts</h1>
          <p className="text-carbon-gray-70 mt-1">
            Upload SQL, BTEQ, or stored procedure scripts for conversion
          </p>
        </div>
        
        <div className="bg-carbon-blue bg-opacity-10 border-l-4 border-carbon-blue p-4 flex items-start gap-3">
          <Info size={20} className="text-carbon-blue mt-0.5" />
          <div>
            <h3 className="font-medium text-carbon-gray-100">Supported File Types</h3>
            <p className="text-carbon-gray-70 mt-1">
              You can upload .sql, .bteq, or .txt files containing SQL code. 
              For best results, each file should contain related queries or a single stored procedure.
            </p>
          </div>
        </div>
        
        <FileUploader />
      </div>
    </Layout>
  );
};

export default ScriptUpload;
