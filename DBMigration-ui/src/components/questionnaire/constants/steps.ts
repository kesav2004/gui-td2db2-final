
export const steps = [
  {
    title: "Source & Target",
    description: "Select your source and target databases",
  },
  {
    title: "Conversion Type",
    description: "Select the type of conversion you need",
  },
  {
    title: "Preferences",
    description: "Set your conversion preferences",
  },
  {
    title: "Summary",
    description: "Review your configuration",
  },
];

export type FormData = {
  sourceDb: string;
  targetDb: string;
  conversionType: string;
  optimizationLevel: string;
  strictMode: boolean;
  useFeedbackDb: boolean;
};

export const getPresetFormData = (questionnaireId: string | undefined): FormData | null => {
  if (!questionnaireId) return null;
  
  switch(questionnaireId) {
    case "db-migration":
      return {
        sourceDb: "oracle",
        targetDb: "db2",
        conversionType: "sql",
        optimizationLevel: "moderate",
        strictMode: true,
        useFeedbackDb: true,
      };
    case "sp-conversion":
      return {
        sourceDb: "sqlserver",
        targetDb: "db2-cloud",
        conversionType: "stored-procedures",
        optimizationLevel: "aggressive",
        strictMode: false,
        useFeedbackDb: true,
      };
    case "optimization":
      return {
        sourceDb: "postgresql",
        targetDb: "netezza",
        conversionType: "both",
        optimizationLevel: "aggressive",
        strictMode: false,
        useFeedbackDb: true,
      };
    case "schema-mapping":
      return {
        sourceDb: "teradata",
        targetDb: "db2-warehouse",
        conversionType: "sql",
        optimizationLevel: "minimal",
        strictMode: true,
        useFeedbackDb: false,
      };
    default:
      return null;
  }
};
