
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SourceTargetStepProps = {
  sourceDb: string;
  targetDb: string;
  updateFormData: (key: string, value: string | boolean) => void;
}

const SourceTargetStep = ({ sourceDb, targetDb, updateFormData }: SourceTargetStepProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-carbon-gray-100">Source & Target Database</h2>
      <p className="text-carbon-gray-70">Select your source database type and target IBM database</p>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="sourceDb" className="carbon-label">Source Database</Label>
          <Select
            value={sourceDb}
            onValueChange={(value) => updateFormData("sourceDb", value)}
          >
            <SelectTrigger className="carbon-field">
              <SelectValue placeholder="Select source database" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="teradata">Teradata</SelectItem>
              <SelectItem value="oracle">Oracle</SelectItem>
              <SelectItem value="sqlserver">SQL Server</SelectItem>
              <SelectItem value="postgresql">PostgreSQL</SelectItem>
              <SelectItem value="mysql">MySQL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="targetDb" className="carbon-label">Target Database</Label>
          <Select
            value={targetDb}
            onValueChange={(value) => updateFormData("targetDb", value)}
          >
            <SelectTrigger className="carbon-field">
              <SelectValue placeholder="Select target database" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="db2">IBM Db2</SelectItem>
              <SelectItem value="db2-cloud">IBM Db2 on Cloud</SelectItem>
              <SelectItem value="db2-warehouse">IBM Db2 Warehouse</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default SourceTargetStep;
