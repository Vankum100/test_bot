import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { MortgageService } from './mortgage.service';
import { CreateMortgageProfileDto } from '../mortgage-profiles/dto/create-mortgage-profile.dto';
import { MortgageCalculationResponseDto } from '../mortgage-calculations/dto/mortgage-calculation-response.dto';
import { JwtAuth } from '../../decorators/jwt-auth.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('mortgage-profiles')
export class MortgageController {
  constructor(private readonly mortgageService: MortgageService) {}

  @Post()
  @JwtAuth()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createMortgageProfileDto: CreateMortgageProfileDto,
    @Req() req: RequestWithUser,
  ): Promise<MortgageCalculationResponseDto> {
    const userId = req.user.tgId;
    return this.mortgageService.createMortgageCalculation(userId, createMortgageProfileDto);
  }
}

