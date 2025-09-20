import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateContactDTO, UpdateContactDTO, ContactFilterDto } from './dto/contacts.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private prisma: PrismaService) {}

  async createContact(payload: CreateContactDTO, createdById: string) {
    try {
      this.logger.log(`Creating contact: ${payload.name} by user ${createdById}`);
      
      if (payload.email) {
        const existingContact = await this.prisma.contact.findUnique({
          where: { email: payload.email },
        });

        if (existingContact) {
          this.logger.warn(`Contact already exists with email: ${payload.email}`);
          throw new BadRequestException('Contact with this email already exists.');
        }
      }

      this.logger.log('Creating contact in database...');
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

      this.logger.log(
        `Contact created successfully: ${contact.name} with ID ${contact.id}`,
      );

      return {
        success: true,
        data: contact,
        message: 'Contact created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating contact:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create contact: ' + error.message);
    }
  }

  async getAllContacts(filters?: ContactFilterDto) {
    try {
      const where: any = {};

      // Simple filters
      if (filters?.type) where.type = filters.type;
      if (filters?.city) where.city = { contains: filters.city, mode: 'insensitive' };
      if (filters?.state) where.state = { contains: filters.state, mode: 'insensitive' };
      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { mobile: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const contacts = await this.prisma.contact.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          createdBy: {
            select: { name: true, email: true, role: true },
          },
        },
      });

      return {
        success: true,
        data: contacts,
        count: contacts.length,
      };
    } catch (error) {
      this.logger.error('Error getting contacts:', error);
      throw new BadRequestException('Failed to get contacts: ' + error.message);
    }
  }

  async findContactById(id: string) {
    try {
      const contact = await this.prisma.contact.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: { name: true, email: true, role: true },
          },
        },
      });

      if (!contact) {
        throw new NotFoundException('Contact not found');
      }

      return {
        success: true,
        data: contact,
      };
    } catch (error) {
      this.logger.error(`Error finding contact ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to find contact: ' + error.message);
    }
  }

  async updateContact(id: string, payload: UpdateContactDTO) {
    try {
      this.logger.log(`Updating contact: ${id}`);

      // Check if contact exists
      const existingContact = await this.prisma.contact.findUnique({
        where: { id },
      });

      if (!existingContact) {
        throw new NotFoundException('Contact not found');
      }

      // Check email uniqueness if email is being updated
      if (payload.email && payload.email !== existingContact.email) {
        const emailExists = await this.prisma.contact.findUnique({
          where: { email: payload.email },
        });

        if (emailExists) {
          throw new BadRequestException('Contact with this email already exists');
        }
      }

      const updatedContact = await this.prisma.contact.update({
        where: { id },
        data: payload,
        include: {
          createdBy: {
            select: { name: true, email: true, role: true },
          },
        },
      });

      this.logger.log(`Contact updated successfully: ${updatedContact.name}`);

      return {
        success: true,
        data: updatedContact,
        message: 'Contact updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error updating contact ${id}:`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update contact: ' + error.message);
    }
  }

  async removeContact(id: string) {
    try {
      this.logger.log(`Attempting to delete contact with ID: ${id}`);
      
      // First check if the contact exists
      const existingContact = await this.prisma.contact.findUnique({
        where: { id },
      });

      if (!existingContact) {
        this.logger.warn(`Contact not found for deletion: ${id}`);
        throw new NotFoundException('Contact not found');
      }

      this.logger.log(`Contact found, proceeding with deletion: ${existingContact.name}`);
      
      const result = await this.prisma.contact.delete({
        where: { id },
      });
      
      this.logger.log(`Contact deleted successfully: ${result.name}`);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting contact ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Handle foreign key constraint errors
      if (error.code === 'P2003') {
        throw new BadRequestException('Cannot delete contact: it is referenced by other records');
      }
      throw new BadRequestException('Failed to delete contact: ' + error.message);
    }
  }

  async getContactsDropdown() {
    return this.prisma.contact.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        email: true,
        mobile: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
