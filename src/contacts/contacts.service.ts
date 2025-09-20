import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateContactDTO } from './dto/contacts.dto';
import { IsEmail } from '@nestjs/class-validator';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async createContact(payload: CreateContactDTO, createdById: string) {
    try {
      if (payload.email) {
        const existingContact = await this.prisma.contact.findUnique({
          where: { email: payload.email },
        });

        if (existingContact) {
          throw new BadRequestException(
            'Contact with this email already exists.',
          );
        }
      }

      const contact = await this.prisma.contact.create({
        data: {
          ...payload,
          createdById,
        },
        include: {
          createdBy: {
            select: { name: true, email: true, role: true },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Unable to create Contact');
    }
  }
}
