
import { useState, useEffect } from "react";
import { steps as questionnaireSteps, getPresetFormData, FormData } from "./constants/steps";
import StepIndicator from "./StepIndicator";
import SourceTargetStep from "./steps/SourceTargetStep";
import ConversionTypeStep from "./steps/ConversionTypeStep";
import PreferencesStep from "./steps/PreferencesStep";
import SummaryStep from "./steps/SummaryStep";
import NavigationButtons from "./NavigationButtons";

type QuestionnaireFormProps = {
  questionnaireId?: string;
};

const QuestionnaireForm = ({ questionnaireId }: QuestionnaireFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    sourceDb: "",
    targetDb: "",
    conversionType: "sql",
    optimizationLevel: "moderate",
    strictMode: false,
    useFeedbackDb: true,
  });

  // Effect to set form data based on questionnaire ID
  useEffect(() => {
    if (questionnaireId) {
      console.log(`Loading questionnaire: ${questionnaireId}`);
      const presetData = getPresetFormData(questionnaireId);
      if (presetData) {
        setFormData(presetData);
      }
    }
  }, [questionnaireId]);

  const updateFormData = (key: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, questionnaireSteps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <StepIndicator steps={questionnaireSteps} currentStep={currentStep} />

      <div>
        {currentStep === 0 && (
          <SourceTargetStep 
            sourceDb={formData.sourceDb}
            targetDb={formData.targetDb}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 1 && (
          <ConversionTypeStep 
            conversionType={formData.conversionType}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 2 && (
          <PreferencesStep 
            optimizationLevel={formData.optimizationLevel}
            strictMode={formData.strictMode}
            useFeedbackDb={formData.useFeedbackDb}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 3 && (
          <SummaryStep formData={formData} />
        )}

        <NavigationButtons 
          currentStep={currentStep}
          stepsCount={questionnaireSteps.length}
          nextStep={nextStep}
          prevStep={prevStep}
          formData={formData}
        />
      </div>
    </div>
  );
};

export default QuestionnaireForm;
