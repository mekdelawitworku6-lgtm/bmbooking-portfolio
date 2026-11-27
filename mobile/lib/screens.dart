import 'package:flutter/material.dart';
import 'api.dart';
import 'theme.dart';

class ErrorBanner extends StatelessWidget {
  final String? message;
  const ErrorBanner({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    if (message == null || message!.isEmpty) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFFFECEC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFCDCD)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFD32F2F), size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(message!, style: const TextStyle(color: Color(0xFFB3261E), fontSize: 13))),
        ],
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  final VoidCallback onSuccess;
  const LoginScreen({super.key, required this.onSuccess});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _api = ApiClient();
  final _phone = TextEditingController();
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();

  int _role = 0; // 0 patient, 1 doctor, 2 hospital, 3 admin
  bool _otpStep = false;
  bool _loading = false;
  String? _error;

  static const _roles = ['Patient', 'Doctor', 'Hospital', 'Admin'];

  @override
  void dispose() {
    _phone.dispose();
    _identifier.dispose();
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _finish(dynamic response) async {
    final token = ApiClient.tokenFromLogin(response);
    final user = ApiClient.userFromLogin(response);
    if (token == null || user == null) {
      throw ApiException('Unexpected sign-in response from the server.');
    }
    await Session.save(token, user);
    if (mounted) widget.onSuccess();
  }

  Future<void> _requestOtp() async {
    final phone = _phone.text.trim().replaceAll(RegExp(r'\D'), '');
    if (phone.length != 9 || !RegExp(r'^[79]').hasMatch(phone)) {
      setState(() => _error = 'Enter a valid 9-digit Ethiopian phone number.');
      return;
    }
    setState(() => _loading = true);
    _error = null;
    try {
      await _api.post('/auth/request-otp', {
        'phone': '+251$phone',
        'isRegistration': false,
      });
      setState(() => _otpStep = true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_code.text.trim().length != 6) {
      setState(() => _error = 'Enter the 6-digit code we sent you.');
      return;
    }
    setState(() => _loading = true);
    _error = null;
    try {
      final res = await _api.post('/auth/verify-otp', {
        'phone': '+251${_phone.text.trim().replaceAll(RegExp(r'\D'), '')}',
        'code': _code.text.trim(),
        'isRegistration': false,
      });
      await _finish(res);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _passwordLogin() async {
    if (_identifier.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Enter your details and password.');
      return;
    }
    setState(() => _loading = true);
    _error = null;
    try {
      final res = _role == 3
          ? await _api.post('/admin/login', {
              'email': _identifier.text.trim(),
              'password': _password.text,
            })
          : await _api.post('/auth/hospital-portal-login', {
              'identifier': _identifier.text.trim(),
              'password': _password.text,
            });
      await _finish(res);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              Center(
                child: Container(
                  width: 76,
                  height: 76,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(color: AppColors.primary.withValues(alpha: .14), blurRadius: 24, offset: const Offset(0, 10)),
                    ],
                  ),
                  child: Image.asset('assets/bm-booking-logo.png', fit: BoxFit.contain),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Welcome to BM Booking',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.ink),
              ),
              const SizedBox(height: 6),
              const Text(
                'Your health, one tap away.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: AppColors.muted),
              ),
              const SizedBox(height: 30),
              if (!_otpStep) ...[
                SizedBox(
                  height: 46,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _roles.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, i) => ChoiceChip(
                      label: Text(_roles[i]),
                      selected: _role == i,
                      onSelected: (_) => setState(() {
                        _role = i;
                        _error = null;
                      }),
                      selectedColor: AppColors.primary,
                      backgroundColor: Colors.white,
                      side: BorderSide(color: _role == i ? AppColors.primary : AppColors.line),
                      labelStyle: TextStyle(
                        color: _role == i ? Colors.white : AppColors.muted,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
              ErrorBanner(message: _error),
              if (_otpStep)
                _otpForm()
              else if (_role < 2)
                _phoneForm()
              else
                _passwordForm(),
              const SizedBox(height: 22),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.lock_outline, size: 14, color: AppColors.muted),
                  const SizedBox(width: 6),
                  Text(
                    'Secured by BM Booking',
                    style: TextStyle(fontSize: 12, color: AppColors.muted.withValues(alpha: .8)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _phoneForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Phone number', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        const SizedBox(height: 8),
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          maxLength: 9,
          decoration: const InputDecoration(
            hintText: '911234567',
            prefixIcon: Padding(
              padding: EdgeInsets.only(left: 14, right: 6),
              child: Center(widthFactor: 1, child: Text('+251', style: TextStyle(fontWeight: FontWeight.w700))),
            ),
            counterText: '',
          ),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _loading ? null : _requestOtp,
          child: _loading
              ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Send verification code'),
        ),
        const SizedBox(height: 14),
        Text(
          'We will send a one-time code by SMS. Signing in as ${_roles[_role].toLowerCase()}.',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 12, color: AppColors.muted),
        ),
      ],
    );
  }

  Widget _otpForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Code sent to +251${_phone.text}',
          style: const TextStyle(fontSize: 14, color: AppColors.muted),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _code,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: 10),
          decoration: const InputDecoration(hintText: '••••••', counterText: ''),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _loading ? null : _verifyOtp,
          child: _loading
              ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Verify and continue'),
        ),
        TextButton(
          onPressed: () => setState(() {
            _otpStep = false;
            _code.clear();
            _error = null;
          }),
          child: const Text('Change number'),
        ),
      ],
    );
  }

  Widget _passwordForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          _role == 3 ? 'Admin email' : 'Phone or username',
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _identifier,
          keyboardType: _role == 3 ? TextInputType.emailAddress : TextInputType.text,
          decoration: InputDecoration(hintText: _role == 3 ? 'admin@example.com' : '911234567 or username'),
        ),
        const SizedBox(height: 16),
        const Text('Password', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        const SizedBox(height: 8),
        TextField(
          controller: _password,
          obscureText: true,
          decoration: const InputDecoration(hintText: 'Your password'),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _loading ? null : _passwordLogin,
          child: _loading
              ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Sign in'),
        ),
      ],
    );
  }
}

class HomeScreen extends StatefulWidget {
  final ValueChanged<int> onTab;
  const HomeScreen({super.key, required this.onTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiClient();
  final _search = TextEditingController();
  List<Map<String, dynamic>> _doctors = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    _error = null;
    try {
      final res = await _api.get('/doctors/all?t=${DateTime.now().millisecondsSinceEpoch}', auth: false);
      setState(() => _doctors = asMapList(ApiClient.payload(res)));
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _filtered {
    final q = _search.text.trim().toLowerCase();
    if (q.isEmpty) return _doctors;
    return _doctors.where((d) {
      final name = (d['fullName'] ?? d['name'] ?? '').toString().toLowerCase();
      final spec = (d['specialization'] ?? '').toString().toLowerCase();
      final specs = (d['specializations'] is List ? (d['specializations'] as List).join(' ') : '').toLowerCase();
      return name.contains(q) || spec.contains(q) || specs.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final list = _filtered;
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: AppColors.primarySoft,
                  child: Text(
                    Session.displayName.substring(0, 1).toUpperCase(),
                    style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w800),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hello, ${Session.displayName.split(' ').first}',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                      const Text('How can we help today?', style: TextStyle(fontSize: 13, color: AppColors.muted)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _hero(),
            const SizedBox(height: 22),
            _quickActions(),
            const SizedBox(height: 28),
            const Text('Find a doctor', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            TextField(
              controller: _search,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: 'Search by name or specialty',
                prefixIcon: Icon(Icons.search, color: AppColors.muted),
              ),
            ),
            const SizedBox(height: 14),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 50),
                child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
              )
            else if (_error != null)
              ErrorBanner(message: _error)
            else if (list.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: Text('No doctors found', style: TextStyle(color: AppColors.muted))),
              )
            else
              ...list.map((d) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _doctorCard(d),
                  )),
          ],
        ),
      ),
    );
  }

  Widget _hero() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          colors: [Color(0xFF0E9F6E), Color(0xFF087A55)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -10,
            bottom: -24,
            child: Icon(Icons.favorite, size: 128, color: Colors.white.withValues(alpha: .08)),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: .18), borderRadius: BorderRadius.circular(20)),
                child: const Text('CARE, SIMPLIFIED', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
              ),
              const SizedBox(height: 14),
              const Text('Book care in minutes',
                  style: TextStyle(color: Colors.white, fontSize: 23, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              const Text('Doctors, equipment and appointments — all in one place.',
                  style: TextStyle(color: Colors.white70, fontSize: 13)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _quickActions() {
    const actions = [
      (Icons.medical_services_outlined, 'Doctors', 0),
      (Icons.calendar_month_outlined, 'Appointments', 1),
      (Icons.monitor_heart_outlined, 'Equipment', 2),
      (Icons.local_hospital_outlined, 'Hospitals', 3),
    ];
    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      children: actions.map((a) {
        final icon = a.$1;
        final label = a.$2;
        final target = a.$3;
        return InkWell(
          onTap: () {
            if (target == 3) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Hospital directory coming soon')),
              );
            } else {
              widget.onTab(target);
            }
          },
          borderRadius: BorderRadius.circular(16),
          child: Column(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(color: AppColors.primarySoft, borderRadius: BorderRadius.circular(16)),
                child: Icon(icon, color: AppColors.primaryDark, size: 24),
              ),
              const SizedBox(height: 7),
              Text(label,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                  textAlign: TextAlign.center),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _doctorCard(Map<String, dynamic> d) {
    final picture = d['profilePicture']?.toString();
    final rating = d['rating']?.toString() ?? '0.0';
    final reviews = d['totalReviews']?.toString() ?? '0';
    final specs = d['specializations'] is List
        ? (d['specializations'] as List).join(', ')
        : (d['specialization'] ?? 'General practice').toString();
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => _doctorDetails(d, specs, rating, reviews),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 56,
                  height: 56,
                  child: picture != null && picture.startsWith('http')
                      ? Image.network(picture, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _avatarPlaceholder())
                      : _avatarPlaceholder(),
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text((d['fullName'] ?? d['name'] ?? 'Doctor').toString(),
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 3),
                    Text(specs, style: const TextStyle(fontSize: 12, color: AppColors.muted), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 7),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, size: 15, color: AppColors.amber),
                        const SizedBox(width: 4),
                        Text('$rating ($reviews reviews)', style: const TextStyle(fontSize: 11, color: AppColors.muted)),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.muted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _avatarPlaceholder() => Container(
        color: AppColors.primarySoft,
        child: const Icon(Icons.person_outline, color: AppColors.primary, size: 26),
      );

  void _doctorDetails(Map<String, dynamic> d, String specs, String rating, String reviews) {
    final clinic = d['clinicName']?.toString();
    final address = d['clinicAddress']?.toString();
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text((d['fullName'] ?? 'Doctor').toString(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 5),
            Text(specs, style: const TextStyle(color: AppColors.muted)),
            const SizedBox(height: 16),
            if (clinic != null) _detailRow(Icons.local_hospital_outlined, clinic),
            if (address != null) _detailRow(Icons.place_outlined, address),
            _detailRow(Icons.star_outline, '$rating from $reviews reviews'),
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Doctor profile and booking flow coming soon')),
                  );
                },
                child: const Text('View profile & book'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String text) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppColors.primary),
            const SizedBox(width: 10),
            Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
          ],
        ),
      );
}

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  final _api = ApiClient();
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get('/appointments/my');
      setState(() => _items = asMapList(ApiClient.payload(res)));
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My appointments')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
          children: [
            if (_loading)
              const Padding(padding: EdgeInsets.symmetric(vertical: 80), child: Center(child: CircularProgressIndicator(color: AppColors.primary)))
            else if (_error != null)
              ErrorBanner(message: _error)
            else if (_items.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 60),
                child: Column(
                  children: [
                    Icon(Icons.event_available_outlined, size: 64, color: AppColors.primary.withValues(alpha: .35)),
                    const SizedBox(height: 16),
                    const Text('No appointments yet', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    const Text('Find a doctor from the home tab to book your first visit.',
                        textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: AppColors.muted)),
                  ],
                ),
              )
            else
              ..._items.map((a) => _appointmentCard(a)),
          ],
        ),
      ),
    );
  }

  Widget _appointmentCard(Map<String, dynamic> a) {
    final doctor = a['doctor'] is Map ? Map<String, dynamic>.from(a['doctor'] as Map) : <String, dynamic>{};
    final name = (doctor['fullName'] ?? a['doctorName'] ?? 'Doctor').toString();
    final status = (a['status'] ?? 'scheduled').toString();
    final date = (a['appointmentDate'] ?? a['date'] ?? a['scheduledAt'] ?? '').toString();
    final time = (a['appointmentTime'] ?? a['time'] ?? '').toString();
    final color = status.toLowerCase().contains('cancel') ? Colors.grey : AppColors.primary;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(color: AppColors.primarySoft, borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.calendar_today_outlined, color: AppColors.primaryDark),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text('$date $time'.trim(), style: const TextStyle(fontSize: 12, color: AppColors.muted)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(color: color.withValues(alpha: .12), borderRadius: BorderRadius.circular(20)),
                    child: Text(status.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: color)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ProfileScreen extends StatelessWidget {
  final VoidCallback onLogout;
  const ProfileScreen({super.key, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    final user = Session.user ?? {};
    final name = Session.displayName;
    final role = Session.role;
    final phone = (user['phone'] ?? user['phoneNumber'] ?? '').toString();
    final email = (user['email'] ?? '').toString();

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 38,
                    backgroundColor: AppColors.primarySoft,
                    child: Text(name.substring(0, 1).toUpperCase(),
                        style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: AppColors.primaryDark)),
                  ),
                  const SizedBox(height: 12),
                  Text(name, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(role.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary, letterSpacing: 1)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Card(
            child: Column(
              children: [
                if (phone.isNotEmpty) _row(Icons.phone_outlined, 'Phone', phone),
                if (email.isNotEmpty) _row(Icons.mail_outlined, 'Email', email),
                _row(Icons.shield_outlined, 'Account', role),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                await Session.clear();
                onLogout();
              },
              icon: const Icon(Icons.logout, color: Color(0xFFD32F2F)),
              label: const Text('Sign out', style: TextStyle(color: Color(0xFFD32F2F), fontWeight: FontWeight.w700)),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 54),
                side: const BorderSide(color: Color(0xFFFFCDCD)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(IconData icon, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: AppColors.primary),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontSize: 11, color: AppColors.muted)),
                  const SizedBox(height: 2),
                  Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
      );
}
