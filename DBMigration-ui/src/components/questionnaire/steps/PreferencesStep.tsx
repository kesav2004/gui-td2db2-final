
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type PreferencesStepProps = {
  optimizationLevel: string;
  strictMode: boolean;
  useFeedbackDb: boolean;
  updateFormData: (key: string, value: string | boolean) => void;
}

const PreferencesStep = ({ optimizationLevel, strictMode, useFeedbackDb, updateFormData }: PreferencesStepProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium text-carbon-gray-100">Preferences</h2>
      <p className="text-carbon-gray-70">Configure your conversion preferences</p>
      
      <div className="space-y-5">
        <div>
          <Label htmlFor="optimizationLevel" className="carbon-label">Optimization Level</Label>
          <Select
            value={optimizationLevel}
            onValueChange={(value) => updateFormData("optimizationLevel", value)}
          >
            <SelectTrigger className="carbon-field">
              <SelectValue placeholder="Select optimization level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">Minimal - Focus on compatibility</SelectItem>
              <SelectItem value="moderate">Moderate - Balance compatibility and performance</SelectItem>
              <SelectItem value="aggressive">Aggressive - Focus on performance optimization</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between border border-carbon-gray-30 p-4">
          <div>
            <Label className="text-base font-medium">Strict Mode</Label>
            <p className="text-sm text-carbon-gray-60">
              Enforce strict SQL syntax compatibility during conversion
            </p>
          </div>
          <Switch
            checked={strictMode}
            onCheckedChange={(checked) => updateFormData("strictMode", checked)}
          />
        </div>
        
        <div className="flex items-center justify-between border border-carbon-gray-30 p-4">
          <div>
            <Label className="text-base font-medium">Use Feedback Database</Label>
            <p className="text-sm text-carbon-gray-60">
              Store conversion feedback to improve future migrations
            </p>
          </div>
          <Switch
            checked={useFeedbackDb}
            onCheckedChange={(checked) => updateFormData("useFeedbackDb", checked)}
          />
        </div>
      </div>
    </div>
  );
};

export default PreferencesStep;
