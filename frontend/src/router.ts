import { createRouter, createWebHistory } from 'vue-router';
import AppShell from './layout/AppShell.vue';
import ReportFormView from './views/pulse/ReportFormView.vue';
import SubmissionHistoryView from './views/pulse/SubmissionHistoryView.vue';
import PersonalReportView from './views/pulse/PersonalReportView.vue';
import TeamDashboardView from './views/pulse/TeamDashboardView.vue';
import SnapshotView from './views/pulse/SnapshotView.vue';
import TeamWalkthroughView from './views/pulse/TeamWalkthroughView.vue';
import MissionsView from './views/pulse/MissionsView.vue';
import MissionCreateView from './views/pulse/MissionCreateView.vue';
import MissionDetailView from './views/pulse/MissionDetailView.vue';
import MissionEditView from './views/pulse/MissionEditView.vue';
import ReportsHomeView from './views/pulse/ReportsHomeView.vue';
import ReportHistoryView from './views/pulse/ReportHistoryView.vue';
import CompletionReportView from './views/pulse/CompletionReportView.vue';
import ConsolidatedReportView from './views/pulse/ConsolidatedReportView.vue';
import SettingsView from './views/pulse/SettingsView.vue';
import HelpView from './views/pulse/HelpView.vue';
import NotFoundView from './views/pulse/NotFoundView.vue';
import LoginView from './views/pulse/LoginView.vue';
import DesignSystemView from './views/DesignSystemView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/design-system', name: 'design-system', component: DesignSystemView },
    {
      path: '/',
      component: AppShell,
      children: [
        { path: '', redirect: { name: 'dashboard' } },
        { path: 'dashboard', name: 'dashboard', component: TeamDashboardView, meta: { title: 'Dashboard' } },
        { path: 'missions', name: 'missions', component: MissionsView, meta: { title: 'Missions' } },
        {
          path: 'missions/new',
          name: 'mission-create',
          component: MissionCreateView,
          meta: { title: 'New mission' },
        },
        {
          path: 'missions/:slug',
          name: 'mission-detail',
          component: MissionDetailView,
          props: true,
          meta: { title: 'Mission' },
        },
        {
          path: 'missions/:slug/edit',
          name: 'mission-edit',
          component: MissionEditView,
          props: true,
          meta: { title: 'Edit mission' },
        },
        {
          path: 'weekly-pulse',
          name: 'weekly-pulse',
          component: ReportFormView,
          meta: { title: 'Weekly Pulse' },
        },
        {
          path: 'weekly-pulse/history',
          name: 'submission-history',
          component: SubmissionHistoryView,
          meta: { title: 'Submission history' },
        },
        { path: 'reports', name: 'reports', component: ReportsHomeView, meta: { title: 'Reports' } },
        {
          path: 'reports/completion',
          name: 'reports-completion',
          component: CompletionReportView,
          meta: { title: 'Delay / completion report' },
        },
        {
          path: 'reports/consolidated',
          name: 'reports-consolidated',
          component: ConsolidatedReportView,
          meta: { title: 'Consolidated report' },
        },
        {
          path: 'reports/history',
          name: 'reports-history',
          component: ReportHistoryView,
          meta: { title: 'Report history' },
        },
        {
          path: 'reports/:reportId',
          name: 'personal-report',
          component: PersonalReportView,
          props: true,
          meta: { title: 'Report' },
        },
        {
          path: 'periods/:periodId/snapshot',
          name: 'period-snapshot',
          component: SnapshotView,
          props: true,
          meta: { title: 'Period Snapshot' },
        },
        {
          path: 'reports/walkthrough',
          name: 'reports-walkthrough',
          component: TeamWalkthroughView,
          meta: { title: 'Walkthrough' },
        },
        { path: 'settings', name: 'settings', component: SettingsView, meta: { title: 'Settings' } },
        { path: 'help', name: 'help', component: HelpView, meta: { title: 'Help' } },
        { path: ':pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { title: 'Not found' } },
      ],
    },
  ],
});
