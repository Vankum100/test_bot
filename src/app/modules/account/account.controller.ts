import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AdminJwtAuth } from '../../decorators/admin-jwt-auth.decorator';
import { type Account } from './schemas/accounts';

@Controller('accounts')
@AdminJwtAuth()
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string
  ): Promise<{ accounts: Account[], total: number }> {
    const accounts = await this.accountService.findAllPaginated(
      Number(page),
      Number(limit),
      search
    );
    return accounts;
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Account> {
    const account = await this.accountService.findById(id);
    if (!account) {
      throw new Error('Аккаунт не найден');
    }
    return account;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAccountDto: CreateAccountDto): Promise<Account> {
    return this.accountService.create(createAccountDto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto
  ): Promise<Account> {
    await this.accountService.update(id, updateAccountDto);
    const updatedAccount = await this.accountService.findById(id);
    if (!updatedAccount) {
      throw new Error('Аккаунт не найден после обновления');
    }
    return updatedAccount;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.accountService.remove(id);
  }

  @Post('check-login')
  @HttpCode(HttpStatus.OK)
  async checkLogin(@Body() body: { login: string }): Promise<{ exists: boolean }> {
    const account = await this.accountService.findByLogin(body.login);
    return { exists: !!account };
  }
} 