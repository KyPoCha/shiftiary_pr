import { Outlet } from "react-router-dom";
import { AdminDataProvider } from "../shared/api/adminDataStore";
import { AppShell } from "./layout/AppShell";

export function App() {
  return (
    <AdminDataProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </AdminDataProvider>
  );
}
