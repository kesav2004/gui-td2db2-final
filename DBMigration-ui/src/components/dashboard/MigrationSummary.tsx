
import { BarChart2, ArrowUpRight, CheckCircle, AlertTriangle, X } from "lucide-react";

const MigrationSummary = () => {
  const stats = [
    { label: "Total Scripts", value: 128, icon: BarChart2, color: "text-carbon-blue" },
    { label: "Successfully Converted", value: 89, icon: CheckCircle, color: "text-carbon-success" },
    { label: "Warnings", value: 32, icon: AlertTriangle, color: "text-carbon-warning" },
    { label: "Failed", value: 7, icon: X, color: "text-carbon-error" },
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div 
          key={stat.label}
          className="bg-white border border-carbon-gray-20 p-4 flex flex-col"
        >
          <div className="flex justify-between items-center mb-4">
            <span className={`${stat.color}`}>
              <stat.icon size={24} />
            </span>
            <ArrowUpRight size={16} className="text-carbon-gray-60" />
          </div>
          <div className="mt-auto">
            <div className="text-2xl font-semibold text-carbon-gray-100 mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-carbon-gray-60">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MigrationSummary;
