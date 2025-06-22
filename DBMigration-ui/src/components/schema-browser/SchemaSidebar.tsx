import React from "react";
import { Loader2, Database, TableIcon, Activity, FileCode, Key, Code, Settings, Wrench, Coffee, BookOpen, Cpu } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SchemaItem from "./SchemaItem";
import SidebarItem from "./SidebarItem";

type SchemaSidebarProps = {
  isLoading: boolean;
  schemaData: any;
  activeSchema: string;
  setActiveSchema: (schema: string) => void;
  activeItem: string;
  setActiveItem: (item: string) => void;
};

const SchemaSidebar = ({ 
  isLoading, 
  schemaData, 
  activeSchema, 
  setActiveSchema, 
  activeItem, 
  setActiveItem 
}: SchemaSidebarProps) => {
  return (
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
                  <SchemaItem 
                    key={schema.name}
                    name={schema.name}
                    isActive={activeSchema === schema.name}
                    onClick={() => setActiveSchema(schema.name)}
                  />
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
              <SidebarItem 
                name="Tables" 
                isActive={activeItem === "Tables"}
                icon={<TableIcon size={16} className="text-carbon-blue" />}
                onClick={() => setActiveItem("Tables")}
              />
              <SidebarItem 
                name="Views" 
                isActive={activeItem === "Views"}
                icon={<TableIcon size={16} className="text-carbon-green" />}
                onClick={() => setActiveItem("Views")}
              />
              <SidebarItem 
                name="Functions" 
                isActive={activeItem === "Functions"}
                icon={<Activity size={16} className="text-carbon-teal" />}
                onClick={() => setActiveItem("Functions")}
              />
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="stored-procedure" className="border-b-0">
            <AccordionTrigger className="py-2 px-2 hover:bg-carbon-gray-10 hover:no-underline">
              <div className="flex items-center text-sm font-medium">
                <Activity size={16} className="mr-2 text-carbon-purple" />
                STORED PROCEDURE ⚡
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2 space-y-1">
              <SidebarItem 
                name="AI" 
                isActive={activeItem === "AI"}
                icon={<Cpu size={16} className="text-purple-600" />}
                onClick={() => setActiveItem("AI")}
              />
              <SidebarItem 
                name="PARSER" 
                isActive={activeItem === "PARSER"}
                icon={<Activity size={16} className="text-carbon-purple" />}
                onClick={() => setActiveItem("PARSER")}
              />
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
              <SidebarItem 
                name="SQL" 
                isActive={activeItem === "SQL"}
                icon={<FileCode size={16} className="text-carbon-blue" />}
                onClick={() => setActiveItem("SQL")}
              />
              <SidebarItem 
                name="BTEQ" 
                isActive={activeItem === "BTEQ"}
                icon={<FileCode size={16} className="text-carbon-orange" />}
                onClick={() => setActiveItem("BTEQ")}
              />
              <SidebarItem 
                name="Stored procedures" 
                isActive={activeItem === "Stored procedures"}
                icon={<Activity size={16} className="text-carbon-purple" />}
                onClick={() => setActiveItem("Stored procedures")}
              />
              <SidebarItem 
                name="DDL" 
                isActive={activeItem === "DDL"}
                icon={<Code size={16} className="text-carbon-blue" />}
                onClick={() => setActiveItem("DDL")}
              />
              <SidebarItem 
                name="Store SPL" 
                isActive={activeItem === "Store SPL"}
                icon={<Activity size={16} className="text-carbon-green" />}
                onClick={() => setActiveItem("Store SPL")}
              />
              <SidebarItem 
                name="TCL" 
                isActive={activeItem === "TCL"}
                icon={<Settings size={16} className="text-carbon-teal" />}
                onClick={() => setActiveItem("TCL")}
              />
              <SidebarItem 
                name="WLM" 
                isActive={activeItem === "WLM"}
                icon={<Wrench size={16} className="text-carbon-gray-70" />}
                onClick={() => setActiveItem("WLM")}
              />
              <SidebarItem 
                name="SAS" 
                isActive={activeItem === "SAS"}
                icon={<Coffee size={16} className="text-carbon-orange" />}
                onClick={() => setActiveItem("SAS")}
              />
              <SidebarItem 
                name="DCW - Java program" 
                isActive={activeItem === "DCW - Java program"}
                icon={<Code size={16} className="text-red-600" />}
                onClick={() => setActiveItem("DCW - Java program")}
              />
              <SidebarItem 
                name="SPL - AI" 
                isActive={activeItem === "SPL - AI"}
                icon={<Cpu size={16} className="text-purple-600" />}
                onClick={() => setActiveItem("SPL - AI")}
              />
              <SidebarItem 
                name="DCL" 
                isActive={activeItem === "DCL"}
                icon={<Key size={16} className="text-carbon-purple" />}
                onClick={() => setActiveItem("DCL")}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

export default SchemaSidebar;