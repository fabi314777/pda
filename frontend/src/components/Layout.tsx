import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SidebarProvider } from '../hooks/useSidebar';

export function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[var(--color-bg)]">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
