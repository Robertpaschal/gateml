import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation }       from '@nestjs/swagger';
import { ConfigService }               from '@nestjs/config';
import { PrismaService }               from '../prisma/prisma.service';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Response }               from 'express';

@ApiTags('unsubscribe')
@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly config:  ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'One-click unsubscribe from marketing emails (linked from campaign footer)' })
  async unsubscribe(
    @Query('e') encodedEmail: string,
    @Query('t') token: string,
    @Res() res: Response,
  ) {
    // Both params required
    if (!encodedEmail || !token) {
      return res.status(400).send(this.page('Invalid Link', 'The unsubscribe link is missing required parameters.', false));
    }

    let email: string;
    try {
      email = Buffer.from(encodedEmail, 'base64url').toString('utf8');
    } catch {
      return res.status(400).send(this.page('Invalid Link', 'The unsubscribe link appears to be malformed.', false));
    }

    // Verify HMAC — timing-safe comparison prevents enumeration attacks
    const secret   = this.config.get<string>('UNSUBSCRIBE_SECRET') ?? 'gateml-unsub-secret';
    const expected = createHmac('sha256', secret).update(email).digest('hex');
    if (!timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return res.status(400).send(this.page('Invalid Link', 'The unsubscribe link is invalid or has expired.', false));
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether the email is registered
      return res.status(200).send(this.page('Unsubscribed', 'You have been removed from GateML marketing emails.', true));
    }

    if (user.unsubscribedFromMarketing) {
      return res.status(200).send(this.page(
        'Already Unsubscribed',
        `${email} is already opted out of marketing emails. You will still receive transactional emails like invoices and password resets.`,
        true,
      ));
    }

    await this.prisma.user.update({
      where: { email },
      data:  { unsubscribedFromMarketing: true },
    });

    return res.status(200).send(this.page(
      'Unsubscribed Successfully',
      `${email} has been removed from GateML marketing emails. You will still receive essential account emails (invoices, security alerts, password resets).`,
      true,
    ));
  }

  private page(title: string, message: string, success: boolean): string {
    const appUrl = this.config.get<string>('APP_URL') ?? 'https://app.gateml.com';
    const icon   = success ? '✓' : '✗';
    const accent = success ? '#16a34a' : '#dc2626';
    const bg     = success ? 'rgba(22,163,74,.12)' : 'rgba(220,38,38,.12)';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title} — GateML</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e2e2e2;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{max-width:440px;width:100%;background:#141414;border:1px solid #242424;border-radius:12px;padding:44px 40px;text-align:center}
    .icon{width:52px;height:52px;border-radius:50%;background:${bg};border:1px solid ${accent}22;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:20px;color:${accent}}
    h1{font-size:19px;font-weight:700;color:#fff;margin-bottom:10px}
    p{font-size:13px;color:#888;line-height:1.65;margin-bottom:28px}
    a{display:inline-block;padding:10px 22px;background:#7c3aed;color:#fff;border-radius:7px;text-decoration:none;font-size:13px;font-weight:500}
    a:hover{background:#6d28d9}
    .brand{margin-bottom:24px;font-size:12px;font-weight:700;letter-spacing:.05em;color:#7c3aed}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">GateML</div>
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${appUrl}">Return to GateML</a>
  </div>
</body>
</html>`;
  }
}
