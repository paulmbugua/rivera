export type UserRole = 'BUSINESS' | 'CREATOR' | 'ADMIN';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type AccountType = Exclude<UserRole, 'ADMIN'>;
export interface ApiErrorBody { statusCode: number; code: string; message: string | string[] }
export interface CountryOption { code: string; name: string }
export interface HealthResponse { status: 'ok'; service: 'rivera-api' }
