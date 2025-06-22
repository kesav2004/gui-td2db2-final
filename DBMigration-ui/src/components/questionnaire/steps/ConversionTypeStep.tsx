
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ConversionTypeStepProps = {
  conversionType: string;
  updateFormData: (key: string, value: string | boolean) => void;
}

const ConversionTypeStep = ({ conversionType, updateFormData }: ConversionTypeStepProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-carbon-gray-100">Conversion Type</h2>
      <p className="text-carbon-gray-70">Select the type of database objects you want to convert</p>
      
      <RadioGroup
        value={conversionType}
        onValueChange={(value) => updateFormData("conversionType", value)}
        className="space-y-3"
      >
        <div className="flex items-start space-x-2 border border-carbon-gray-30 p-4">
          <RadioGroupItem value="sql" id="sql" />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="sql" className="text-base font-medium">SQL Queries & Scripts</Label>
            <p className="text-sm text-carbon-gray-60">
              Convert standard SQL queries, DDL, and DML statements
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-2 border border-carbon-gray-30 p-4">
          <RadioGroupItem value="stored-procedures" id="stored-procedures" />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="stored-procedures" className="text-base font-medium">Stored Procedures</Label>
            <p className="text-sm text-carbon-gray-60">
              Convert procedural code like stored procedures, functions, and triggers
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-2 border border-carbon-gray-30 p-4">
          <RadioGroupItem value="both" id="both" />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="both" className="text-base font-medium">Both</Label>
            <p className="text-sm text-carbon-gray-60">
              Convert all types of SQL code (queries, DDL, DML, and procedural code)
            </p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
};

export default ConversionTypeStep;
