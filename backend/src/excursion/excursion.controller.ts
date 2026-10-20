import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ExcursionService } from './excursion.service.js';
import { CreateExcursionDto } from './dto/create-excursion.dto.js';
import { UpdateExcursionDto } from './dto/update-excursion.dto.js';
import { Excursion } from './domain/excursion.js';

@Controller('excursions')
export class ExcursionController {
  constructor(private readonly excursionService: ExcursionService) {}

  @Post()
  async create(@Body() dto: CreateExcursionDto): Promise<Excursion> {
    return this.excursionService.create(dto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Excursion> {
    return this.excursionService.findById(id);
  }

  @Get()
  async findAll(): Promise<Excursion[]> {
    return this.excursionService.findAll();
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExcursionDto,
  ): Promise<Excursion> {
    return this.excursionService.update(id, dto);
  }
}
