export interface NavItem {
  label: string;
  routeName: string;
  icon: string;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', routeName: 'dashboard', icon: '📊' },
  { label: 'Missions', routeName: 'missions', icon: '🧭' },
  { label: 'Weekly Pulse', routeName: 'weekly-pulse', icon: '📝' },
  { label: 'Reports', routeName: 'reports', icon: '📁' },
  { label: 'Team & Users', routeName: 'team', icon: '👥' },
  { label: 'Settings', routeName: 'settings', icon: '⚙️' },
  { label: 'Help', routeName: 'help', icon: '❓' },
];
