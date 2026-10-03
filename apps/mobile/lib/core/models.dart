class RiveraUser {
  RiveraUser.fromJson(Map<String, dynamic> json)
      : id = json['id']?.toString() ?? '',
        email = json['email']?.toString() ?? '',
        firstName = json['firstName']?.toString() ?? '',
        lastName = json['lastName']?.toString() ?? '',
        phone = json['phone']?.toString(),
        countryCode = json['countryCode']?.toString(),
        city = json['city']?.toString(),
        profileImageUrl = json['profileImageUrl']?.toString(),
        status = json['status']?.toString() ?? 'ACTIVE',
        emailVerified = json['emailVerified'] == true,
        onboardingCompleted = json['onboardingCompleted'] == true,
        roles = (json['roles'] as List? ?? const [])
            .map((e) => e.toString())
            .toList();

  final String id, email, firstName, lastName, status;
  final String? phone, countryCode, city, profileImageUrl;
  final bool emailVerified, onboardingCompleted;
  final List<String> roles;
  String get name => '$firstName $lastName'.trim();
  bool get isAdmin => roles.contains('ADMIN');
  bool get isBusiness => roles.contains('BUSINESS');
  bool get isCreator => roles.contains('CREATOR');
}

Map<String, dynamic> mapOf(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

List<Map<String, dynamic>> itemsOf(dynamic value) {
  final source = value is List ? value : (value is Map ? value['items'] : null);
  return (source as List? ?? const [])
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}

String textOf(
  Map<String, dynamic> item,
  List<String> keys, [
  String fallback = 'Untitled',
]) {
  for (final key in keys) {
    final value = item[key];
    if (value != null && value.toString().trim().isNotEmpty) {
      return value.toString();
    }
  }
  return fallback;
}
