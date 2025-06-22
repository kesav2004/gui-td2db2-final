import React from "react";

type SidebarItemProps = {
  name: string;
  isActive: boolean;
  icon: React.ReactNode;
  onClick: () => void;
};

const SidebarItem = ({ name, isActive, icon, onClick }: SidebarItemProps) => {
  return (
    <div
      className={`flex items-center text-sm p-2 cursor-pointer ${
        isActive ? "bg-carbon-blue bg-opacity-10 text-carbon-blue font-medium" : "hover:bg-gray-100"
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="ml-2">{name}</span>
    </div>
  );
};

export default SidebarItem;