import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, X, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { convertSqlSyntax, downloadSqlFile } from "@/services/databaseService";

type EditorProps = {
  sourceCode?: string;
  targetCode?: string;
  errors?: Array<{
    line: number;
    message: string;
    severity: 'warning' | 'error';
    solution?: string;
  }>;
  onSourceChange?: (code: string) => void;
};

const CodeEditor = ({ 
  sourceCode: initialSourceCode = "", 
  targetCode: initialTargetCode = "", 
  errors: initialErrors = [],
  onSourceChange 
}: EditorProps) => {
  const [source, setSource] = useState(initialSourceCode);
  const [target, setTarget] = useState(initialTargetCode);
  const [errors, setErrors] = useState(initialErrors);
  const [activeTab, setActiveTab] = useState<"source" | "target">("source");
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStats, setConversionStats] = useState({
    successCount: 0,
    warningCount: 0,
    errorCount: 0,
  });
  
  // Update state when props change
  useEffect(() => {
    setSource(initialSourceCode);
    setTarget(initialTargetCode);
    setErrors(initialErrors);
    
    // Update stats based on errors
    if (initialErrors) {
      setConversionStats({
        successCount: initialTargetCode ? 1 : 0,
        warningCount: initialErrors.filter(e => e.severity === 'warning').length,
        errorCount: initialErrors.filter(e => e.severity === 'error').length,
      });
    }
  }, [initialSourceCode, initialTargetCode, initialErrors]);
  
  const sourceLines = source.split('\n');
  const targetLines = target.split('\n');
  
  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSource = e.target.value;
    setSource(newSource);
    if (onSourceChange) {
      onSourceChange(newSource);
    }
  };

  const handleRunConversion = async () => {
    setIsConverting(true);
    
    try {
      // Detect if the source is likely Teradata
      const isTeradataLike = source.toLowerCase().includes('qualify') || 
                            source.toLowerCase().includes('sel ');
      
      // Call our simulated backend service
      const result = await convertSqlSyntax(
        source, 
        isTeradataLike ? 'teradata' : 'other',
        'db2'
      );
      
      // Update the state with conversion results
      setTarget(result.targetCode);
      setErrors(result.issues);
      setConversionStats({
        successCount: result.successCount,
        warningCount: result.warningCount,
        errorCount: result.errorCount,
      });
      
      toast({
        title: "Conversion completed",
        description: `${result.successCount} SQL statements converted successfully`,
      });
    } catch (error) {
      toast({
        title: "Conversion failed",
        description: "An error occurred during SQL conversion",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    downloadSqlFile(target, "converted-db2-script.sql");
    toast({
      title: "Download started",
      description: "Your converted SQL script is being downloaded",
    });
  };
  
  const getTeradataParserAnnotation = () => {
    if (source.toLowerCase().includes('qualify')) {
      return `-- Python parser note: QUALIFY detected, will be converted to subquery\n`;
    } else if (source.toLowerCase().includes('sel ')) {
      return `-- Python parser note: SEL syntax detected, converting to SELECT\n`;
    }
    return '';
  };
  
  return (
    <div className="border border-carbon-gray-20">
      <div className="flex border-b border-carbon-gray-20">
        <button
          className={cn(
            "px-4 py-2 font-medium text-sm border-b-2",
            activeTab === "source"
              ? "border-carbon-blue text-carbon-blue"
              : "border-transparent text-carbon-gray-60 hover:text-carbon-gray-100"
          )}
          onClick={() => setActiveTab("source")}
        >
          Source Code
        </button>
        <button
          className={cn(
            "px-4 py-2 font-medium text-sm border-b-2",
            activeTab === "target"
              ? "border-carbon-blue text-carbon-blue"
              : "border-transparent text-carbon-gray-60 hover:text-carbon-gray-100"
          )}
          onClick={() => setActiveTab("target")}
        >
          Target Code
        </button>
      </div>
      
      <div className="flex h-[500px] overflow-hidden">
        <div className="w-1/2 overflow-auto border-r border-carbon-gray-20">
          <div className="flex">
            <div className="bg-carbon-gray-10 text-carbon-gray-60 p-2 text-right select-none w-12">
              {sourceLines.map((_, i) => (
                <div key={i} className="leading-6 text-xs">
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="p-2 flex-1 font-mono text-sm relative">
              <textarea 
                className="w-full h-full resize-none border-0 bg-transparent p-0 font-mono text-sm focus:outline-none focus:ring-0"
                value={source}
                onChange={handleSourceChange}
                spellCheck={false}
                style={{ lineHeight: "1.5rem" }}
              />
              
              {/* Overlay for error indicators */}
              <div className="absolute top-2 left-2 right-2 bottom-2 pointer-events-none">
                {errors.map((error, idx) => {
                  const line = error.line - 1;
                  if (line >= 0 && line < sourceLines.length) {
                    return (
                      <div 
                        key={idx}
                        className={cn(
                          "absolute left-0 right-0",
                          error.severity === "error" ? "bg-red-50" : "bg-yellow-50"
                        )}
                        style={{ 
                          top: `${line * 1.5}rem`, 
                          height: "1.5rem",
                          opacity: 0.5
                        }}
                      >
                        <div className="group relative h-full">
                          <div 
                            className="hidden group-hover:block absolute right-0 top-0 transform translate-y-4 z-10 w-64 bg-white shadow-lg border border-carbon-gray-20 p-3"
                          >
                            <div className="flex items-start gap-2">
                              {error.severity === "error" ? (
                                <X size={16} className="text-carbon-error mt-0.5" />
                              ) : (
                                <AlertTriangle size={16} className="text-carbon-warning mt-0.5" />
                              )}
                              <div>
                                <p className={error.severity === "error" ? "text-carbon-error font-medium" : "text-carbon-warning font-medium"}>
                                  {error.severity === "error" ? "Error" : "Warning"}
                                </p>
                                <p className="text-sm text-carbon-gray-70 mt-1">{error.message}</p>
                                {error.solution && (
                                  <p className="text-sm text-carbon-blue mt-1">Suggestion: {error.solution}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
        
        <div className="w-1/2 overflow-auto">
          <div className="flex">
            <div className="bg-carbon-gray-10 text-carbon-gray-60 p-2 text-right select-none w-12">
              {targetLines.map((_, i) => (
                <div key={i} className="leading-6 text-xs">
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="p-2 flex-1 font-mono text-sm">
              <pre className="whitespace-pre-wrap">
                {target ? getTeradataParserAnnotation() + target : 
                  "Run conversion to see the transformed code here..."}
              </pre>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-carbon-gray-20 p-3 flex items-center justify-between bg-carbon-gray-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-carbon-success" />
            <span className="text-sm">{conversionStats.successCount} successful conversions</span>
          </div>
          {conversionStats.warningCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-carbon-warning" />
              <span className="text-sm">{conversionStats.warningCount} warning{conversionStats.warningCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          {conversionStats.errorCount > 0 && (
            <div className="flex items-center gap-2">
              <X size={16} className="text-carbon-error" />
              <span className="text-sm">{conversionStats.errorCount} error{conversionStats.errorCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div>
          <Button 
            type="button" 
            className="carbon-button-primary mr-2"
            disabled={isConverting || !source}
            onClick={handleRunConversion}
          >
            {isConverting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Converting...
              </>
            ) : "Run Conversion"}
          </Button>
          <Button 
            type="button" 
            className="carbon-button-secondary"
            disabled={!target}
            onClick={handleDownload}
          >
            <Download size={16} className="mr-2" />
            Download Result
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;