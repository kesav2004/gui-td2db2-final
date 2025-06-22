import { useState} from "react";
// import { useContext } from "react";
import {
  Header as CarbonHeader,
  HeaderGlobalAction,
  HeaderMenuButton,
  HeaderName,
  HeaderGlobalBar,
} from "@carbon/react";
//import { LogOut } from "lucide-react";
//import { AuthContext } from "../../App";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import IBMLogo from "../icons/IBMLogo";

type HeaderProps = {
  toggleSidebar: () => void;
  sidebarOpen: boolean;
};

const Header = ({ toggleSidebar, sidebarOpen }: HeaderProps) => {
  // const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  //const handleLogout = () => {
    //logout();
    //navigate("/login");
  //};

  return (
    <CarbonHeader aria-label="IBM AI Database Migration">
      <HeaderMenuButton
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        onClick={toggleSidebar}
        isActive={sidebarOpen}
      />

      <HeaderName prefix="" href="/">
        <div className="flex items-center gap-2">
          <IBMLogo className="h-6 w-6" />
          <span className="hidden md:block">Database Migration</span>
        </div>
      </HeaderName>

      {/* Removed HeaderNavigation and Questionnaires menu */}

      {/* <HeaderGlobalBar>
        <HeaderGlobalAction
          aria-label="Log out"
          onClick={handleLogout}
          tooltipAlignment="end"
        >
          <LogOut size={20} />
        </HeaderGlobalAction>
      </HeaderGlobalBar> */}
    </CarbonHeader>
  );
};

export default Header;
