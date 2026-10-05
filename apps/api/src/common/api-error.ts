import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(statusCode: HttpStatus, code: string, message: string) {
    super({ statusCode, code, message }, statusCode);
  }
}

export const AuthErrors = {
  invalidCredentials: () => new ApiException(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Invalid email or password.'),
  unauthenticated: (message = 'Sign in to continue.') => new ApiException(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', message),
  emailExists: () => new ApiException(HttpStatus.CONFLICT, 'EMAIL_ALREADY_REGISTERED', 'An account already exists with this email address.'),
  emailNotVerified: () => new ApiException(HttpStatus.FORBIDDEN, 'EMAIL_NOT_VERIFIED', 'Please verify your email before continuing.'),
  suspended: () => new ApiException(HttpStatus.FORBIDDEN, 'ACCOUNT_SUSPENDED', 'This account is suspended.'),
  deactivated: () => new ApiException(HttpStatus.FORBIDDEN, 'ACCOUNT_DEACTIVATED', 'This account is deactivated.'),
  forbiddenRole: () => new ApiException(HttpStatus.FORBIDDEN, 'FORBIDDEN_ROLE', 'You cannot access this area.'),
  invalidVerification: () => new ApiException(HttpStatus.BAD_REQUEST, 'INVALID_VERIFICATION_TOKEN', 'This verification link is invalid or has already been used.'),
  expiredVerification: () => new ApiException(HttpStatus.BAD_REQUEST, 'VERIFICATION_TOKEN_EXPIRED', 'This verification link has expired.'),
  invalidReset: () => new ApiException(HttpStatus.BAD_REQUEST, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or has already been used.'),
  expiredReset: () => new ApiException(HttpStatus.BAD_REQUEST, 'RESET_TOKEN_EXPIRED', 'This password reset link has expired.'),
  currentPassword: () => new ApiException(HttpStatus.UNAUTHORIZED, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.'),
  passwordConfirmation: () => new ApiException(HttpStatus.BAD_REQUEST, 'PASSWORD_CONFIRMATION_MISMATCH', 'New password confirmation does not match.'),
  accountNotVerifiable: () => new ApiException(HttpStatus.BAD_REQUEST, 'ACCOUNT_NOT_VERIFIABLE', 'This account cannot be verified.'),
  googleUnavailable: () => new ApiException(HttpStatus.SERVICE_UNAVAILABLE, 'GOOGLE_AUTH_UNAVAILABLE', 'Google sign-in is not configured yet.'),
  googleFailed: () => new ApiException(HttpStatus.UNAUTHORIZED, 'GOOGLE_AUTH_FAILED', 'Google could not verify this sign-in. Please try again.'),
  googleState: () => new ApiException(HttpStatus.BAD_REQUEST, 'GOOGLE_OAUTH_STATE_INVALID', 'This Google sign-in request expired or is invalid. Please start again.'),
  oauthRegistration: () => new ApiException(HttpStatus.BAD_REQUEST, 'OAUTH_REGISTRATION_INVALID', 'This social registration has expired or was already used. Please start again.'),
};
