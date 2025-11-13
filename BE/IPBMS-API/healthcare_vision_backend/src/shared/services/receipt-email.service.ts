import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Payment } from '../../core/entities/payment.entity';
import { Transaction } from '../../core/entities/transaction.entity';

@Injectable()
export class ReceiptEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password',
      },
    });
  }

  async sendReceiptEmail({
    to,
    transaction,
    payment,
  }: {
    to: string;
    transaction: Transaction;
    payment: Payment;
  }) {
    const payload = {
      tx_id: transaction.tx_id,
      payment: {
        payment_id: payment.payment_id,
        provider: transaction.provider,
        status: payment.status,
        redirectUrl: payment.vnpOrderInfo || '',
      },
      upgrade: {
        fromPlan:
          transaction.plan_snapshot_old?.code ||
          transaction.plan_snapshot?.fromPlan ||
          transaction.plan_code,
        toPlan:
          transaction.plan_snapshot_new?.code ||
          transaction.plan_snapshot?.toPlan ||
          transaction.plan_code,
        proration: {
          charge: transaction.proration_charge,
          credit: transaction.proration_credit,
          amount_due: transaction.amount_total,
          currency: transaction.currency,
        },
        effective: 'immediate',
      },
    };

    const subject = `Biên nhận giao dịch #${transaction.tx_id}`;
    const html = `<h3>Biên nhận giao dịch</h3><pre>${JSON.stringify(payload, null, 2)}</pre>`;

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@example.com',
        to,
        subject,
        html,
      });
      Logger.log(
        `[ReceiptEmailService] Email sent: ${info.messageId} to: ${to}`,
        'ReceiptEmailService',
      );
      return true;
    } catch (err) {
      Logger.error(
        `[ReceiptEmailService] Email send failed to: ${to}`,
        String(err),
        'ReceiptEmailService',
      );
      return false;
    }
  }
}
