import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/api_client.dart';
import '../core/theme.dart';
import '../widgets/common.dart';

enum AuthMode { login, register, forgot, verify, reset }

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.controller,
    this.initialMode = AuthMode.login,
  });
  final AppController controller;
  final AuthMode initialMode;
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final formKey = GlobalKey<FormState>();
  final first = TextEditingController(),
      last = TextEditingController(),
      email = TextEditingController(),
      password = TextEditingController(),
      confirm = TextEditingController(),
      token = TextEditingController();
  late AuthMode mode = widget.initialMode;
  String role = 'CREATOR';
  bool terms = false, hidePassword = true, hideConfirmation = true;

  @override
  void dispose() {
    for (final c in [first, last, email, password, confirm, token]) {
      c.dispose();
    }
    super.dispose();
  }

  String get title => switch (mode) {
        AuthMode.login => 'Welcome back',
        AuthMode.register => 'Create your account',
        AuthMode.forgot => 'Reset your password',
        AuthMode.verify => 'Verify your email',
        AuthMode.reset => 'Choose a new password',
      };

  Future<void> submit() async {
    if (!formKey.currentState!.validate()) return;
    if (mode == AuthMode.register && !terms) {
      showRiveraMessage(
        context,
        'Please accept the Terms and Privacy Policy.',
        error: true,
      );
      return;
    }
    try {
      switch (mode) {
        case AuthMode.login:
          await widget.controller.login(email.text, password.text);
          if (mounted) Navigator.pop(context);
          break;
        case AuthMode.register:
          await widget.controller.register(
            firstName: first.text,
            lastName: last.text,
            email: email.text,
            password: password.text,
            accountType: role,
          );
          if (mounted) setState(() => mode = AuthMode.verify);
          if (mounted) {
            showRiveraMessage(
              context,
              'Account created. Check your email for the verification token.',
            );
          }
          break;
        case AuthMode.forgot:
          await widget.controller.forgotPassword(email.text);
          if (mounted) setState(() => mode = AuthMode.reset);
          if (mounted) {
            showRiveraMessage(context, 'Check your email for a reset token.');
          }
          break;
        case AuthMode.verify:
          await widget.controller.verifyEmail(token.text);
          if (mounted) setState(() => mode = AuthMode.login);
          if (mounted) {
            showRiveraMessage(context, 'Email verified. You can now sign in.');
          }
          break;
        case AuthMode.reset:
          await widget.controller.resetPassword(token.text, password.text);
          if (mounted) setState(() => mode = AuthMode.login);
          if (mounted) {
            showRiveraMessage(context, 'Password updated. Welcome back.');
          }
          break;
      }
    } on ApiException catch (e) {
      if (mounted) showRiveraMessage(context, e.message, error: true);
    }
  }

  String? passwordError(String? value) {
    if (value == null || value.length < 8) return 'Use at least 8 characters';
    if (!RegExp('[a-z]').hasMatch(value)) return 'Add a lowercase letter';
    if (!RegExp('[A-Z]').hasMatch(value)) return 'Add an uppercase letter';
    if (!RegExp(r'\d').hasMatch(value)) return 'Add a number';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final needsPassword = [
      AuthMode.login,
      AuthMode.register,
      AuthMode.reset,
    ].contains(mode);
    return Scaffold(
      appBar: AppBar(
        backgroundColor: riveraCream,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(22, 8, 22, 32),
          children: [
            const RiveraLogo(),
            const SizedBox(height: 34),
            Eyebrow(
              mode == AuthMode.login
                  ? 'Rivera account'
                  : 'A good place to begin',
            ),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.displaySmall),
            const SizedBox(height: 8),
            Text(
              mode == AuthMode.login
                  ? 'Pick up where you left off.'
                  : 'We’ll keep this thoughtful, clear and secure.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 28),
            Form(
              key: formKey,
              child: Column(
                children: [
                  if (mode == AuthMode.register) ...[
                    Row(
                      children: [
                        Expanded(child: _field(first, 'First name')),
                        const SizedBox(width: 12),
                        Expanded(child: _field(last, 'Last name')),
                      ],
                    ),
                    const SizedBox(height: 14),
                  ],
                  if ([
                    AuthMode.login,
                    AuthMode.register,
                    AuthMode.forgot,
                  ].contains(mode))
                    _field(
                      email,
                      'Email address',
                      keyboard: TextInputType.emailAddress,
                      validator: (v) => v != null && v.contains('@')
                          ? null
                          : 'Enter a valid email',
                    ),
                  if ([AuthMode.verify, AuthMode.reset].contains(mode))
                    _field(
                      token,
                      mode == AuthMode.verify
                          ? 'Verification token'
                          : 'Reset token',
                    ),
                  if (needsPassword) ...[
                    const SizedBox(height: 14),
                    _field(
                      password,
                      'Password',
                      obscure: hidePassword,
                      validator: mode == AuthMode.login ? null : passwordError,
                      suffix: IconButton(
                        icon: Icon(
                          hidePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                        onPressed: () =>
                            setState(() => hidePassword = !hidePassword),
                      ),
                    ),
                  ],
                  if ([AuthMode.register, AuthMode.reset].contains(mode)) ...[
                    const SizedBox(height: 14),
                    _field(
                      confirm,
                      'Confirm password',
                      obscure: hideConfirmation,
                      validator: (v) =>
                          v == password.text ? null : 'Passwords do not match',
                      suffix: IconButton(
                        tooltip: hideConfirmation
                            ? 'Show password confirmation'
                            : 'Hide password confirmation',
                        icon: Icon(
                          hideConfirmation
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                        onPressed: () => setState(
                          () => hideConfirmation = !hideConfirmation,
                        ),
                      ),
                    ),
                  ],
                  if (mode == AuthMode.register) ...[
                    const SizedBox(height: 18),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'CREATOR',
                          label: Text('Creator'),
                          icon: Icon(Icons.auto_awesome_outlined),
                        ),
                        ButtonSegment(
                          value: 'BUSINESS',
                          label: Text('Business'),
                          icon: Icon(Icons.storefront_outlined),
                        ),
                      ],
                      selected: {role},
                      onSelectionChanged: (value) =>
                          setState(() => role = value.first),
                    ),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: terms,
                      controlAffinity: ListTileControlAffinity.leading,
                      title: const Text(
                        'I agree to Rivera’s Terms of Service and Privacy Policy.',
                        style: TextStyle(fontFamily: 'Arial', fontSize: 13),
                      ),
                      onChanged: (v) => setState(() => terms = v ?? false),
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: widget.controller.busy ? null : submit,
                    child: widget.controller.busy
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(switch (mode) {
                            AuthMode.login => 'Log in',
                            AuthMode.register => 'Create account',
                            AuthMode.forgot => 'Send reset link',
                            AuthMode.verify => 'Verify email',
                            AuthMode.reset => 'Reset password',
                          }),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              children: [
                if (mode != AuthMode.login)
                  TextButton(
                    onPressed: () => setState(() => mode = AuthMode.login),
                    child: const Text('Log in'),
                  ),
                if (mode != AuthMode.register)
                  TextButton(
                    onPressed: () => setState(() => mode = AuthMode.register),
                    child: const Text('Create account'),
                  ),
                if (mode == AuthMode.login)
                  TextButton(
                    onPressed: () => setState(() => mode = AuthMode.forgot),
                    child: const Text('Forgot password?'),
                  ),
                if (mode == AuthMode.login)
                  TextButton(
                    onPressed: () => setState(() => mode = AuthMode.verify),
                    child: const Text('Verify email'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    bool obscure = false,
    TextInputType? keyboard,
    String? Function(String?)? validator,
    Widget? suffix,
  }) =>
      TextFormField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboard,
        validator: validator ??
            (v) => v == null || v.trim().isEmpty ? '$label is required' : null,
        decoration: InputDecoration(labelText: label, suffixIcon: suffix),
      );
}
