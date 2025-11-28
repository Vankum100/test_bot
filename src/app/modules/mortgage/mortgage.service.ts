import { Injectable, Inject } from '@nestjs/common';
import { MortgageProfilesService } from '../mortgage-profiles/mortgage-profiles.service';
import { MortgageCalculationsService } from '../mortgage-calculations/mortgage-calculations.service';
import { MortgageCalculationService } from '../mortgage-calculations/mortgage-calculation.service';
import { CreateMortgageProfileDto } from '../mortgage-profiles/dto/create-mortgage-profile.dto';
import { MortgageCalculationResponseDto } from '../mortgage-calculations/dto/mortgage-calculation-response.dto';

@Injectable()
export class MortgageService {
  constructor(
    private readonly mortgageProfilesService: MortgageProfilesService,
    private readonly mortgageCalculationsService: MortgageCalculationsService,
    private readonly mortgageCalculationService: MortgageCalculationService
  ) {}

  async createMortgageCalculation(
    userId: string,
    dto: CreateMortgageProfileDto
  ): Promise<MortgageCalculationResponseDto> {
    // Создаем профиль
    const profile = await this.mortgageProfilesService.createMortgageProfile(userId, dto);

    // Выполняем расчет
    const calculationResult = this.mortgageCalculationService.calculateMortgage({
      propertyPrice: dto.propertyPrice,
      downPaymentAmount: dto.downPaymentAmount,
      matCapitalAmount: dto.matCapitalAmount,
      matCapitalIncluded: dto.matCapitalIncluded,
      loanTermYears: dto.loanTermYears,
      interestRate: dto.interestRate,
    });

    // Сохраняем расчет
    await this.mortgageCalculationsService.createMortgageCalculation(
      userId,
      profile.id,
      calculationResult
    );

    return calculationResult;
  }

  async getMortgageProfileById(id: number, userId: string) {
    return this.mortgageProfilesService.getMortgageProfileById(id, userId);
  }

  async getMortgageCalculationByProfileId(mortgageProfileId: number, userId: string) {
    return this.mortgageCalculationsService.getMortgageCalculationByProfileId(mortgageProfileId, userId);
  }
}
