/** @jest-environment node */
import { scheduleReviewRequest } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { issueReviewToken } from '@/lib/customer-capabilities';
jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/email', () => ({ sendEmail: jest.fn() }));
jest.mock('@/lib/customer-capabilities', () => ({ ...jest.requireActual('@/lib/customer-capabilities'), issueReviewToken: jest.fn() }));
beforeEach(() => { jest.resetAllMocks(); (issueReviewToken as jest.Mock).mockResolvedValue('A'.repeat(43)); (sendEmail as jest.Mock).mockResolvedValue(true); });
it('schedules a scoped review link after verified registration, without an auto-write/redirect URL', async () => {
  await scheduleReviewRequest({ customerId:'customer-a',name:'A',email:'a@example.invalid',businessName:'A',googleLink:'https://g.page/r/a/review' });
  expect(issueReviewToken).toHaveBeenCalledWith('customer-a');
  const mail = (sendEmail as jest.Mock).mock.calls[0][0];
  expect(mail.html).toContain('#token='+'A'.repeat(43)); expect(mail.html).not.toContain('auto=1'); expect(mail.html).not.toContain('redirect='); expect(mail.scheduledAt).toEqual(expect.any(String));
});
it('does not issue a capability or send mail without a configured review destination', async () => {
  expect(await scheduleReviewRequest({ customerId:'customer-a',name:'A',email:'a@example.invalid',businessName:'A',googleLink:null })).toBe(false);
  expect(issueReviewToken).not.toHaveBeenCalled(); expect(sendEmail).not.toHaveBeenCalled();
});
