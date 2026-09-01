import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <div className="app-layout">
      <main className="main-content">
        <Sidebar />
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
}
