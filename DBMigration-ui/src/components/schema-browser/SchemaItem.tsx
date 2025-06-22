
import React from "react";
import { Database } from "lucide-react";

type SchemaItemProps = {
  name: string;
  isActive: boolean;
  onClick: () => void;
};

const SchemaItem = ({ name, isActive, onClick }: SchemaItemProps) => {
  return (
    <div
      className={`flex items-center text-sm p-2 cursor-pointer ${
        isActive ? "bg-carbon-blue bg-opacity-5 text-carbon-blue" : "hover:bg-gray-100"
      }`}
      onClick={onClick}
    >
      <Database size={16} className="text-carbon-blue-60" />
      <span className="ml-2">{name}</span>
    </div>
  );
};

export default SchemaItem;