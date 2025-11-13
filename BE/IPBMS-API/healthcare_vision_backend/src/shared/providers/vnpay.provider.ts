// src/shared/providers/vnpay.provider.ts
import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VNPay } from 'vnpay';

export const VNPAY_CLIENT = Symbol('VNPAY_CLIENT');

export const VnpayProvider: Provider = {
  provide: VNPAY_CLIENT,
  useFactory: (config: ConfigService) =>
    new VNPay({
      tmnCode: config.getOrThrow('VNP_TMN_CODE'),
      secureSecret: config.getOrThrow('VNP_HASH_SECRET'),
      vnpayHost: config.get('VNP_HOST', 'https://sandbox.vnpayment.vn'),
      queryDrAndRefundHost: config.get('VNP_QUERY_REFUND_HOST', 'https://sandbox.vnpayment.vn'),
      testMode: config.get<boolean>('VNP_TEST_MODE' as any) ?? true,
      hashAlgorithm: (config.get('VNP_HASH_ALGO') as any) || 'SHA512',
      enableLog: true,
      loggerFn: (...a: any[]) =>
        new Logger('VNPAY').log('[VNPay] ' + a.map((x) => JSON.stringify(x)).join(' ')),
      endpoints: {
        paymentEndpoint: 'paymentv2/vpcpay.html',
        queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
        getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
      },
    }),
  inject: [ConfigService],
};
