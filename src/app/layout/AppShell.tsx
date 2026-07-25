import { BookOpenCheck, ClipboardCheck, Hospital, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

const navItems = [
  { to: "/", label: "Customer Accounts", icon: Hospital },
  { to: "/generator-evaluation", label: "Generator Evaluation", icon: ClipboardCheck },
  { to: "/help-center", label: "Help Center", icon: BookOpenCheck },
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <div className="brand-mark">
            <Settings2 aria-hidden="true" size={20} />
          </div>
          <div>
            <strong>Rozpis Admin</strong>
            <span>Assessment prototype</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            >
              <item.icon aria-hidden="true" size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-panel">{children}</main>
    </div>
  );
}
