import { useState } from "react";
import { Upload, X, FileCode, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { processSqlFile } from "@/services/databaseService";
import { useNavigate } from "react-router-dom";

type FileStatus = "idle" | "uploading" | "success" | "error";

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  progress: number;
  content?: string;
  sqlType?: "teradata" | "db2" | "other";
  error?: string;
};

const FileUploader = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };
  
  const processFiles = (newFiles: File[]) => {
    const sqlFiles = newFiles.filter(file => 
      file.name.endsWith('.sql') || 
      file.name.endsWith('.bteq') || 
      file.name.endsWith('.txt') || 
      file.type === 'text/plain'
    );
    
    if (sqlFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please upload SQL, BTEQ, or TXT files only",
        variant: "destructive",
      });
      return;
    }
    
    const newUploadedFiles = sqlFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading" as FileStatus,
      progress: 0,
      sqlType: detectSqlType(file.name)
    }));
    
    // Add new files to state
    setFiles(prev => [...prev, ...newUploadedFiles]);
    
    // Process each file
    sqlFiles.forEach((file, index) => {
      const fileId = newUploadedFiles[index].id;
      simulateUpload(file, fileId);
    });
  };
  
  const detectSqlType = (fileName: string): "teradata" | "db2" | "other" => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('teradata') || lowerName.includes('tera') || lowerName.endsWith('.bteq')) {
      return "teradata";
    } else if (lowerName.includes('db2') || lowerName.includes('ibm')) {
      return "db2";
    }
    return "other"; // Default will be treated as Teradata for conversion demo
  };
  
  const simulateUpload = async (file: File, fileId: string) => {
    let progressInterval: number | undefined;
    
    try {
      // Update progress in steps to simulate upload
      progressInterval = window.setInterval(() => {
        setFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, progress: Math.min(f.progress + 10, 90) } 
              : f
          )
        );
      }, 200);
      
      // Process the file using our service
      const result = await processSqlFile(file);
      
      // Clear the progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      // Detect SQL type from content
      const sqlType = result.content?.toLowerCase().includes('sel ') || 
                     result.content?.toLowerCase().includes('qualify') ? 
                     "teradata" : "other";
      
      // Update file status based on processing result
      setFiles(prev => 
        prev.map(f => {
          if (f.id === fileId) {
            return { 
              ...f, 
              status: result.status as FileStatus,
              progress: 100,
              content: result.content,
              sqlType,
              error: result.error
            };
          }
          return f;
        })
      );
      
      // Store processed file in sessionStorage for access in other components
      if (result.status === 'success' && result.content) {
        const scriptsInStorage = JSON.parse(sessionStorage.getItem('uploadedScripts') || '[]');
        sessionStorage.setItem('uploadedScripts', JSON.stringify([
          ...scriptsInStorage,
          {
            id: fileId,
            name: file.name,
            content: result.content,
            sqlType
          }
        ]));
      }
      
      // Show notification
      if (result.status === 'success') {
        toast({
          title: "File processed successfully",
          description: `${file.name} has been uploaded and processed as ${sqlType === 'teradata' ? 'Teradata' : 'Standard'} SQL`,
        });
      } else {
        toast({
          title: "File processing failed",
          description: result.error || "An error occurred while processing the file",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Handle errors
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      setFiles(prev => 
        prev.map(f => {
          if (f.id === fileId) {
            return { 
              ...f, 
              status: "error",
              progress: 100,
              error: "Failed to process file"
            };
          }
          return f;
        })
      );
      
      toast({
        title: "Error processing file",
        description: "An unexpected error occurred while processing the file",
        variant: "destructive",
      });
    }
  };
  
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    
    // Also remove from session storage
    const scriptsInStorage = JSON.parse(sessionStorage.getItem('uploadedScripts') || '[]');
    sessionStorage.setItem('uploadedScripts', JSON.stringify(
      scriptsInStorage.filter((script: any) => script.id !== fileId)
    ));
  };
  
  return (
    <div className="space-y-4">
      <div 
        className={cn(
          "border-2 border-dashed rounded-none p-8 text-center cursor-pointer transition-colors",
          isDragging 
            ? "border-carbon-blue bg-carbon-blue bg-opacity-5" 
            : "border-carbon-gray-30 hover:border-carbon-blue hover:bg-carbon-blue hover:bg-opacity-5"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          
          const droppedFiles = Array.from(e.dataTransfer.files);
          processFiles(droppedFiles);
        }}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input 
          id="file-input" 
          type="file" 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files) {
              const selectedFiles = Array.from(e.target.files);
              processFiles(selectedFiles);
            }
          }}
          multiple
          accept=".sql,.bteq,.txt,text/plain"
        />
        <Upload size={32} className="mx-auto mb-4 text-carbon-gray-60" />
        <p className="text-carbon-gray-70 mb-1">
          <span className="font-medium">Click to browse</span> or drag and drop
        </p>
        <p className="text-carbon-gray-60 text-sm">
          Upload SQL, BTEQ, or text files
        </p>
      </div>
      
      {files.length > 0 && (
        <div className="border border-carbon-gray-20">
          <div className="px-4 py-3 bg-carbon-gray-10 border-b border-carbon-gray-20 flex justify-between items-center">
            <span className="font-medium">Uploaded Files ({files.length})</span>
            {files.some(f => f.status === "success") && (
              <Button 
                type="button" 
                variant="outline" 
                className="carbon-button-secondary h-8 text-xs"
                onClick={() => {
                  const successfulFiles = files.filter(f => f.status === "success");
                  toast({
                    title: "Processing files",
                    description: `Processing ${successfulFiles.length} files for conversion`,
                  });
                  
                  // Navigate to database connections page
                  navigate("/database/connections");
                }}
              >
                Continue to Database Connections
              </Button>
            )}
          </div>
          <ul className="divide-y divide-carbon-gray-20">
            {files.map(file => (
              <li key={file.id} className="flex items-center justify-between p-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 flex items-center justify-center bg-carbon-gray-10 mr-3">
                    <FileCode size={20} className="text-carbon-gray-60" />
                  </div>
                  <div>
                    <p className="text-carbon-gray-90 font-medium text-sm">
                      {file.name}
                      {file.sqlType && (
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          file.sqlType === 'teradata' 
                            ? 'bg-blue-100 text-blue-800' 
                            : file.sqlType === 'db2' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {file.sqlType === 'teradata' ? 'Teradata' : 
                           file.sqlType === 'db2' ? 'DB2' : 'SQL'}
                        </span>
                      )}
                    </p>
                    <p className="text-carbon-gray-60 text-xs">
                      {Math.round(file.size / 1024)} KB
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {file.status === "uploading" && (
                    <div className="w-32">
                      <div className="h-1.5 w-full bg-carbon-gray-20">
                        <div 
                          className="h-full bg-carbon-blue" 
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-end mt-1">
                        <Loader2 size={12} className="text-carbon-gray-60 animate-spin mr-1" />
                        <p className="text-xs text-carbon-gray-60">{file.progress}%</p>
                      </div>
                    </div>
                  )}
                  
                  {file.status === "success" && (
                    <CheckCircle size={18} className="text-carbon-success" />
                  )}
                  
                  {file.status === "error" && (
                    <div className="flex items-center">
                      <AlertTriangle size={18} className="text-carbon-error mr-1" />
                      <span className="text-carbon-error text-xs">{file.error}</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-carbon-gray-60 hover:text-carbon-error"
                  >
                    <X size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploader;