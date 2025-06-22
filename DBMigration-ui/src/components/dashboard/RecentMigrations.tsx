
import { FileCode, CheckCircle, AlertTriangle, X } from "lucide-react";

type Migration = {
  id: string;
  name: string;
  source: string;
  target: string;
  date: string;
  status: "success" | "warning" | "error";
};

const recentMigrations: Migration[] = [
  {
    id: "mig-001",
    name: "Customer Reporting Scripts",
    source: "Teradata",
    target: "IBM Db2",
    date: "2025-05-08",
    status: "success"
  },
  {
    id: "mig-002",
    name: "Finance Data Migration",
    source: "Oracle",
    target: "IBM Db2",
    date: "2025-05-07",
    status: "warning"
  },
  {
    id: "mig-003",
    name: "Inventory Management",
    source: "Teradata",
    target: "IBM Db2",
    date: "2025-05-05",
    status: "success"
  },
  {
    id: "mig-004",
    name: "HR Analytics Scripts",
    source: "SQL Server",
    target: "IBM Db2",
    date: "2025-05-03",
    status: "error"
  }
];

const StatusIcon = ({ status }: { status: Migration["status"] }) => {
  if (status === "success") {
    return <CheckCircle size={16} className="text-carbon-success" />;
  }
  if (status === "warning") {
    return <AlertTriangle size={16} className="text-carbon-warning" />;
  }
  return <X size={16} className="text-carbon-error" />;
};

const RecentMigrations = () => {
  return (
    <div className="overflow-x-auto">
      <table className="carbon-table">
        <thead>
          <tr>
            <th className="carbon-table-header">Name</th>
            <th className="carbon-table-header">Source</th>
            <th className="carbon-table-header">Target</th>
            <th className="carbon-table-header">Date</th>
            <th className="carbon-table-header">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-carbon-gray-20">
          {recentMigrations.map((migration) => (
            <tr key={migration.id}>
              <td className="carbon-table-cell">
                <div className="flex items-center gap-3">
                  <FileCode size={16} className="text-carbon-blue" />
                  <a href={`/migration/${migration.id}`} className="text-carbon-blue hover:underline">
                    {migration.name}
                  </a>
                </div>
              </td>
              <td className="carbon-table-cell">{migration.source}</td>
              <td className="carbon-table-cell">{migration.target}</td>
              <td className="carbon-table-cell">{migration.date}</td>
              <td className="carbon-table-cell">
                <div className="flex items-center gap-2">
                  <StatusIcon status={migration.status} />
                  <span>
                    {migration.status === "success" && "Successful"}
                    {migration.status === "warning" && "Warnings"}
                    {migration.status === "error" && "Failed"}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecentMigrations;
