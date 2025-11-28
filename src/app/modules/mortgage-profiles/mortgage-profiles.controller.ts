import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { MortgageProfilesService } from './mortgage-profiles.service';
import { CreateMortgageProfileDto } from './dto/create-mortgage-profile.dto';
import { JwtAuth } from '../../decorators/jwt-auth.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('mortgage-profiles')
export class MortgageProfilesController {
  constructor(private readonly mortgageProfilesService: MortgageProfilesService) {}

  @Post()
  @JwtAuth()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createMortgageProfileDto: CreateMortgageProfileDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.tgId;
    return this.mortgageProfilesService.createMortgageProfile(userId, createMortgageProfileDto);
  }
}

