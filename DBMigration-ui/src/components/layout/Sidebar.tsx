import { useState, useContext } from "react";
import { 
  Home, Database, FileCode, Play, Users, ChevronRight, ChevronDown, LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
// import { AuthContext } from "../../App";

type SidebarProps = {
  isOpen: boolean;
};

type NavItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  active?: boolean;
  children?: NavItem[];
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: Home, href: "/", active: true },
  { 
    label: "Database", 
    icon: Database, 
    href: "#",
    children: [
      { label: "Connections", icon: ChevronRight, href: "/database/connections" },
      { label: "Schema Browser", icon: ChevronRight, href: "/database/schema" },
      { label: "Data Validation", icon: ChevronRight, href: "/database/validation" },
    ] 
  },
  { 
    label: "SQL Scripts", 
    icon: FileCode, 
    href: "#",
    children: [
      { label: "Manage Scripts", icon: ChevronRight, href: "/scripts/manage" },
    ] 
  },
  { label: "Run Migrations", icon: Play, href: "/run" },
  //{ label: "User Management", icon: Users, href: "/users" },
];

const Sidebar = ({ isOpen }: SidebarProps) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  // const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  //const handleLogout = () => {
    //logout();
    //navigate("/login");
  //};

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label) 
        : [...prev, label]
    );
  };

  return (
    <div 
      className={cn(
        "bg-carbon-gray-10 border-r border-carbon-gray-20 h-[calc(100vh-64px)] fixed left-0 top-16 transition-all duration-300 z-20",
        isOpen ? "w-64" : "w-0 -translate-x-full"
      )}
    >
      <div className="h-full flex flex-col">
        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpanded(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-carbon-gray-70 hover:bg-carbon-gray-20 rounded-sm group",
                        expandedItems.includes(item.label) && "bg-carbon-gray-20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      {expandedItems.includes(item.label) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                    
                    {expandedItems.includes(item.label) && (
                      <ul className="pl-9 mt-1 space-y-1">
                        {item.children.map(child => (
                          <li key={child.label}>
                            <Link
                              to={child.href}
                              className="block px-3 py-1.5 text-sm text-carbon-gray-70 hover:bg-carbon-gray-20 rounded-sm"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 hover:bg-carbon-gray-20 rounded-sm",
                      item.active 
                        ? "text-carbon-blue border-l-4 border-carbon-blue pl-2" 
                        : "text-carbon-gray-70"
                    )}
                  >
                    <item.icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        
        {/* <div className="p-4 border-t border-carbon-gray-20">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-carbon-blue text-white flex items-center justify-center font-medium">
              JD
            </div>
            <div>
              <p className="text-sm font-medium text-carbon-gray-90">Logged in</p>
              <p className="text-xs text-carbon-gray-60">Administrator</p>
            </div>
          </div>
          {/* <button 
            className="flex items-center gap-2 text-carbon-gray-70 hover:text-carbon-blue text-sm mt-2"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button> 
        </div> */}
      </div>
    </div>
  );
};

export default Sidebar;