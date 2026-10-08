import { PersonService } from './person.service.js';
import { CreatePersonDto } from './dto/create-person.dto.js';
import { Person } from './domain/person.js';
import { Body, Controller, Get,  Param, Post } from '@nestjs/common';

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
}