import React from "react";
import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  Network,
  Brain,
  UserRound,
  WalletCards,
  Upload,
  FolderOpen,
  Folder,
  UserPlus,
  LogOut,
  FileText,
  BadgeCheck,
} from "lucide-react";

import "./Sidebar.css";

const menuItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    end: true,
  },
  {
    name: "Employee Data",
    path: "/teams",
    icon: Users,
    end: true,
  },
  {
    name: "Recruitment",
    path: "/recruitment",
    icon: UserPlus,
  },
  {
    name: "Onboarding",
    path: "/onboarding",
    icon: UserRound,
  },
  {
    name: "JD",
    path: "/jd",
    icon: Folder,
  },
  {
    name: "Payroll Details",
    path: "/payroll-details",
    icon: WalletCards,
  },
  {
    name: "Leave Policies",
    path: "/leave-policies",
    icon: FileText,
  },
  {
    name: "Company Expenses",
    path: "/company-expenses",
    icon: FolderOpen,
  },
  {
    name: "Asset Inventory",
    path: "/asset-inventory",
    icon: Folder,
  },
  {
    name: "Exit",
    path: "/exit",
    icon: LogOut,
  },
  {
    name: "ISO Certifications",
    path: "/iso-certifications",
    icon: BadgeCheck,
  },
  {
    name: "Workout Sheet MOM",
    path: "/workout-mom",
    icon: FileText,
  },
];

function Sidebar({ isOpen = true }) {
  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      
      {/* BRAND */}
      <div className="sidebar-brand">
        <div className="brand-logo">HR</div>

        <div className="brand-text">
          <h2>Employee Dashboard</h2>
          <span>Employee Management</span>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={21} strokeWidth={2} />

              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

    </aside>
  );
}

export default Sidebar;