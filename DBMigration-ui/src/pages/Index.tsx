
import { useState } from "react";
import Layout from "@/components/layout/Layout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import MigrationSummary from "@/components/dashboard/MigrationSummary";
import RecentMigrations from "@/components/dashboard/RecentMigrations";
import QuickActions from "@/components/dashboard/QuickActions";
import { Info } from "lucide-react";
//import Footer from "@/components/Footer";
const Index = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-carbon-blue-70 -mx-6 -mt-4 px-6 py-8 text-white rounded">
          <h1 className="text-2xl font-light mb-2">Welcome to IBM Database Modernization</h1>
          <p className="opacity-80 max-w-3xl">
            Automate your database migration from various platforms to IBM databases using our AI-powered conversion tool.
            Configure your databases, upload scripts, and run migrations with ease.
          </p>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-medium mb-4 text-carbon-gray-100">Migration Summary</h2>
            <MigrationSummary />
          </section>
          
          <section>
            <h2 className="text-xl font-medium mb-4 text-carbon-gray-100">Quick Actions</h2>
            <QuickActions />
          </section>
          
          <section>
            <DashboardCard 
              title="Recent Migrations"
              action={
                <a href="/migrations" className="text-carbon-blue text-sm hover:underline">
                  View all
                </a>
              }
              className="overflow-hidden"
            >
              <RecentMigrations />
            </DashboardCard>
          </section>
          
          <section>
            <DashboardCard title="Getting Started">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-carbon-blue bg-opacity-10 rounded-full">
                  <Info size={24} className="text-carbon-blue" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">New to Database Migration?</h3>
                  <p className="text-carbon-gray-70 mb-4">
                    Follow these steps to get started with your first migration project:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-carbon-gray-70">
                    <li>Configure your source and target database connections</li>
                    <li>Upload your SQL scripts or stored procedures</li>
                    <li>Run the migration analysis to identify potential issues</li>
                    <li>Review and approve the converted code</li>
                    <li>Execute the migration and verify the results</li>
                  </ol>
                  <div className="mt-4">
                    <a href="/questionnaire/db-migration" className="text-carbon-blue hover:underline">
                      Start with our setup wizard →
                    </a>
                  </div>
                </div>
              </div>
            </DashboardCard>
          </section>
        </div>
      </div>
      
    </Layout>
  );
};

export default Index;
