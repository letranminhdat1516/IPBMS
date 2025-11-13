import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';

/// Small verification helper for VNPay HMAC-SHA512 secure hash.
///
/// Usage: edit the [checkoutUrl] and [secretKey] constants below then run:
///   dart run tools/vnpay_verify.dart
///
/// It will parse the query parameters, build the signing string by sorting
/// parameter keys alphabetically (excluding vnp_SecureHash and
/// vnp_SecureHashType), percent-encoding values using RFC 3986, and then
/// compute HMAC-SHA512(secretKey, signingString). The computed hex is
/// compared to the vnp_SecureHash present in the URL.

void main(List<String> args) {
  // Accept checkoutUrl and secretKey via command-line arguments or environment
  // variables for convenience. Usage:
  //   dart run tools/vnpay_verify.dart <checkoutUrl> <secretKey>
  // or set env vars: VNP_CHECKOUT_URL and VNP_SECRET_KEY
  final envCheckout = Platform.environment['VNP_CHECKOUT_URL'];
  final envSecret = Platform.environment['VNP_SECRET_KEY'];

  final checkoutUrl = args.isNotEmpty ? args[0] : (envCheckout ?? '');
  final secretKey = args.length > 1 ? args[1] : (envSecret ?? '');

  if (checkoutUrl.isEmpty || secretKey.isEmpty) {
    stdout.writeln(
      'Usage: dart run tools/vnpay_verify.dart <checkoutUrl> <secretKey>',
    );
    stdout.writeln('Or set env vars VNP_CHECKOUT_URL and VNP_SECRET_KEY');
    exit(1);
  }

  final uri = Uri.parse(checkoutUrl);
  final queryParams = Map<String, String>.from(
    uri.queryParametersAll.map((k, v) => MapEntry(k, v.join(','))),
  );

  final providedHash = queryParams['vnp_SecureHash'];
  if (providedHash == null) {
    stdout.writeln('No vnp_SecureHash found in URL');
    exit(1);
  }

  // Remove hash params from signing
  queryParams.remove('vnp_SecureHash');
  queryParams.remove('vnp_SecureHashType');

  // Helper to compute HMAC-SHA512 hex
  String computeHashForString(String s) {
    final keyBytes = utf8.encode(secretKey);
    final msgBytes = utf8.encode(s);
    final hmac = Hmac(sha512, keyBytes);
    final digest = hmac.convert(msgBytes);
    return digest.bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  String computeHashUpperForString(String s) {
    return computeHashForString(s).toUpperCase();
  }

  // 1) Signing using decoded values with RFC3986 encoding (Uri.encodeQueryComponent)
  final sortedKeys = queryParams.keys.toList()..sort();
  final partsRfc = <String>[];
  for (final k in sortedKeys) {
    final v = queryParams[k] ?? '';
    final encoded = Uri.encodeQueryComponent(v);
    partsRfc.add('$k=$encoded');
  }
  final signingRfc = partsRfc.join('&');
  final hashRfc = computeHashForString(signingRfc);
  final hashRfcUpper = computeHashUpperForString(signingRfc);

  // 2) Signing using decoded values but space encoded as '+' (application/x-www-form-urlencoded)
  final partsPlus = <String>[];
  for (final k in sortedKeys) {
    final v = queryParams[k] ?? '';
    var encoded = Uri.encodeQueryComponent(v);
    // convert percent-encoded space (%20) to plus for form-encoding
    encoded = encoded.replaceAll('%20', '+');
    partsPlus.add('$k=$encoded');
  }
  final signingPlus = partsPlus.join('&');
  final hashPlus = computeHashForString(signingPlus);
  final hashPlusUpper = computeHashUpperForString(signingPlus);

  // 3) Signing using raw query parts as present in the original URL
  //    This keeps original percent-encoding and plus signs intact.
  final rawParts = uri.query
      .split('&')
      .where((p) => p.isNotEmpty)
      .where((p) => !p.startsWith('vnp_SecureHash='))
      .where((p) => !p.startsWith('vnp_SecureHashType='))
      .toList();
  // sort by key name (string before '=')
  rawParts.sort((a, b) {
    final ka = a.split('=')[0];
    final kb = b.split('=')[0];
    return ka.compareTo(kb);
  });
  final signingRaw = rawParts.join('&');
  final hashRaw = computeHashForString(signingRaw);
  final hashRawUpper = computeHashUpperForString(signingRaw);

  stdout.writeln('Provided vnp_SecureHash: $providedHash\n');
  stdout.writeln('--- RFC3986 (Uri.encodeQueryComponent) ---');
  stdout.writeln('Signing string:\n$signingRfc\n');
  stdout.writeln('Computed (lower): $hashRfc');
  stdout.writeln('Computed (upper): $hashRfcUpper\n');

  stdout.writeln('--- Form-encoding (spaces as +) ---');
  stdout.writeln('Signing string:\n$signingPlus\n');
  stdout.writeln('Computed (lower): $hashPlus');
  stdout.writeln('Computed (upper): $hashPlusUpper\n');

  stdout.writeln('--- RAW query parts (use as-is) ---');
  stdout.writeln('Signing string:\n$signingRaw\n');
  stdout.writeln('Computed (lower): $hashRaw');
  stdout.writeln('Computed (upper): $hashRawUpper\n');

  final allHashes = {
    hashRfc,
    hashPlus,
    hashRaw,
    hashRfcUpper,
    hashPlusUpper,
    hashRawUpper,
  };
  if (allHashes
      .map((s) => s.toLowerCase())
      .contains(providedHash.toLowerCase())) {
    stdout.writeln(
      'OK: one of the computed hashes matches provided vnp_SecureHash',
    );
    exit(0);
  } else {
    stdout.writeln('MISMATCH: none of the computed hashes match');
    exit(2);
  }
}
