export const EMAIL_SEND = 'email.send';

export interface EmailSendPayload {
  to:         string;
  subject:    string;
  template:   string;
  context:    Record<string, unknown>;
  retries?:   number;
}
