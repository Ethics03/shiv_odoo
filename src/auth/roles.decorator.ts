import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Or with enum (recommended)
export enum UserRole {
  ADMIN = 'ADMIN',
  INVOICING_USER = 'INVOICING_USER',
  CONTACT_USER = 'CONTACT_USER',
}

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
