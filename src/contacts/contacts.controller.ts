import { Body, Controller, Get, Post, Req, Param, Put, Delete, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/auth/roles.decorator';
import { CreateContactDTO, UpdateContactDTO, ContactFilterDto } from './dto/contacts.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async getAllContacts(@Query() filters: ContactFilterDto) {
    return this.contactsService.getAllContacts(filters);
  }

  @Post('create')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async create(@Body() data: CreateContactDTO, @Req() req) {
    try {
      // For testing, use a default user ID
      const userId = req.id || 'cmfs5sdfu0000ox9ezz6cjemu';
      console.log('Controller received contact data:', data);
      console.log('Using user ID:', userId);
      
      const result = await this.contactsService.createContact(data, userId);
      console.log('Service returned:', result);
      
      return result;
    } catch (error) {
      console.error('Controller error:', error);
      throw error;
    }
  }

  @Get('dropdown')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async dropdown() {
    return this.contactsService.getContactsDropdown();
  }

  @Get(':id')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async findContactById(@Param('id') id: string) {
    return this.contactsService.findContactById(id);
  }

  @Put(':id')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async updateContact(@Param('id') id: string, @Body() data: UpdateContactDTO) {
    return this.contactsService.updateContact(id, data);
  }

  @Delete(':id')
  // @Roles(UserRole.ADMIN, UserRole.INVOICING_USER)
  async deleteContact(@Param('id') id: string) {
    return this.contactsService.removeContact(id);
  }
}
