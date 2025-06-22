import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Database, Table as TableIcon, FileCode, Activity, Key, Loader2, Cpu } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fetchDatabaseSchema, getDatabaseConnections } from "@/services/databaseService";
import SQLConverterComponent from "@/components/sql-converter/SQLConverterComponent";

// Schema browser component
const SchemaBrowser = () => {
  const [activeSchema, setActiveSchema] = useState("SALES");
  const [activeItem, setActiveItem] = useState("Tables");
  const [isLoading, setIsLoading] = useState(true);
  const [schemaData, setSchemaData] = useState<any>(null);
  
  useEffect(() => {
    const loadSchema = async () => {
      setIsLoading(true);
      try {
        // Check for active database connections
        const connections = getDatabaseConnections();
        
        if (!connections.source) {
          toast({
            title: "No source database",
            description: "Please configure a source database connection first",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Fetch schema data from our simulated backend
        const data = await fetchDatabaseSchema(connections.source.id);
        setSchemaData(data);
      } catch (error) {
        toast({
          title: "Failed to load schema",
          description: "Could not retrieve database schema information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSchema();
  }, []);
  
  // Helper to render schema items in the sidebar
  const renderSchemaItem = (item: { name: string }, icon: React.ReactNode) => (
    <div
      className={`flex items-center text-sm p-2 cursor-pointer ${
        activeItem === item.name ? "bg-carbon-blue bg-opacity-10 text-carbon-blue font-medium" : "hover:bg-gray-100"
      }`}
      onClick={() => setActiveItem(item.name)}
    >
      {icon}
      <span className="ml-2">{item.name}</span>
    </div>
  );
  
  // Helper to render content based on active schema and item
  const renderContent = () => {
    // Handle special items that don't require database connection
    if (activeItem === "PARSER") {
      return <SQLConverterComponent />;
    }
    
    if (activeItem === "AI") {
      return (
        <div>
          <h3 className="text-lg font-medium mb-4">AI-Powered Stored Procedures</h3>
          <div className="text-center py-16">
            <Cpu size={48} className="mx-auto text-purple-600 mb-4" />
            <p className="text-carbon-gray-70">AI-powered stored procedure analysis and conversion</p>
            <p className="text-carbon-gray-60 mt-2">Advanced AI tools for stored procedure migration</p>
          </div>
        </div>
      );
    }
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-carbon-blue" />
          <span className="ml-2 text-carbon-gray-70">Loading schema information...</span>
        </div>
      );
    }
    
    if (!schemaData) {
      return (
        <div className="text-center py-16">
          <p className="text-carbon-gray-70">No database connection available.</p>
          <p className="text-carbon-gray-60 mt-2">Please configure a source database connection first.</p>
        </div>
      );
    }
    
    const schema = schemaData.schemas.find((s: any) => s.name === activeSchema);
    if (!schema) {
      return <div>Schema not found</div>;
    }
    
    switch (activeItem) {
      case "Tables":
        return (
          <div>
            <h3 className="text-lg font-medium mb-4">Tables in {activeSchema}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Table Name</TableHead>
                  <TableHead>Columns</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schema.tables.map((table: any) => (
                  <TableRow key={table.name}>
                    <TableCell className="font-medium">{table.name}</TableCell>
                    <TableCell>{table.columns.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
        
      case "Views":
        return (
          <div>
            <h3 className="text-lg font-medium mb-4">Views in {activeSchema}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">View Name</TableHead>
                  <TableHead>Definition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schema.views.map((view: any) => (
                  <TableRow key={view.name}>
                    <TableCell className="font-medium">{view.name}</TableCell>
                    <TableCell>
                      <pre className="text-xs whitespace-pre-wrap">{view.definition}</pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
        
      case "Stored Procedures":
        return (
          <div>
            <h3 className="text-lg font-medium mb-4">Stored Procedures in {activeSchema}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Procedure Name</TableHead>
                  <TableHead>Parameters</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schema.procedures.map((proc: any) => (
                  <TableRow key={proc.name}>
                    <TableCell className="font-medium">{proc.name}</TableCell>
                    <TableCell>{proc.parameters.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
        
      case "Functions":
        return (
          <div>
            <h3 className="text-lg font-medium mb-4">Functions in {activeSchema}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Function Name</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead>Return Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schema.functions.map((func: any) => (
                  <TableRow key={func.name}>
                    <TableCell className="font-medium">{func.name}</TableCell>
                    <TableCell>{func.parameters.join(", ")}</TableCell>
                    <TableCell>{func.returnType}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      

        
      default:
        return <div>Select an item from the sidebar</div>;
    }
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-carbon-gray-100">Database Schema Browser</h1>
          <p className="text-carbon-gray-70 mt-1">
            Explore tables, views, stored procedures, and functions in your connected databases
          </p>
        </div>
        
        <div className="flex border border-carbon-gray-20">
          {/* Sidebar navigation */}
          <div className="w-64 border-r border-carbon-gray-20 bg-carbon-gray-5">
            <div className="p-4 border-b border-carbon-gray-20 bg-carbon-gray-10">
              <h3 className="font-medium">Database Explorer</h3>
            </div>
            
            <div className="p-2">
              <Accordion 
                type="multiple" 
                defaultValue={["schemas", "objects", "stored-procedure", "scripts"]}
                className="space-y-1"
              >
                <AccordionItem value="schemas" className="border-b-0">
                  <AccordionTrigger className="py-2 px-2 hover:bg-carbon-gray-10 hover:no-underline">
                    <div className="flex items-center text-sm font-medium">
                      <Database size={16} className="mr-2 text-carbon-blue" />
                      Schemas
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-2 space-y-1">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={16} className="animate-spin text-carbon-blue" />
                        <span className="ml-2 text-sm">Loading...</span>
                      </div>
                    ) : (
                      schemaData?.schemas.map((schema: any) => (
                        <div
                          key={schema.name}
                          className={`flex items-center text-sm p-2 cursor-pointer ${
                            activeSchema === schema.name ? "bg-carbon-blue bg-opacity-5 text-carbon-blue" : "hover:bg-gray-100"
                          }`}
                          onClick={() => setActiveSchema(schema.name)}
                        >
                          <Database size={16} className="text-carbon-blue-60" />
                          <span className="ml-2">{schema.name}</span>
                        </div>
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="objects" className="border-b-0">
                  <AccordionTrigger className="py-2 px-2 hover:bg-carbon-gray-10 hover:no-underline">
                    <div className="flex items-center text-sm font-medium">
                      <TableIcon size={16} className="mr-2 text-carbon-blue" />
                      Database Objects
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-2 space-y-1">
                    {renderSchemaItem({ name: "Tables" }, <TableIcon size={16} className="text-carbon-blue" />)}
                    {renderSchemaItem({ name: "Views" }, <TableIcon size={16} className="text-carbon-green" />)}
                    {renderSchemaItem({ name: "Stored Procedures" }, <Activity size={16} className="text-carbon-purple" />)}
                    {renderSchemaItem({ name: "Functions" }, <Activity size={16} className="text-carbon-teal" />)}
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="stored-procedure" className="border-b-0">
                  <AccordionTrigger className="py-2 px-2 hover:bg-carbon-gray-10 hover:no-underline">
                    <div className="flex items-center text-sm font-medium">
                      <Activity size={16} className="mr-2 text-carbon-purple" />
                      STORED PROCEDURE
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-2 space-y-1">
                    {renderSchemaItem({ name: "AI" }, <Cpu size={16} className="text-purple-600" />)}
                    {renderSchemaItem({ name: "PARSER" }, <Activity size={16} className="text-carbon-purple" />)}
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="scripts" className="border-b-0">
                  <AccordionTrigger className="py-2 px-2 hover:bg-carbon-gray-10 hover:no-underline">
                    <div className="flex items-center text-sm font-medium">
                      <FileCode size={16} className="mr-2 text-carbon-blue" />
                      SQL Scripts
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-2 space-y-1">
                    {renderSchemaItem({ name: "SQL" }, <FileCode size={16} className="text-carbon-blue" />)}
                    {renderSchemaItem({ name: "BTEQ" }, <FileCode size={16} className="text-carbon-orange" />)}
                    {renderSchemaItem({ name: "DCL" }, <Key size={16} className="text-carbon-purple" />)}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="flex-1 p-6 bg-white">
            {renderContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SchemaBrowser;