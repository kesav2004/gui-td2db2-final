import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { useState, useEffect, createContext } from "react";

// Import Carbon styles
import '@carbon/styles/css/styles.css';

import Index from "./pages/Index";
// import Login from "./pages/Login";
import Questionnaire from "./pages/Questionnaire";
import ScriptUpload from "./pages/ScriptUpload";
import ManageScripts from "./pages/ManageScripts";
import DatabaseConnections from "./pages/DatabaseConnections";
import SchemaBrowser from "./pages/SchemaBrowser";
import ConversionEditor from "./pages/ConversionEditor";
import DataValidation from "./pages/DataValidation";
import NotFound from "./pages/NotFound";

// Create auth context
//export const AuthContext = createContext({
  //isAuthenticated: false,
  //login: (email: string, password: string): boolean => false,
  //logout: () => {}
//});

const queryClient = new QueryClient();

const App = () => {
  // Use state to track authentication
  // const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check localStorage on initial load
  // useEffect(() => {
    // const auth = localStorage.getItem("ibm-migration-auth");
    // if (auth) {
      //setIsAuthenticated(true);
    //} else {
      // Force logout if no auth data is found
      //setIsAuthenticated(false);
    //}
  //}, []);

  // Login function
  //const login = (email: string, password: string): boolean => {
    // For demo purposes, accept any email/password combination
    //localStorage.setItem("ibm-migration-auth", JSON.stringify({ email }));
    /*setIsAuthenticated(true);
    return true;
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("ibm-migration-auth");
    setIsAuthenticated(false);
  }; */

  return (
    //<AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/*<Route 
                path="/login" 
                element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
              /> */}
              <Route 
                path="/" 
                // element={isAuthenticated ? <Index /> : <Navigate to="/login" />}
                element={<Index />}
              />
              <Route 
                path="/questionnaire/:id" 
                // element={isAuthenticated ? <Questionnaire /> : <Navigate to="/login" />}
                element={<Questionnaire />}
              />
              <Route 
                path="/questionnaire/create" 
                // element={isAuthenticated ? <Questionnaire /> : <Navigate to="/login" />}
                element={<Questionnaire />}
              />
              <Route 
                path="/scripts/upload" 
                // element={isAuthenticated ? <ScriptUpload /> : <Navigate to="/login" />}
                element={<ScriptUpload />}
              />
              <Route 
                path="/scripts/manage" 
                // element={isAuthenticated ? <ManageScripts /> : <Navigate to="/login" />}
                element={<ManageScripts />}
              />
              <Route 
                path="/database/connections" 
                // element={isAuthenticated ? <DatabaseConnections /> : <Navigate to="/login" />}
                element={<DatabaseConnections />}
              />
              <Route 
                path="/database/schema" 
                //element={isAuthenticated ? <SchemaBrowser /> : <Navigate to="/login" />}
                element={<SchemaBrowser />}
              />
              <Route 
                path="/database/validation" 
                element={<DataValidation />}
              />
              <Route 
                path="/conversion/editor" 
                // element={isAuthenticated ? <ConversionEditor /> : <Navigate to="/login" />} 
                element={<ConversionEditor />}
              />
              {/* Add redirect for /run to /conversion/editor */}
              <Route 
                path="/run" 
                element={<Navigate to="/conversion/editor" replace />} 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
   // </AuthContext.Provider>
  );
};

export default App;