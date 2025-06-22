import Layout from "@/components/layout/Layout";
import FileUploader from "@/components/migration/FileUploader";
import { Info, Plus, FileCode, Search, Edit, Eye, Trash, AlertTriangle, Activity, Code, Settings, Wrench, Coffee, Cpu, Key } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Sample script data
const scriptSamples = [
  { id: 'script1', name: 'customer_etl.sql', type: 'SQL', size: '12KB', lastModified: '2023-06-15', status: 'Valid' },
  { id: 'script2', name: 'inventory_update.bteq', type: 'BTEQ', size: '18KB', lastModified: '2023-06-14', status: 'Valid' },
  { id: 'script3', name: 'sales_report.sql', type: 'SQL', size: '5KB', lastModified: '2023-06-12', status: 'With Warnings' },
  { id: 'script4', name: 'product_import.sql', type: 'SQL', size: '22KB', lastModified: '2023-06-10', status: 'Valid' },
  { id: 'script5', name: 'user_permissions.sql', type: 'SQL', size: '3KB', lastModified: '2023-06-08', status: 'Invalid' },
  { id: 'script6', name: 'create_tables.ddl', type: 'DDL', size: '15KB', lastModified: '2023-06-16', status: 'Valid' },
  { id: 'script7', name: 'backup_procedure.spl', type: 'Store SPL', size: '8KB', lastModified: '2023-06-13', status: 'Valid' },
  { id: 'script8', name: 'transaction_control.tcl', type: 'TCL', size: '6KB', lastModified: '2023-06-11', status: 'Valid' },
  { id: 'script9', name: 'workload_manager.wlm', type: 'WLM', size: '10KB', lastModified: '2023-06-09', status: 'Valid' },
  { id: 'script10', name: 'analytics_report.sas', type: 'SAS', size: '25KB', lastModified: '2023-06-07', status: 'Valid' },
  { id: 'script11', name: 'data_conversion.java', type: 'DCW - Java program', size: '35KB', lastModified: '2023-06-06', status: 'Valid' },
  { id: 'script12', name: 'ai_procedure.spl', type: 'SPL - AI', size: '12KB', lastModified: '2023-06-05', status: 'Valid' },
  { id: 'script13', name: 'grant_permissions.dcl', type: 'DCL', size: '4KB', lastModified: '2023-06-04', status: 'Valid' }
];

const ManageScripts = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [scripts, setScripts] = useState(scriptSamples);
  const [uploadedScripts, setUploadedScripts] = useState<Array<{
    id: string;
    name: string;
    content: string;
    sqlType?: "teradata" | "db2" | "other";
  }>>([]);
  
  // Load uploaded scripts from session storage
  useEffect(() => {
    const storedScripts = sessionStorage.getItem('uploadedScripts');
    if (storedScripts) {
      try {
        const parsedScripts = JSON.parse(storedScripts);
        setUploadedScripts(parsedScripts);
        
        // Add uploaded scripts to the scripts list
        const newScripts = parsedScripts.map((script: any) => ({
          id: script.id,
          name: script.name,
          type: script.sqlType === 'teradata' ? 'BTEQ' : 'SQL',
          size: `${Math.round(script.content.length / 1024)}KB`,
          lastModified: new Date().toISOString().split('T')[0],
          status: 'Valid'
        }));
        
        setScripts(prev => [...newScripts, ...prev]);
      } catch (error) {
        console.error("Error loading scripts from session storage:", error);
      }
    }
  }, []);
  
  // Filter scripts based on search query
  const filteredScripts = scripts.filter(script => 
    script.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    script.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter functions for each script type
  const getFilteredScripts = (type: string) => {
    return filteredScripts.filter(script => script.type === type);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Valid': return 'text-green-600';
      case 'With Warnings': return 'text-amber-500';
      case 'Invalid': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // View script content
  const handleViewScript = (scriptId: string) => {
    const uploadedScript = uploadedScripts.find(s => s.id === scriptId);
    
    if (uploadedScript) {
      // Store the selected script in session storage for access in the editor
      sessionStorage.setItem('selectedScript', JSON.stringify(uploadedScript));
      navigate('/conversion/editor');
    } else {
      // For demo scripts
      const demoScript = {
        id: scriptId,
        name: scripts.find(s => s.id === scriptId)?.name || 'script.sql',
        content: `-- This is a sample ${scripts.find(s => s.id === scriptId)?.type} script
SELECT *
FROM customers
WHERE customer_id > 1000
QUALIFY ROW_NUMBER() OVER (PARTITION BY region ORDER BY sales DESC) = 1;`,
        sqlType: scripts.find(s => s.id === scriptId)?.type.toLowerCase() === 'bteq' ? 'teradata' : 'other'
      };
      
      sessionStorage.setItem('selectedScript', JSON.stringify(demoScript));
      navigate('/conversion/editor');
    }
  };

  // Start migration for a script
  const handleMigrate = (scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    
    toast({
      title: "Starting migration",
      description: `Converting script: ${script?.name}`,
    });
    
    // Set up the script and navigate to conversion editor
    handleViewScript(scriptId);
  };

  // Delete a script
  const handleDelete = (scriptId: string) => {
    setScripts(prev => prev.filter(s => s.id !== scriptId));
    setUploadedScripts(prev => {
      const filtered = prev.filter(s => s.id !== scriptId);
      sessionStorage.setItem('uploadedScripts', JSON.stringify(filtered));
      return filtered;
    });
    
    toast({
      title: "Script deleted",
      description: "The script has been removed from your account",
    });
  };

  // Render script table
  const renderScriptTable = (scriptList: any[], showType = true) => (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {showType && <TableHead>Type</TableHead>}
            <TableHead>Size</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scriptList.map((script) => (
            <TableRow key={script.id}>
              <TableCell className="flex items-center gap-2">
                <FileCode size={16} className="text-carbon-blue" />
                <span className="font-medium">{script.name}</span>
              </TableCell>
              {showType && <TableCell>{script.type}</TableCell>}
              <TableCell>{script.size}</TableCell>
              <TableCell>{script.lastModified}</TableCell>
              <TableCell>
                <span className={getStatusColor(script.status)}>
                  {script.status}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex gap-1 items-center"
                    onClick={() => toast({
                      title: "Edit Script",
                      description: "Editor functionality would open here"
                    })}
                  >
                    <Edit size={14} />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex gap-1 items-center"
                    onClick={() => handleViewScript(script.id)}
                  >
                    <Eye size={14} />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex gap-1 items-center" 
                    onClick={() => handleMigrate(script.id)}
                  >
                    Migrate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-carbon-error border-carbon-error/20 hover:bg-carbon-error/10"
                    onClick={() => handleDelete(script.id)}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {scriptList.length === 0 && (
            <TableRow>
              <TableCell colSpan={showType ? 6 : 5} className="text-center py-6 text-muted-foreground">
                No scripts found. Try a different search or upload new scripts.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-carbon-gray-100">Manage SQL Scripts</h1>
          <p className="text-carbon-gray-70 mt-1">
            Upload, organize and manage your SQL, BTEQ, and stored procedure scripts
          </p>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12">
            <TabsTrigger value="all">All Scripts</TabsTrigger>
            <TabsTrigger value="sql">SQL</TabsTrigger>
            <TabsTrigger value="bteq">BTEQ</TabsTrigger>
            <TabsTrigger value="stored-procedures">Stored procedures</TabsTrigger>
            <TabsTrigger value="ddl">DDL</TabsTrigger>
            <TabsTrigger value="store-spl">Store SPL</TabsTrigger>
            <TabsTrigger value="tcl">TCL</TabsTrigger>
            <TabsTrigger value="wlm">WLM</TabsTrigger>
            <TabsTrigger value="sas">SAS</TabsTrigger>
            <TabsTrigger value="dcw">DCW - Java</TabsTrigger>
            <TabsTrigger value="spl-ai">SPL - AI</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search scripts..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New Script
              </Button>
            </div>
            
            {renderScriptTable(filteredScripts)}
          </TabsContent>
          
          <TabsContent value="sql" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search SQL scripts..." 
                    className="pl-8" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New SQL Script
              </Button>
            </div>
            
            {renderScriptTable(getFilteredScripts('SQL'), false)}
          </TabsContent>
          
          <TabsContent value="bteq" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search BTEQ scripts..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New BTEQ Script
              </Button>
            </div>
            
            {renderScriptTable(getFilteredScripts('BTEQ'), false)}
          </TabsContent>

          <TabsContent value="stored-procedures" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search stored procedures..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New Stored Procedure
              </Button>
            </div>
            
            {renderScriptTable(getFilteredScripts('Stored procedures'), false)}
          </TabsContent>

          <TabsContent value="ddl" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search DDL scripts..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New DDL Script
              </Button>
            </div>
            
            {renderScriptTable(getFilteredScripts('DDL'), false)}
          </TabsContent>

          <TabsContent value="store-spl" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search Store SPL scripts..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New Store SPL Script
              </Button>
            </div>
            
            {renderScriptTable(getFilteredScripts('Store SPL'), false)}
          </TabsContent>

          <TabsContent value="tcl" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search TCL scripts..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New TCL Script
              </Button>
            </div>
            
            {renderScriptTable(getFilteredScripts('TCL'), false)}
          </TabsContent>

          <TabsContent value="wlm" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search WLM scripts..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New WLM Script
              </Button>
            </div>
            
            {renderScriptTable(getFilteredScripts('WLM'), false)}
          </TabsContent>

          <TabsContent value="sas" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search SAS scripts..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New SAS Script
              </Button>
            </div>
            
            {renderScriptTable(getFilteredScripts('SAS'), false)}
          </TabsContent>

          <TabsContent value="dcw" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search DCW Java programs..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New DCW Java Program
              </Button>
            </div>
            
            {renderScriptTable(getFilteredScripts('DCW - Java program'), false)}
          </TabsContent>

          <TabsContent value="spl-ai" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-1/3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search SPL AI scripts..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate('/scripts/upload')}>
                <Plus size={16} />
                New SPL AI Script
              </Button>
            </div>
            
            {renderScriptTable(getFilteredScripts('SPL - AI'), false)}
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="bg-carbon-blue bg-opacity-10 border-l-4 border-carbon-blue p-4 flex items-start gap-3">
              <Info size={20} className="text-carbon-blue mt-0.5" />
              <div>
                <h3 className="font-medium text-carbon-gray-100">Supported File Types</h3>
                <p className="text-carbon-gray-70 mt-1">
                  You can upload .sql, .bteq, .ddl, .spl, .tcl, .wlm, .sas, .java, or .txt files containing code. 
                  For best results, each file should contain related queries or a single procedure.
                </p>
              </div>
            </div>
            
            <FileUploader />
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex items-start gap-3 mt-6">
              <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Teradata Parser Integration</h3>
                <p className="text-yellow-700 mt-1">
                  The Python parser (TeradataSQLParser) will be used to analyze uploaded Teradata scripts.
                  For best results, ensure your scripts follow Teradata SQL syntax conventions.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ManageScripts;