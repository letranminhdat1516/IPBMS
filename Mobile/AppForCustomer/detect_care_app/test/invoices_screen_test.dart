import 'dart:convert';

import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/subscription/models/invoice.dart';
import 'package:detect_care_app/features/subscription/screens/invoices_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

class _FakeResponse extends http.Response {
  _FakeResponse(super.body, super.statusCode);
}

class _MockApiClient implements ApiProvider {
  final List<dynamic> pages;
  int calls = 0;

  _MockApiClient({required this.pages});

  @override
  Future<http.Response> get(
    String path, {
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    final page = (query?['page'] is int)
        ? query!['page'] as int
        : int.tryParse(query?['page']?.toString() ?? '1') ?? 1;
    final idx = (page - 1).clamp(0, pages.length - 1);
    calls += 1;
    final body = json.encode(pages[idx]);
    return _FakeResponse(body, 200);
  }

  @override
  Future<http.Response> post(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    // For invoices tests the code uses GET; implement POST to satisfy ApiProvider
    // Return the same payload as a GET for the requested page (or first page).
    final page = (query?['page'] is int)
        ? query!['page'] as int
        : int.tryParse(query?['page']?.toString() ?? '1') ?? 1;
    final idx = (page - 1).clamp(0, pages.length - 1);
    final bodyStr = json.encode(pages[idx]);
    return _FakeResponse(bodyStr, 200);
  }

  @override
  Future<http.Response> put(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    // Not used in tests; return a generic success
    return _FakeResponse('{}', 200);
  }

  @override
  Future<http.Response> patch(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    return _FakeResponse('{}', 200);
  }

  @override
  Future<http.Response> delete(
    String path, {
    Map<String, dynamic>? query,
    Object? body,
    Map<String, String>? extraHeaders,
  }) async {
    return _FakeResponse('{}', 200);
  }

  @override
  dynamic extractDataFromResponse(http.Response res) {
    return json.decode(res.body);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() {
    // Initialize dotenv with a minimal value so AppConfig.apiBaseUrl can be read.
    dotenv.testLoad(fileInput: 'API_BASE_URL=http://localhost');
  });
  group('InvoicesScreen', () {
    testWidgets('loads invoices and shows list', (tester) async {
      final invoice1 = Invoice(
        id: 'inv_1',
        userId: 'u1',
        subscriptionId: 's1',
        totalAmount: 100000,
        currency: 'VND',
        lineItems: [],
        issuedAt: DateTime.parse('2024-01-01T00:00:00Z'),
        paidAt: DateTime.parse('2024-01-02T00:00:00Z'),
        status: 'paid',
      );

      final mock = _MockApiClient(
        pages: [
          [invoice1.toJson()],
        ],
      );

      await tester.pumpWidget(
        MaterialApp(home: InvoicesScreen(apiProvider: mock)),
      );

      // initial frame
      await tester.pump();

      // loading indicator removed after first frame (async fetch)
      await tester.pumpAndSettle();

      // Should show at least one invoice without ID in the title
      expect(find.text('Hóa đơn'), findsWidgets);
      expect(find.text('Ngày tạo: 01/01/2024'), findsOneWidget);
      // Should NOT show invoice ID in the UI
      expect(find.textContaining('#'), findsNothing);
    });

    testWidgets('pagination loads more when scrolling', (tester) async {
      // create two pages: first page contains many invoices so the ListView is
      // scrollable and can trigger the load-more logic. Second page has one
      // invoice (id 'b') which should be appended after scrolling.
      final firstPage = List.generate(30, (i) {
        final inv = Invoice(
          id: 'a$i',
          userId: 'u',
          subscriptionId: 's',
          totalAmount: i,
          currency: 'VND',
          lineItems: [],
          issuedAt: DateTime.now(),
          paidAt: null,
          status: 'issued',
        );
        return inv.toJson();
      });

      final b = Invoice(
        id: 'b',
        userId: 'u',
        subscriptionId: 's',
        totalAmount: 2,
        currency: 'VND',
        lineItems: [],
        issuedAt: DateTime.now(),
        paidAt: null,
        status: 'issued',
      );

      final mock = _MockApiClient(
        pages: [
          firstPage,
          [b.toJson()],
        ],
      );

      await tester.pumpWidget(
        MaterialApp(home: InvoicesScreen(apiProvider: mock)),
      );
      await tester.pumpAndSettle();

      // Should have multiple invoices visible (the exact number depends on screen size)
      expect(find.text('Hóa đơn'), findsWidgets);

      // Scroll down to trigger load more
      final listView = find.byType(ListView);
      await tester.drag(listView, const Offset(0, -5000));
      await tester.pumpAndSettle();

      // Wait for potential load more
      await tester.pumpAndSettle(const Duration(seconds: 1));

      // Should have made at least 2 API calls (initial load + load more)
      expect(mock.calls, greaterThanOrEqualTo(2));
    });

    testWidgets('no overflow on narrow screens', (tester) async {
      // simulate a narrow mobile device
      tester.binding.window.physicalSizeTestValue = const Size(320, 640);
      tester.binding.window.devicePixelRatioTestValue = 1.0;

      final invoice = Invoice(
        id: 'inv_small',
        userId: 'u1',
        subscriptionId: 's1',
        totalAmount: 100000,
        currency: 'VND',
        lineItems: [],
        issuedAt: DateTime.parse('2024-01-01T00:00:00Z'),
        paidAt: DateTime.parse('2024-01-02T00:00:00Z'),
        status: 'paid',
      );

      final mock = _MockApiClient(
        pages: [
          [invoice.toJson()],
        ],
      );

      await tester.pumpWidget(
        MaterialApp(home: InvoicesScreen(apiProvider: mock)),
      );
      await tester.pumpAndSettle();

      // If there were layout overflow exceptions they'd surface during pumpAndSettle.
      expect(find.text('Hóa đơn'), findsWidgets);

      // cleanup
      tester.binding.window.clearPhysicalSizeTestValue();
      tester.binding.window.clearDevicePixelRatioTestValue();
    });
  });
}
