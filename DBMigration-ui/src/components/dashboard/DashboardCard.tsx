
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
};

const DashboardCard = ({ title, children, className, action }: DashboardCardProps) => {
  return (
    <div className={cn("bg-white border border-carbon-gray-20 rounded-none", className)}>
      <div className="flex items-center justify-between border-b border-carbon-gray-20 px-4 py-3">
        <h2 className="text-carbon-gray-100 font-medium text-base">{title}</h2>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default DashboardCard;
