import { PersonService } from './person.service.js';
import { CreatePersonDto } from './dto/create-person.dto.js';
import { UpdatePersonDto } from './dto/update-person.dto.js';
import { Person } from './domain/person.js';
import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';

@Controller('persons')
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Post()
  async create(@Body() dto: CreatePersonDto): Promise<Person> {
    return this.personService.create(dto);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Person> {
    return this.personService.findById(id);
  }

  @Get()
  async findAll(): Promise<Person[]> {
    return this.personService.findAll();
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
  ): Promise<Person> {
    return this.personService.update(id, dto);
  }
}
