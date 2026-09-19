import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#F7F9FB", minHeight: "100vh" }}>
      <Sidebar />
      <div className="gov-main">{children}</div>
    </div>
  );
}
