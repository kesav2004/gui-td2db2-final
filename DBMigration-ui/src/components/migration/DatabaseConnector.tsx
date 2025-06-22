import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, X, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { testDatabaseConnection, DatabaseType } from "@/services/databaseService";

type ConnectionStatus = "idle" | "testing" | "success" | "error";

type ConnectionFormProps = {
  type: "source" | "target";
  title: string;
};

const DatabaseConnector = ({ type, title }: ConnectionFormProps) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    databaseType: type === "source" ? "teradata" : "db2",
    host: "",
    port: type === "source" ? "1025" : "50000",
    database: "",
    username: "",
    password: "",
    saveCredentials: false,
  });
  
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Reset connection status when form changes
    if (connectionStatus !== "idle") {
      setConnectionStatus("idle");
      setErrorMessage(null);
    }
  };
  
  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    setErrorMessage(null);
    
    try {
      const result = await testDatabaseConnection(type, {
        databaseType: formData.databaseType as DatabaseType,
        host: formData.host,
        port: formData.port,
        database: formData.database,
        username: formData.username,
        password: formData.password
      });
      
      if (result.success) {
        setConnectionStatus("success");
        toast({
          title: "Connection successful",
          description: `Connected to ${formData.database}`,
          variant: "default",
        });
      } else {
        setConnectionStatus("error");
        setErrorMessage(result.message || "Connection failed. Please check your settings.");
        toast({
          title: "Connection failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionStatus("error");
      setErrorMessage("An unexpected error occurred");
      toast({
        title: "Connection error",
        description: "An unexpected error occurred while testing the connection",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="bg-white border border-carbon-gray-20">
      <div className="bg-carbon-gray-10 px-4 py-3 border-b border-carbon-gray-20">
        <h3 className="font-medium">{title}</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <Label htmlFor={`${type}-database-type`} className="carbon-label">Database Type</Label>
          <Select
            value={formData.databaseType}
            onValueChange={(value) => handleInputChange("databaseType", value)}
          >
            <SelectTrigger className="carbon-field">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {type === "source" ? (
                <>
                  <SelectItem value="teradata">Teradata</SelectItem>
                  <SelectItem value="oracle">Oracle</SelectItem>
                  <SelectItem value="sqlserver">SQL Server</SelectItem>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="db2">IBM Db2</SelectItem>
                  <SelectItem value="db2-cloud">IBM Db2 on Cloud</SelectItem>
                  <SelectItem value="db2-warehouse">IBM Db2 Warehouse</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${type}-host`} className="carbon-label">Host / Server</Label>
            <Input
              id={`${type}-host`}
              value={formData.host}
              onChange={(e) => handleInputChange("host", e.target.value)}
              placeholder="e.g., localhost or 192.168.1.1"
              className="carbon-field"
            />
          </div>
          <div>
            <Label htmlFor={`${type}-port`} className="carbon-label">Port</Label>
            <Input
              id={`${type}-port`}
              value={formData.port}
              onChange={(e) => handleInputChange("port", e.target.value)}
              className="carbon-field"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor={`${type}-database`} className="carbon-label">Database Name</Label>
          <Input
            id={`${type}-database`}
            value={formData.database}
            onChange={(e) => handleInputChange("database", e.target.value)}
            placeholder="Enter database name"
            className="carbon-field"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${type}-username`} className="carbon-label">Username</Label>
            <Input
              id={`${type}-username`}
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              placeholder="Enter username"
              className="carbon-field"
            />
          </div>
          <div>
            <Label htmlFor={`${type}-password`} className="carbon-label">Password</Label>
            <Input
              id={`${type}-password`}
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Enter password"
              className="carbon-field"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4 pt-2">
          <Button
            type="button"
            onClick={handleTestConnection}
            disabled={connectionStatus === "testing"}
            className={
              connectionStatus === "testing" 
                ? "carbon-button-secondary opacity-50" 
                : "carbon-button-secondary"
            }
          >
            {connectionStatus === "testing" ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Testing...
              </>
            ) : "Test Connection"}
          </Button>
          
          {connectionStatus === "success" && (
            <div className="flex items-center text-carbon-success">
              <CheckCircle size={16} className="mr-1" />
              <span>Connection successful</span>
            </div>
          )}
          
          {connectionStatus === "error" && (
            <div className="flex items-center text-carbon-error">
              <X size={16} className="mr-1" />
              <span>Connection failed</span>
            </div>
          )}
        </div>
        
        {connectionStatus === "error" && errorMessage && (
          <div className="bg-red-50 border border-carbon-error p-3 flex items-start gap-3">
            <AlertCircle size={16} className="text-carbon-error mt-1" />
            <div>
              <p className="text-carbon-error font-medium">Connection Error</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseConnector;