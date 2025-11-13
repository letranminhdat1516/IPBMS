import { buildVnpSignedQuery } from '../src/shared/utils/vnpay-sign.util';

describe('buildVnpSignedQuery', () => {
  it('builds canonical string and hash with RFC3986 encoding', () => {
    const params = {
      vnp_Amount: '59900000',
      vnp_Command: 'pay',
      vnp_CreateDate: '20251023013854',
      vnp_CurrCode: 'VND',
      vnp_ExpireDate: '20251023015354',
      vnp_IpAddr: '42.116.77.96',
      vnp_Locale: 'vn',
      vnp_OrderInfo: 'Lifetime future-plan-test',
      vnp_OrderType: 'other',
      vnp_ReturnUrl: 'detectcare://payment/success',
      vnp_TmnCode: '4LRA7SX8',
      vnp_TxnRef: '9b86e6d4129f485891ece19c314b627d',
      vnp_Version: '2.1.0',
    };

    const secret = 'TESTSECRET';

    const result = buildVnpSignedQuery(params, secret);

    expect(result.canonical).toBe(
      'vnp_Amount=59900000&vnp_Command=pay&vnp_CreateDate=20251023013854&vnp_CurrCode=VND&vnp_ExpireDate=20251023015354&vnp_IpAddr=42.116.77.96&vnp_Locale=vn&vnp_OrderInfo=Lifetime+future-plan-test&vnp_OrderType=other&vnp_ReturnUrl=detectcare%3A%2F%2Fpayment%2Fsuccess&vnp_TmnCode=4LRA7SX8&vnp_TxnRef=9b86e6d4129f485891ece19c314b627d&vnp_Version=2.1.0',
    );
    expect(result.hash).toBe(
      'F9B6735CF9EADBE0F970CE5A234A70654FF49DE8CC5E36F19D22BD9A2D53CB4EF8D03701765604480F9ABA2729769A159D5B8F2173CC270521099C1C1E632C8B',
    );
    expect(result.query).toBe(
      'vnp_Amount=59900000&vnp_Command=pay&vnp_CreateDate=20251023013854&vnp_CurrCode=VND&vnp_ExpireDate=20251023015354&vnp_IpAddr=42.116.77.96&vnp_Locale=vn&vnp_OrderInfo=Lifetime+future-plan-test&vnp_OrderType=other&vnp_ReturnUrl=detectcare%3A%2F%2Fpayment%2Fsuccess&vnp_TmnCode=4LRA7SX8&vnp_TxnRef=9b86e6d4129f485891ece19c314b627d&vnp_Version=2.1.0&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=F9B6735CF9EADBE0F970CE5A234A70654FF49DE8CC5E36F19D22BD9A2D53CB4EF8D03701765604480F9ABA2729769A159D5B8F2173CC270521099C1C1E632C8B',
    );
  });

  it('ignores pre-existing secure hash fields', () => {
    const params = {
      vnp_OrderInfo: 'Test',
      vnp_SecureHash: 'should-be-ignored',
      vnp_SecureHashType: 'should-be-ignored',
    };
    const secret = 'SECRET';

    const result = buildVnpSignedQuery(params, secret);

    expect(result.canonical).toBe('vnp_OrderInfo=Test');
    expect(result.query).toBe(
      'vnp_OrderInfo=Test&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=58FC81CB86F9AAFC9727BD7558D53ED9BC4AEF9F96EB10FB253A6F04D519ABA2B33D663B9A7EE8A7FE0C60E8C0EB004C57EBD94450FB71258FAB3AD93F22DEAA',
    );
  });
});
