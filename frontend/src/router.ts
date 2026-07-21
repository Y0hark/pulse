import { createRouter, createWebHistory } from 'vue-router';
import ReportFormView from './views/pulse/ReportFormView.vue';
import PersonalReportView from './views/pulse/PersonalReportView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'report-form', component: ReportFormView },
    { path: '/reports/:reportId', name: 'personal-report', component: PersonalReportView, props: true },
  ],
});
