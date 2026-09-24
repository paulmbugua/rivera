import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
export type AuthUser = { id: string; email: string; roles: UserRole[]; status: string };
export type AuthRequest = Request & { user: AuthUser };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.cookies?.rivera_access;
    if (!token) throw new UnauthorizedException('Sign in to continue');
    let claims: jwt.JwtPayload;
    try { claims = jwt.verify(token, process.env.JWT_ACCESS_SECRET!, { algorithms: ['HS256'] }) as jwt.JwtPayload; }
    catch { throw new UnauthorizedException('Your session has expired'); }
    if (typeof claims.sub !== 'string' || typeof claims.sid !== 'string') throw new UnauthorizedException();
    const session = await this.prisma.refreshSession.findUnique({ where: { id: claims.sid } });
    if (!session || session.userId !== claims.sub || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException('Your session has ended');
    const user = await this.prisma.user.findUnique({ where: { id: claims.sub }, include: { roles: true } });
    if (!user || user.deletedAt || user.status !== 'ACTIVE') throw new ForbiddenException('Account unavailable');
    req.user = { id: user.id, email: user.email, roles: user.roles.map(r => r.role), status: user.status };
    const required = this.reflector.getAllAndOverride<UserRole[]>('roles', [context.getHandler(), context.getClass()]);
    if (required?.length && !required.some(role => req.user.roles.includes(role))) throw new ForbiddenException('You cannot access this area');
    return true;
  }
}
