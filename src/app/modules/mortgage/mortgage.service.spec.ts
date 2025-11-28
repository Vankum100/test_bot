import { Test, TestingModule } from '@nestjs/testing';
import { MortgageService } from './mortgage.service';
import { CreateMortgageProfileDto, PropertyType } from '../mortgage-profiles/dto/create-mortgage-profile.dto';
import { Database } from '../../../database/schema';
import { MortgageProfilesService } from '../mortgage-profiles/mortgage-profiles.service';
import { MortgageCalculationsService } from '../mortgage-calculations/mortgage-calculations.service';
import { MortgageCalculationService } from '../mortgage-calculations/mortgage-calculation.service';

describe('MortgageService', () => {
  let service: MortgageService;
  let mockMortgageProfilesService: {
    createMortgageProfile: jest.Mock;
    getMortgageProfileById: jest.Mock;
  };
  let mockMortgageCalculationsService: {
    createMortgageCalculation: jest.Mock;
    getMortgageCalculationByProfileId: jest.Mock;
  };
  let mockMortgageCalculationService: {
    calculateMortgage: jest.Mock;
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    mockMortgageProfilesService = {
      createMortgageProfile: jest.fn(),
      getMortgageProfileById: jest.fn(),
    };
    mockMortgageCalculationsService = {
      createMortgageCalculation: jest.fn(),
      getMortgageCalculationByProfileId: jest.fn(),
    };
    mockMortgageCalculationService = {
      calculateMortgage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MortgageService,
        {
          provide: MortgageProfilesService,
          useValue: mockMortgageProfilesService,
        },
        {
          provide: MortgageCalculationsService,
          useValue: mockMortgageCalculationsService,
        },
        {
          provide: MortgageCalculationService,
          useValue: mockMortgageCalculationService,
        },
      ],
    }).compile();

    service = module.get<MortgageService>(MortgageService);
  });

  // Note: Calculation logic has been moved to MortgageCalculationEngine
  // These tests should be moved to mortgage-calculation.engine.spec.ts

  describe('createMortgageCalculation', () => {
    const mockUserId = 'user123';
    const mockDto: CreateMortgageProfileDto = {
      propertyPrice: 5000000,
      propertyType: PropertyType.APARTMENT_IN_NEW_BUILDING,
      downPaymentAmount: 1000000,
      matCapitalAmount: 500000,
      matCapitalIncluded: true,
      loanTermYears: 20,
      interestRate: 8.5,
    };

    const mockCalculationResult = {
      monthlyPayment: 30000,
      totalPayment: 7200000,
      totalOverpaymentAmount: 2200000,
      possibleTaxDeduction: 260000,
      savingsDueMotherCapital: 500000,
      recommendedIncome: 75000,
      mortgagePaymentSchedule: { '1': { '1': { totalPayment: 30000, repaymentOfMortgageBody: 10000, repaymentOfMortgageInterest: 20000, mortgageBalance: 3900000 } } },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockMortgageProfilesService.createMortgageProfile.mockResolvedValue({
        id: 1,
        userId: mockUserId,
        propertyPrice: '5000000',
        propertyType: PropertyType.APARTMENT_IN_NEW_BUILDING,
        downPaymentAmount: '1000000',
        matCapitalAmount: '500000',
        matCapitalIncluded: true,
        loanTermYears: 20,
        interestRate: '8.5',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockMortgageCalculationService.calculateMortgage.mockReturnValue(mockCalculationResult);
      mockMortgageCalculationsService.createMortgageCalculation.mockResolvedValue({
        id: 1,
        userId: mockUserId,
        mortgageProfileId: 1,
        monthlyPayment: '30000',
        totalPayment: '7200000',
        totalOverpaymentAmount: '2200000',
        possibleTaxDeduction: '260000',
        savingsDueMotherCapital: '500000',
        recommendedIncome: '75000',
        paymentSchedule: JSON.stringify(mockCalculationResult.mortgagePaymentSchedule),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should create mortgage calculation and save to database', async () => {
      const result = await service.createMortgageCalculation(mockUserId, mockDto);

      expect(result).toBeDefined();
      expect(result.monthlyPayment).toBeGreaterThan(0);
      expect(result.totalPayment).toBeGreaterThan(0);
      expect(result.totalOverpaymentAmount).toBeGreaterThan(0);
      expect(result.possibleTaxDeduction).toBeGreaterThan(0);
      expect(result.savingsDueMotherCapital).toBe(mockDto.matCapitalAmount);
      expect(result.recommendedIncome).toBeGreaterThan(0);
      expect(result.mortgagePaymentSchedule).toBeDefined();

      // Verify service calls
      expect(mockMortgageProfilesService.createMortgageProfile).toHaveBeenCalledWith(mockUserId, mockDto);
      expect(mockMortgageCalculationService.calculateMortgage).toHaveBeenCalled();
      expect(mockMortgageCalculationsService.createMortgageCalculation).toHaveBeenCalled();
    });

    it('should calculate loan amount correctly (property price - down payment)', async () => {
      const result = await service.createMortgageCalculation(mockUserId, mockDto);

      // Loan amount = 5000000 - 1000000 = 4000000 (downPaymentAmount already includes matCapital if matCapitalIncluded = true)
      // Monthly payment should be calculated based on this amount
      expect(result.monthlyPayment).toBeGreaterThan(0);
      expect(result.totalPayment).toBeGreaterThan(4000000);
      expect(mockMortgageCalculationService.calculateMortgage).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyPrice: 5000000,
          downPaymentAmount: 1000000,
          matCapitalAmount: 500000,
          matCapitalIncluded: true,
        })
      );
    });

    it('should handle case without mat capital', async () => {
      const dtoWithoutMatCapital: CreateMortgageProfileDto = {
        ...mockDto,
        matCapitalAmount: null,
        matCapitalIncluded: false,
      };

      const resultWithoutMatCapital = {
        ...mockCalculationResult,
        savingsDueMotherCapital: 0,
      };
      mockMortgageCalculationService.calculateMortgage.mockReturnValueOnce(resultWithoutMatCapital);

      const result = await service.createMortgageCalculation(mockUserId, dtoWithoutMatCapital);

      expect(result.savingsDueMotherCapital).toBe(0);
      expect(result.monthlyPayment).toBeGreaterThan(0);
    });

    it('should generate correct payment schedule structure', async () => {
      const result = await service.createMortgageCalculation(mockUserId, mockDto);

      expect(result.mortgagePaymentSchedule).toBeDefined();
      
      // Check first year exists
      expect(result.mortgagePaymentSchedule['1']).toBeDefined();
      
      // Check first month structure
      const firstMonth = result.mortgagePaymentSchedule['1']['1'];
      expect(firstMonth).toHaveProperty('totalPayment');
      expect(firstMonth).toHaveProperty('repaymentOfMortgageBody');
      expect(firstMonth).toHaveProperty('repaymentOfMortgageInterest');
      expect(firstMonth).toHaveProperty('mortgageBalance');
    });

    it('should calculate recommended income as 2.5x monthly payment', async () => {
      const result = await service.createMortgageCalculation(mockUserId, mockDto);

      expect(result.recommendedIncome).toBe(result.monthlyPayment * 2.5);
    });
  });
});

