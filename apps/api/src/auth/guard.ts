import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AuthErrors } from '../common/api-error';
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
export type AuthUser = { id: string; email: string; roles: UserRole[]; status: string };
export type AuthRequest = Request & { user: AuthUser };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.cookies?.rivera_access;
    if (!token) throw AuthErrors.unauthenticated();
    let claims: jwt.JwtPayload;
    try { claims = jwt.verify(token, process.env.JWT_ACCESS_SECRET!, { algorithms: ['HS256'] }) as jwt.JwtPayload; }
    catch { throw AuthErrors.unauthenticated('Your session has expired.'); }
    if (typeof claims.sub !== 'string' || typeof claims.sid !== 'string') throw AuthErrors.unauthenticated();
    const session = await this.prisma.refreshSession.findUnique({ where: { id: claims.sid } });
    if (!session || session.userId !== claims.sub || session.revokedAt || session.expiresAt <= new Date()) throw AuthErrors.unauthenticated('Your session has ended.');
    const user = await this.prisma.user.findUnique({ where: { id: claims.sub }, include: { roles: true } });
    if (!user || user.deletedAt || user.status === 'DEACTIVATED') throw AuthErrors.deactivated();
    if (user.status === 'SUSPENDED') throw AuthErrors.suspended();
    req.user = { id: user.id, email: user.email, roles: user.roles.map(r => r.role), status: user.status };
    const required = this.reflector.getAllAndOverride<UserRole[]>('roles', [context.getHandler(), context.getClass()]);
    if (required?.length && !required.some(role => req.user.roles.includes(role))) throw AuthErrors.forbiddenRole();
    return true;
  }
}
