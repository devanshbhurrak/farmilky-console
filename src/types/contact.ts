export type ContactStatus = 'unread' | 'read' | 'replied';

export interface ContactMessage {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  message: string;
  status: ContactStatus | string;
  createdAt: string;
}
