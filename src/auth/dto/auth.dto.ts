import { UserRole } from 'generated/prisma';

export class CreateUserDto {
  email: string;
  name: string;
  role?: UserRole;
  loginid: string;
}
