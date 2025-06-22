
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FormData } from "./constants/steps";

type NavigationButtonsProps = {
  currentStep: number;
  stepsCount: number;
  nextStep: () => void;
  prevStep: () => void;
  formData: FormData;
};

const NavigationButtons = ({ currentStep, stepsCount, nextStep, prevStep, formData }: NavigationButtonsProps) => {
  const navigate = useNavigate();
  
  const handleSubmit = () => {
    // For demo purposes, just log the form data
    console.log("Questionnaire submitted:", formData);
    // Redirect to the dashboard
    navigate("/");
  };
  
  return (
    <div className="flex justify-between mt-8">
      <Button
        type="button"
        onClick={prevStep}
        className="carbon-button-secondary"
        disabled={currentStep === 0}
      >
        <ArrowLeft size={16} className="mr-2" />
        Previous
      </Button>
      
      {currentStep < stepsCount - 1 ? (
        <Button
          type="button"
          onClick={nextStep}
          className="carbon-button-primary"
        >
          Next
          <ArrowRight size={16} className="ml-2" />
        </Button>
      ) : (
        <Button
          type="button"
          className="carbon-button-primary"
          onClick={handleSubmit}
        >
          Start Migration
        </Button>
      )}
    </div>
  );
};

export default NavigationButtons;
