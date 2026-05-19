import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are explicitly required, we allow (or default to RolesGuard).
    // Usually it's better to explicitly secure endpoints.
    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.id) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Fetch user profile permissions from DB (or we could store it in JWT to save DB trips, but this is safer for revocation)
    const dbUser = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      include: { perfil: true },
    });

    if (!dbUser || !dbUser.perfil || !dbUser.perfil.permissoes) {
      throw new ForbiddenException(
        'Acesso negado. Nenhuma permissão atribuída.',
      );
    }

    const userPermissions: string[] = Array.isArray(dbUser.perfil.permissoes)
      ? (dbUser.perfil.permissoes as string[])
      : [];

    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Você não tem as permissões necessárias para acessar este recurso',
      );
    }

    return true;
  }
}
