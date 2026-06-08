export const EMAIL_QUEUE          = 'email-transactional';
export const CAMPAIGN_EMAIL_QUEUE = 'email-marketing';

export const EMAIL_JOB = {
  SEND:          'send',
  SEND_CAMPAIGN: 'send_campaign',
} as const;

export interface EmailJobData {
  to:       string;
  subject:  string;
  template: string;
  context:  Record<string, unknown>;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
}

export interface CampaignEmailJobData {
  campaignId: string;
  to:         string;
  subject:    string;
  html:       string;
}
