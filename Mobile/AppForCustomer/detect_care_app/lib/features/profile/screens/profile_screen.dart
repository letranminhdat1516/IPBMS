// import 'package:detect_care_app/core/theme/app_theme.dart';
// import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
// // subscription UI moved to Settings screen
// import 'package:flutter/material.dart';
// import 'package:provider/provider.dart';

// class ProfileScreen extends StatefulWidget {
//   const ProfileScreen({super.key, this.embedInParent = false});

//   /// When true the widget will not render its own `Scaffold`/`AppBar` so it
//   /// can be embedded inside a parent that provides those (for example
//   /// `HomeScreen`).
//   final bool embedInParent;

//   @override
//   State<ProfileScreen> createState() => _ProfileScreenState();
// }

// class _ProfileScreenState extends State<ProfileScreen>
//     with TickerProviderStateMixin {
//   late final AnimationController _fadeController;
//   late final AnimationController _scaleController;
//   late final Animation<double> _fadeAnimation;
//   late final Animation<double> _scaleAnimation;
//   late final Animation<Offset> _slideAnimation;

//   bool _isEditing = false;

//   static const _defaultAvatarUrl =
//       'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face';

//   @override
//   void initState() {
//     super.initState();
//     _fadeController = AnimationController(
//       duration: const Duration(milliseconds: 800),
//       vsync: this,
//     )..forward();
//     _scaleController = AnimationController(
//       duration: const Duration(milliseconds: 600),
//       vsync: this,
//     );
//     Future.delayed(const Duration(milliseconds: 200), () {
//       _scaleController.forward();
//     });
//     _fadeAnimation = Tween<double>(
//       begin: 0,
//       end: 1,
//     ).animate(CurvedAnimation(parent: _fadeController, curve: Curves.easeOut));
//     _scaleAnimation = Tween<double>(begin: 0.8, end: 1).animate(
//       CurvedAnimation(parent: _scaleController, curve: Curves.elasticOut),
//     );
//     _slideAnimation = Tween<Offset>(
//       begin: const Offset(0, 0.3),
//       end: Offset.zero,
//     ).animate(CurvedAnimation(parent: _fadeController, curve: Curves.easeOut));

//     WidgetsBinding.instance.addPostFrameCallback((_) => {});
//   }

//   @override
//   void dispose() {
//     _fadeController.dispose();
//     _scaleController.dispose();
//     super.dispose();
//   }

//   @override
//   Widget build(BuildContext context) {
//     final user = context.watch<AuthProvider>().user;
//     if (user == null) {
//       final loader = const Center(child: CircularProgressIndicator());
//       if (widget.embedInParent) return SafeArea(child: loader);
//       return Scaffold(body: loader);
//     }

//     final Widget content = FadeTransition(
//       opacity: _fadeAnimation,
//       child: SlideTransition(
//         position: _slideAnimation,
//         child: ScaleTransition(
//           scale: _scaleAnimation,
//           child: SingleChildScrollView(
//             padding: const EdgeInsets.all(20),
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.center,
//               children: [
//                 _buildAvatar(user.avatarUrl ?? ''),
//                 const SizedBox(height: 16),
//                 Text(
//                   user.fullName.isNotEmpty ? user.fullName : 'Chưa có tên',
//                   style: const TextStyle(
//                     fontSize: 24,
//                     fontWeight: FontWeight.w700,
//                     color: Color(0xFF1E293B),
//                   ),
//                 ),
//                 const SizedBox(height: 32),
//                 _buildInfoRow(Icons.person_outline, 'Họ và tên', user.fullName),
//                 const SizedBox(height: 12),
//                 _buildInfoRow(Icons.phone_outlined, 'Điện thoại', user.phone),
//                 const SizedBox(height: 12),
//                 _buildInfoRow(Icons.email_outlined, 'Email', user.email),
//                 const SizedBox(height: 12),
//                 const SizedBox(height: 32),
//                 // Subscription management moved to Settings -> 'Gói dịch vụ'
//                 const SizedBox.shrink(),
//                 const SizedBox(height: 16),
//                 _buildEditButton(),
//                 const SizedBox(height: 24),

//                 _buildLogoutButton(context),
//               ],
//             ),
//           ),
//         ),
//       ),
//     );

//     if (widget.embedInParent) {
//       // Determine status bar and actual app bar height (allow AppBarTheme override)
//       final statusBarHeight = MediaQuery.of(context).padding.top;
//       final appBarHeight =
//           AppBarTheme.of(context).toolbarHeight ?? kToolbarHeight;

//       // Add a small extra margin to ensure the avatar doesn't touch the app bar
//       final topOffset = statusBarHeight + appBarHeight + 12.0;

//       // Use SafeArea(top: false) so we don't double-pad the status bar, then
//       // apply a top padding that matches the parent's AppBar height.
//       return SafeArea(
//         top: false,
//         child: Padding(
//           padding: EdgeInsets.only(top: topOffset),
//           child: content,
//         ),
//       );
//     }

//     return Scaffold(
//       backgroundColor: const Color(0xFFF8FAFC),
//       appBar: _buildAppBar(context),
//       body: content,
//     );
//   }

//   PreferredSizeWidget _buildAppBar(BuildContext context) {
//     // Kiểm tra xem có thể pop được không (tức là có route stack)
//     final canPop = Navigator.canPop(context);

//     return AppBar(
//       backgroundColor: Colors.white,
//       centerTitle: true,
//       elevation: 0,
//       shadowColor: Colors.black.withValues(alpha: 0.1),
//       leading: Container(
//         margin: const EdgeInsets.all(8),
//         decoration: BoxDecoration(
//           color: const Color(0xFFF8FAFC),
//           borderRadius: BorderRadius.circular(12),
//           border: Border.all(color: const Color(0xFFE2E8F0)),
//         ),
//         child: IconButton(
//           onPressed: () => Navigator.pop(context),
//           icon: const Icon(
//             Icons.arrow_back_ios_new,
//             color: Color(0xFF374151),
//             size: 18,
//           ),
//         ),
//       ),
//       title: const Text(
//         'Hồ sơ cá nhân',
//         style: TextStyle(
//           color: Color(0xFF1E293B),
//           fontSize: 20,
//           fontWeight: FontWeight.w700,
//           letterSpacing: -0.5,
//         ),
//       ),
//       actions: [
//         IconButton(
//           icon: Icon(
//             _isEditing ? Icons.check : Icons.edit,
//             color: _isEditing ? Colors.green : Colors.grey,
//           ),
//           onPressed: () => setState(() => _isEditing = !_isEditing),
//         ),
//       ],
//     );
//   }

//   Widget _buildAvatar(String url) {
//     // Kiểm tra URL hợp lệ
//     final isValidUrl =
//         url.isNotEmpty &&
//         (url.startsWith('http://') || url.startsWith('https://'));

//     final avatarUrl = isValidUrl ? url : _defaultAvatarUrl;

//     return Container(
//       decoration: BoxDecoration(
//         shape: BoxShape.circle,
//         border: Border.all(
//           color: AppTheme.primaryBlue.withValues(alpha: 0.2),
//           width: 4,
//         ),
//       ),
//       child: CircleAvatar(
//         radius: 56,
//         backgroundImage: NetworkImage(avatarUrl),
//         backgroundColor: const Color(0xFF2E7BF0).withValues(alpha: 0.1),
//         onBackgroundImageError: (exception, stackTrace) {
//           // Xử lý lỗi load image
//           debugPrint('❌ Error loading avatar image: $exception');
//         },
//         child: isValidUrl
//             ? null
//             : Icon(
//                 Icons.person,
//                 size: 60,
//                 color: AppTheme.primaryBlue.withValues(alpha: 0.5),
//               ),
//       ),
//     );
//   }

//   Widget _buildInfoRow(IconData icon, String label, String value) {
//     return Row(
//       children: [
//         Icon(icon, color: AppTheme.primaryBlue),
//         const SizedBox(width: 12),
//         Text(
//           '$label:',
//           style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
//         ),
//         const SizedBox(width: 8),
//         Expanded(child: Text(value, style: const TextStyle(fontSize: 16))),
//       ],
//     );
//   }

//   Widget _buildEditButton() {
//     if (!_isEditing) return const SizedBox.shrink();
//     return ElevatedButton.icon(
//       icon: const Icon(Icons.save),
//       label: const Text('Lưu'),
//       style: ElevatedButton.styleFrom(
//         backgroundColor: AppTheme.primaryBlue,
//         padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
//       ),
//       onPressed: () {
//         // TODO: Call API update
//         setState(() => _isEditing = false);
//       },
//     );
//   }

//   // ====== CARD GỬI FCM ======
//   Widget _buildLogoutButton(BuildContext context) {
//     return Container(
//       width: double.infinity,
//       height: 56,
//       decoration: BoxDecoration(
//         gradient: const LinearGradient(
//           colors: [AppTheme.dangerColor, AppTheme.dangerColorDark],
//           begin: Alignment.topLeft,
//           end: Alignment.bottomRight,
//         ),
//         borderRadius: BorderRadius.circular(16),
//         boxShadow: [
//           BoxShadow(
//             color: AppTheme.dangerColor.withValues(alpha: 0.3),
//             blurRadius: 8,
//             offset: const Offset(0, 4),
//           ),
//         ],
//       ),
//       child: ElevatedButton.icon(
//         icon: const Icon(Icons.logout_rounded, color: Colors.white, size: 20),
//         label: const Text(
//           'Đăng xuất',
//           style: TextStyle(
//             color: Colors.white,
//             fontSize: 16,
//             fontWeight: FontWeight.w600,
//             letterSpacing: 0.5,
//           ),
//         ),
//         onPressed: () {
//           showDialog(
//             context: context,
//             builder: (_) => AlertDialog(
//               backgroundColor: Colors.white,
//               shape: RoundedRectangleBorder(
//                 borderRadius: BorderRadius.circular(16),
//               ),
//               title: const Text(
//                 'Xác nhận',
//                 style: TextStyle(
//                   fontWeight: FontWeight.w600,
//                   color: AppTheme.primaryBlue,
//                 ),
//               ),
//               content: const Text(
//                 'Bạn có chắc muốn đăng xuất?',
//                 style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
//               ),
//               actions: [
//                 TextButton(
//                   onPressed: () => Navigator.pop(context),
//                   child: const Text('Hủy'),
//                 ),
//                 ElevatedButton(
//                   onPressed: () {
//                     Navigator.pop(context);
//                     context.read<AuthProvider>().logout();
//                   },
//                   style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
//                   child: const Text('Đăng xuất'),
//                 ),
//               ],
//             ),
//           );
//         },
//         style: ElevatedButton.styleFrom(
//           backgroundColor: Colors.transparent,
//           shadowColor: Colors.transparent,
//           shape: RoundedRectangleBorder(
//             borderRadius: BorderRadius.circular(16),
//           ),
//           padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
//         ),
//       ),
//     );
//   }
// }
