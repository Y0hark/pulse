export interface NavItem {
  label: string;
  routeName: string;
  icon: string;
  /** Hidden from non-global-admins — the destination route enforces this too, this just
   * keeps a user from seeing a link they can't use. */
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', routeName: 'dashboard', icon: '📊' },
  { label: 'Missions', routeName: 'missions', icon: '🧭' },
  { label: 'Weekly Pulse', routeName: 'weekly-pulse', icon: '📝' },
  { label: 'Reports', routeName: 'reports', icon: '📁' },
  { label: 'Settings', routeName: 'settings', icon: '⚙️', adminOnly: true },
  { label: 'Help', routeName: 'help', icon: '❓' },
];
