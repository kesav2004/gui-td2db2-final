import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
const NotFound = () => {
  const location = useLocation();
  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-carbon-gray-10">
      <div className="text-center p-8 max-w-lg">
        <AlertTriangle className="mx-auto w-16 h-16 text-carbon-error mb-6" />
        <h1 className="text-5xl font-light mb-4 text-carbon-gray-100">404</h1>
        <p className="text-xl text-carbon-gray-70 mb-6">
          The page you're looking for cannot be found.
        </p>
        <p className="text-carbon-gray-60 mb-8">
          The requested URL {location.pathname} was not found on this server.
        </p>
        <Button asChild className="px-6">
          <a href="/">Return to Dashboard</a>
        </Button>
      </div>
    </div>
  );
};
export default NotFound;






