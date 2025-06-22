
type Step = {
  title: string;
  description: string;
};

type StepIndicatorProps = {
  steps: Step[];
  currentStep: number;
};

const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div 
            key={index} 
            className="flex flex-col items-center"
            style={{ width: `${100 / steps.length}%` }}
          >
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                index === currentStep
                  ? "bg-carbon-blue text-white"
                  : index < currentStep
                  ? "bg-carbon-success text-white"
                  : "bg-carbon-gray-20 text-carbon-gray-60"
              }`}
            >
              {index + 1}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-carbon-gray-90">{step.title}</p>
              <p className="text-xs text-carbon-gray-60 hidden md:block">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-carbon-gray-20">
        <div 
          className="absolute left-0 top-0 h-full bg-carbon-blue transition-all" 
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default StepIndicator;
