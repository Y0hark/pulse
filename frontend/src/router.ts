import { createRouter, createWebHistory } from 'vue-router';
import ReportFormView from './views/pulse/ReportFormView.vue';
import PersonalReportView from './views/pulse/PersonalReportView.vue';
import TeamDashboardView from './views/pulse/TeamDashboardView.vue';
import SnapshotView from './views/pulse/SnapshotView.vue';
import TeamWalkthroughView from './views/pulse/TeamWalkthroughView.vue';
import LoginView from './views/pulse/LoginView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/', name: 'report-form', component: ReportFormView },
    { path: '/reports/:reportId', name: 'personal-report', component: PersonalReportView, props: true },
    { path: '/dashboard', name: 'team-dashboard', component: TeamDashboardView },
    { path: '/periods/:periodId/snapshot', name: 'period-snapshot', component: SnapshotView, props: true },
    { path: '/walkthrough', name: 'team-walkthrough', component: TeamWalkthroughView },
  ],
});
