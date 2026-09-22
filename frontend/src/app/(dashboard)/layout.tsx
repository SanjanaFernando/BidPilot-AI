import Sidebar from "@/components/layout/Sidebar";
import GlobalRoleSwitcher from "@/components/rbac/GlobalRoleSwitcher";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#F7F9FB", minHeight: "100vh" }}>
      <Sidebar />
      <div className="gov-main" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <GlobalRoleSwitcher />
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
