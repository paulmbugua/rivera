import { redirect } from 'next/navigation';

export function GET() {
  const api = process.env.GOOGLE_AUTH_API_URL ?? process.env.API_PUBLIC_URL ?? 'http://localhost:4000/api/v1';
  redirect(`${api.replace(/\/$/, '')}/auth/google/start`);
}
