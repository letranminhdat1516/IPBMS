import 'dart:convert';
import 'package:http/http.dart' as http;

void main() async {
  final url =
      'https://recommend-ease-shopzilla-improved.trycloudflare.com/api/transactions/billing/history?status=paid&page=1&limit=20';

  try {
    final response = await http.get(
      Uri.parse(url),
      headers: {
        'Authorization':
            'Bearer test_token', // Replace with actual token if needed
      },
    );

    print('Status Code: ${response.statusCode}');
    print('Response Body:');
    print(response.body);

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      print('\nParsed Response:');
      print(data);
    }
  } catch (e) {
    print('Error: $e');
  }
}
