import { initializeCenterGameUi } from './center-ui';
import { enhanceEnrollmentDatesPage } from './pages/enrollment-dates-page';
import { enhanceGradesPage } from './pages/grades-page';
import { enhanceKardexPage } from './pages/kardex-page';
import { enhancePersonalDataPage } from './pages/personal-data-page';
import { enhanceSchedulePage, isScheduleResultDocument } from './pages/schedule-page';
import { enhanceStudentStatusPage } from './pages/student-status-page';
import { detectSiasePage } from '@/utils/siase-url';
import { enhancementsEnabled } from '@/utils/enhancements';
export async function routeSiasePage(url: URL, frameDocument: Document): Promise<void> { if (!(await enhancementsEnabled())) return; if (window.name === 'center') initializeCenterGameUi(frameDocument, url); const page = detectSiasePage(url); const isScheduleResponse = url.pathname.endsWith('/control.p') && isScheduleResultDocument(frameDocument); if (page === 'grades') await enhanceGradesPage(frameDocument); if (page === 'schedule' || isScheduleResponse) await enhanceSchedulePage(frameDocument); if (page === 'kardex') await enhanceKardexPage(frameDocument); if (page === 'personalData') await enhancePersonalDataPage(frameDocument); if (page === 'enrollmentDates') await enhanceEnrollmentDatesPage(frameDocument); if (page === 'studentStatus') await enhanceStudentStatusPage(frameDocument); }
void routeSiasePage(new URL(location.href), document);
