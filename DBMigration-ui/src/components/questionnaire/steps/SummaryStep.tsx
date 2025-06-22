
type SummaryStepProps = {
  formData: {
    sourceDb: string;
    targetDb: string;
    conversionType: string;
    optimizationLevel: string;
    strictMode: boolean;
    useFeedbackDb: boolean;
  };
}

const SummaryStep = ({ formData }: SummaryStepProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-carbon-gray-100">Summary</h2>
      <p className="text-carbon-gray-70">Review your migration configuration</p>
      
      <div className="border border-carbon-gray-30">
        <div className="grid grid-cols-[1fr,2fr] border-b border-carbon-gray-30">
          <div className="bg-carbon-gray-10 p-4 font-medium">Source Database</div>
          <div className="p-4 capitalize">{formData.sourceDb || "Not selected"}</div>
        </div>
        <div className="grid grid-cols-[1fr,2fr] border-b border-carbon-gray-30">
          <div className="bg-carbon-gray-10 p-4 font-medium">Target Database</div>
          <div className="p-4 capitalize">{formData.targetDb || "Not selected"}</div>
        </div>
        <div className="grid grid-cols-[1fr,2fr] border-b border-carbon-gray-30">
          <div className="bg-carbon-gray-10 p-4 font-medium">Conversion Type</div>
          <div className="p-4">
            {formData.conversionType === "sql" && "SQL Queries & Scripts"}
            {formData.conversionType === "stored-procedures" && "Stored Procedures"}
            {formData.conversionType === "both" && "SQL & Stored Procedures"}
          </div>
        </div>
        <div className="grid grid-cols-[1fr,2fr] border-b border-carbon-gray-30">
          <div className="bg-carbon-gray-10 p-4 font-medium">Optimization Level</div>
          <div className="p-4 capitalize">{formData.optimizationLevel}</div>
        </div>
        <div className="grid grid-cols-[1fr,2fr] border-b border-carbon-gray-30">
          <div className="bg-carbon-gray-10 p-4 font-medium">Strict Mode</div>
          <div className="p-4">{formData.strictMode ? "Enabled" : "Disabled"}</div>
        </div>
        <div className="grid grid-cols-[1fr,2fr]">
          <div className="bg-carbon-gray-10 p-4 font-medium">Use Feedback Database</div>
          <div className="p-4">{formData.useFeedbackDb ? "Enabled" : "Disabled"}</div>
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;
