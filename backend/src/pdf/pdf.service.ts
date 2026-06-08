import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import PDFDocument            from 'pdfkit';

export interface InvoiceData {
  invoiceId:    string;
  customerName: string;
  customerEmail: string;
  plan:         string;
  amount:       number;   // in USD cents
  currency:     string;
  periodStart:  Date;
  periodEnd:    Date;
  issuedAt:     Date;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.appUrl = this.config.get<string>('APP_URL') ?? 'https://app.gateml.com';
  }

  /** Generate a PDF invoice and return it as a Buffer. */
  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data',  chunk => chunks.push(chunk));
      doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
      doc.on('error', err   => reject(err));

      const amountStr  = `$${(data.amount / 100).toFixed(2)} ${data.currency.toUpperCase()}`;
      const dateStr    = data.issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const periodStr  = `${data.periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${data.periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      // ── Header ──────────────────────────────────────────────────────────────
      doc.fontSize(24).fillColor('#7c3aed').text('GateML', 50, 50);
      doc.fontSize(10).fillColor('#888888').text('AI Gateway Platform', 50, 78);

      doc.fontSize(28).fillColor('#111111').text('INVOICE', 350, 50, { align: 'right' });

      // ── Invoice meta ────────────────────────────────────────────────────────
      doc.fontSize(10).fillColor('#555555');
      doc.text(`Invoice #:`,   350, 95, { continued: true }).fillColor('#111111').text(` ${data.invoiceId}`, { align: 'right' });
      doc.fillColor('#555555');
      doc.text(`Date:`,        350, 112, { continued: true }).fillColor('#111111').text(` ${dateStr}`, { align: 'right' });
      doc.fillColor('#555555');
      doc.text(`Status:`,      350, 129, { continued: true }).fillColor('#22c55e').text(' PAID', { align: 'right' });

      // ── Divider ─────────────────────────────────────────────────────────────
      doc.moveTo(50, 155).lineTo(545, 155).strokeColor('#e5e7eb').lineWidth(1).stroke();

      // ── Billing to ──────────────────────────────────────────────────────────
      doc.fontSize(9).fillColor('#888888').text('BILL TO', 50, 170);
      doc.fontSize(12).fillColor('#111111').text(data.customerName, 50, 185);
      doc.fontSize(10).fillColor('#555555').text(data.customerEmail, 50, 202);

      // ── Line items table ────────────────────────────────────────────────────
      const tableTop = 260;
      doc.moveTo(50, tableTop - 10).lineTo(545, tableTop - 10).strokeColor('#e5e7eb').stroke();

      doc.fontSize(9).fillColor('#888888');
      doc.text('DESCRIPTION',  50,  tableTop);
      doc.text('PERIOD',       280, tableTop);
      doc.text('AMOUNT',       460, tableTop, { width: 85, align: 'right' });

      doc.moveTo(50, tableTop + 18).lineTo(545, tableTop + 18).strokeColor('#e5e7eb').stroke();

      const row = tableTop + 28;
      doc.fontSize(11).fillColor('#111111');
      doc.text(`GateML ${data.plan} Plan`,  50,  row);
      doc.fontSize(10).fillColor('#555555');
      doc.text(periodStr, 280, row);
      doc.fontSize(11).fillColor('#111111');
      doc.text(amountStr, 460, row, { width: 85, align: 'right' });

      doc.moveTo(50, row + 24).lineTo(545, row + 24).strokeColor('#e5e7eb').stroke();

      // ── Total ────────────────────────────────────────────────────────────────
      doc.fontSize(12).fillColor('#111111');
      doc.text('Total:',       350, row + 34);
      doc.fontSize(14).fillColor('#7c3aed');
      doc.text(amountStr,      460, row + 32, { width: 85, align: 'right' });

      // ── Footer ────────────────────────────────────────────────────────────────
      doc.fontSize(9).fillColor('#aaaaaa')
        .text(`Questions? Contact support at ${this.appUrl}/dashboard/support`, 50, 720, { align: 'center', width: 495 });

      doc.end();
    });
  }

  /** Lightweight payment receipt (simpler than full invoice). */
  async generateReceipt(data: Pick<InvoiceData, 'invoiceId' | 'customerName' | 'plan' | 'amount' | 'currency' | 'issuedAt'>): Promise<Buffer> {
    return this.generateInvoice({
      ...data,
      customerEmail: '',
      periodStart:   data.issuedAt,
      periodEnd:     data.issuedAt,
    });
  }
}
