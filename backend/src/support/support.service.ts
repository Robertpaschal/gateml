import { Injectable } from '@nestjs/common';
import { PrismaService }    from '../prisma/prisma.service';
import { EmailService }     from '../email/email.service';
import { ContactCategory }  from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email:  EmailService,
  ) {}

  async submitContact(
    userId: string | null,
    userEmail: string,
    userName: string,
    subject: string,
    body: string,
    category: ContactCategory = ContactCategory.SUPPORT,
    company?: string,
  ) {
    const msg = await this.prisma.contactMessage.create({
      data: { userId, email: userEmail, name: userName, subject, body, category, company },
    });

    await Promise.all([
      this.email.sendSupportConfirmation(userEmail, userName, subject),
      this.email.notifyAdminNewMessage(userEmail, userName, subject, body, company, category),
    ]);

    return { id: msg.id, status: msg.status, category: msg.category };
  }

  /** Public (unauthenticated) contact from the marketing site. */
  async submitPublicContact(
    email: string,
    name: string,
    subject: string,
    body: string,
    category: ContactCategory,
    company?: string,
  ) {
    return this.submitContact(null, email, name, subject, body, category, company);
  }
}
