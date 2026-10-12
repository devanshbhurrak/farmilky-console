import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { BottomNav } from './bottom-nav';
import { MobileHeader } from './mobile-header';
import { MobileDrawer } from './mobile-drawer';

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className="min-h-dvh bg-surface-inset">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="lg:pl-[var(--sidebar-width)]">
        <TopBar />
        <MobileHeader />
        <main id="main-content" className="mx-auto w-full max-w-7xl p-4 pb-24 lg:p-6 lg:pb-10 xl:p-8">
          <Outlet />
        </main>
      </div>
      <BottomNav onMore={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
