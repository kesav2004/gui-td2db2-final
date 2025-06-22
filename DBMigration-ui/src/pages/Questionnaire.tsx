
import { useParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import QuestionnaireForm from "@/components/questionnaire/QuestionnaireForm";

const Questionnaire = () => {
  const { id } = useParams<{ id: string }>();
  
  console.log(`Questionnaire page loaded with ID: ${id}`);
  
  return (
    <Layout>
      <div className="space-y-4">
        <h1 className="text-2xl font-medium text-carbon-gray-100">Migration Setup Wizard</h1>
        <p className="text-carbon-gray-70 mb-6">
          Answer a few questions to configure your database migration project
        </p>
        
        <QuestionnaireForm questionnaireId={id} />
      </div>
    </Layout>
  );
};

export default Questionnaire;
