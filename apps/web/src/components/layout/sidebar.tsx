'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderKanban,
  Sparkles,
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Store,
  Video,
  FileText,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';

interface SidebarProps {
  user: {
    email: string;
    name?: string;
  };
  onLogout: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  disabled?: boolean;
  soon?: boolean;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
];

const futureNavItems: NavItem[] = [
  { label: 'Analytics', href: '/analytics', icon: BarChart3, soon: true },
  { label: 'Marketplace', href: '/marketplace', icon: Store, soon: true },
  { label: 'Script to Video', href: '/video', icon: Video, soon: true },
  { label: 'Templates', href: '/templates', icon: FileText, soon: true },
  { label: 'Team', href: '/team', icon: Users, soon: true },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Help & Support', href: '/help', icon: HelpCircle },
];

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    if (item.disabled || item.soon) {
      return (
        <div
          className={cn(
            'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-not-allowed opacity-50',
            collapsed && 'justify-center px-2',
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                  Soon
                </span>
              )}
            </>
          )}
        </div>
      );
    }

    return (
      <Link
        href={item.href}
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          active
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          collapsed && 'justify-center px-2',
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
        )}
        <Icon className={cn('h-5 w-5 shrink-0', active && 'text-primary')} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col bg-sidebar border-r border-border transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-border', collapsed && 'justify-center px-2')}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground tracking-tight">Script Factory</span>
              <span className="text-[10px] text-muted-foreground">UGC Scripts</span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <Separator className="my-4" />

        {/* Coming Soon Section */}
        {!collapsed && (
          <div className="px-3 mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Coming Soon
            </span>
          </div>
        )}
        <div className="space-y-1">
          {futureNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-border">
        {/* Upgrade Banner */}
        {!collapsed && (
          <div className="p-3">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-4">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">Upgrade to Pro</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Get 500 scripts/month and unlock all features
                </p>
                <Button size="sm" className="w-full h-8 text-xs">
                  Upgrade — $12/mo
                </Button>
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-primary/10 blur-xl" />
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div className="px-3 py-2 space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* User Section */}
        <div className={cn('p-3 border-t border-border', collapsed && 'px-2')}>
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <Avatar
              fallback={user.name || user.email}
              size="sm"
              className="bg-secondary"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border shadow-md hover:bg-secondary transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
    </aside>
  );
}

export function SidebarSpacer({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        'shrink-0 transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    />
  );
}
