import { Test, TestingModule } from '@nestjs/testing';
import { MortgageService } from './mortgage.service';
import { CreateMortgageProfileDto, PropertyType } from './dto/create-mortgage-profile.dto';
import { Database } from '../../../database/schema';

describe('MortgageService', () => {
  let service: MortgageService;
  let mockDb: jest.Mocked<Database>;

  const mockInsert = jest.fn();
  const mockSelect = jest.fn();
  const mockFrom = jest.fn();
  const mockWhere = jest.fn();
  const mockOrderBy = jest.fn();
  const mockLimit = jest.fn();
  const mockValues = jest.fn();

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup chain mocks
    mockValues.mockReturnThis();
    mockInsert.mockReturnValue({
      values: mockValues,
    } as any);
    
    mockLimit.mockReturnValue([{ id: 1 }]);
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
    } as any);
    mockWhere.mockReturnValue({
      orderBy: mockOrderBy,
    } as any);
    mockFrom.mockReturnValue({
      where: mockWhere,
      select: jest.fn().mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
      }),
    } as any);

    mockDb = {
      insert: mockInsert,
      select: mockSelect,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MortgageService,
        {
          provide: 'DATABASE',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<MortgageService>(MortgageService);
  });

  describe('calculateMonthlyPayment', () => {
    it('should calculate monthly payment correctly', () => {
      const loanAmount = 1000000; // 1 million
      const monthlyInterestRate = 0.01; // 1% per month
      const totalMonths = 120; // 10 years

      const monthlyPayment = (service as any).calculateMonthlyPayment(
        loanAmount,
        monthlyInterestRate,
        totalMonths
      );

      expect(monthlyPayment).toBeGreaterThan(0);
      expect(monthlyPayment).toBeLessThan(loanAmount);
      // Monthly payment should be around 14,347 for these parameters
      expect(monthlyPayment).toBeCloseTo(14347, 0);
    });

    it('should handle zero interest rate', () => {
      const loanAmount = 1000000;
      const monthlyInterestRate = 0;
      const totalMonths = 120;

      const monthlyPayment = (service as any).calculateMonthlyPayment(
        loanAmount,
        monthlyInterestRate,
        totalMonths
      );

      expect(monthlyPayment).toBe(loanAmount / totalMonths);
    });
  });

  describe('calculateTaxDeduction', () => {
    it('should calculate tax deduction for property purchase correctly', () => {
      const propertyPrice = 1500000; // 1.5 million
      const totalOverpaymentAmount = 500000;

      const taxDeduction = (service as any).calculateTaxDeduction(
        propertyPrice,
        totalOverpaymentAmount
      );

      // Purchase deduction: min(1500000, 2000000) * 0.13 = 195000
      // Interest deduction: min(500000, 3000000) * 0.13 = 65000
      // Total: 260000
      expect(taxDeduction).toBe(195000 + 65000);
    });

    it('should cap purchase deduction at 260000', () => {
      const propertyPrice = 5000000; // 5 million
      const totalOverpaymentAmount = 1000000;

      const taxDeduction = (service as any).calculateTaxDeduction(
        propertyPrice,
        totalOverpaymentAmount
      );

      // Purchase deduction: min(5000000, 2000000) * 0.13 = 260000 (capped)
      // Interest deduction: min(1000000, 3000000) * 0.13 = 130000
      // Total: 390000
      expect(taxDeduction).toBe(260000 + 130000);
    });

    it('should cap interest deduction at 390000', () => {
      const propertyPrice = 1000000;
      const totalOverpaymentAmount = 5000000; // 5 million overpayment

      const taxDeduction = (service as any).calculateTaxDeduction(
        propertyPrice,
        totalOverpaymentAmount
      );

      // Purchase deduction: min(1000000, 2000000) * 0.13 = 130000
      // Interest deduction: min(5000000, 3000000) * 0.13 = 390000 (capped)
      // Total: 520000
      expect(taxDeduction).toBe(130000 + 390000);
    });
  });

  describe('calculatePaymentSchedule', () => {
    it('should generate payment schedule for 12 months', () => {
      const loanAmount = 120000; // 120k
      const monthlyInterestRate = 0.01; // 1% per month
      const totalMonths = 12;
      // Calculate correct monthly payment for full repayment
      const monthlyPayment = (service as any).calculateMonthlyPayment(
        loanAmount,
        monthlyInterestRate,
        totalMonths
      );

      const schedule = (service as any).calculatePaymentSchedule(
        loanAmount,
        monthlyPayment,
        monthlyInterestRate,
        totalMonths
      );

      expect(schedule).toBeDefined();
      expect(schedule['1']).toBeDefined();
      expect(Object.keys(schedule['1']).length).toBe(12);

      // First month
      const firstMonth = schedule['1']['1'];
      expect(firstMonth.totalPayment).toBeCloseTo(monthlyPayment, 2);
      expect(firstMonth.repaymentOfMortgageInterest).toBeCloseTo(loanAmount * monthlyInterestRate, 2);
      expect(firstMonth.repaymentOfMortgageBody).toBeCloseTo(
        monthlyPayment - firstMonth.repaymentOfMortgageInterest,
        2
      );
      expect(firstMonth.mortgageBalance).toBeGreaterThanOrEqual(0);

      // Last month should have balance close to 0 (within 1% of loan amount)
      const lastMonth = schedule['1']['12'];
      expect(lastMonth.mortgageBalance).toBeLessThan(loanAmount * 0.01);
    });

    it('should generate payment schedule for multiple years', () => {
      const loanAmount = 240000; // 240k
      const monthlyPayment = 10000;
      const monthlyInterestRate = 0.01;
      const totalMonths = 24; // 2 years

      const schedule = (service as any).calculatePaymentSchedule(
        loanAmount,
        monthlyPayment,
        monthlyInterestRate,
        totalMonths
      );

      expect(schedule['1']).toBeDefined();
      expect(schedule['2']).toBeDefined();
      expect(Object.keys(schedule['1']).length).toBe(12);
      expect(Object.keys(schedule['2']).length).toBe(12);
    });
  });

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

    it('should create mortgage calculation and save to database', async () => {
      // Mock database insert and select
      mockInsert.mockReturnValue({
        values: jest.fn().mockReturnValue(Promise.resolve()),
      } as any);

      mockSelect.mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await service.createMortgageCalculation(mockUserId, mockDto);

      expect(result).toBeDefined();
      expect(result.monthlyPayment).toBeGreaterThan(0);
      expect(result.totalPayment).toBeGreaterThan(0);
      expect(result.totalOverpaymentAmount).toBeGreaterThan(0);
      expect(result.possibleTaxDeduction).toBeGreaterThan(0);
      expect(result.savingsDueMotherCapital).toBe(mockDto.matCapitalAmount);
      expect(result.recommendedIncome).toBeGreaterThan(0);
      expect(result.mortgagePaymentSchedule).toBeDefined();

      // Verify database calls
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should calculate loan amount correctly (property price - down payment - mat capital)', async () => {
      mockInsert.mockReturnValue({
        values: jest.fn().mockReturnValue(Promise.resolve()),
      } as any);

      mockSelect.mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await service.createMortgageCalculation(mockUserId, mockDto);

      // Loan amount = 5000000 - 1000000 - 500000 = 3500000
      // Monthly payment should be calculated based on this amount
      expect(result.monthlyPayment).toBeGreaterThan(0);
      expect(result.totalPayment).toBeGreaterThan(3500000);
    });

    it('should handle case without mat capital', async () => {
      const dtoWithoutMatCapital: CreateMortgageProfileDto = {
        ...mockDto,
        matCapitalAmount: null,
        matCapitalIncluded: false,
      };

      mockInsert.mockReturnValue({
        values: jest.fn().mockReturnValue(Promise.resolve()),
      } as any);

      mockSelect.mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await service.createMortgageCalculation(mockUserId, dtoWithoutMatCapital);

      expect(result.savingsDueMotherCapital).toBe(0);
      // Loan amount = 5000000 - 1000000 - 0 = 4000000
      expect(result.monthlyPayment).toBeGreaterThan(0);
    });

    it('should generate correct payment schedule structure', async () => {
      mockInsert.mockReturnValue({
        values: jest.fn().mockReturnValue(Promise.resolve()),
      } as any);

      mockSelect.mockReturnValue({
        from: mockFrom,
      } as any);

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
      
      // Check that all months in first year exist
      for (let month = 1; month <= 12; month++) {
        expect(result.mortgagePaymentSchedule['1'][month.toString()]).toBeDefined();
      }
    });

    it('should calculate recommended income as 2.5x monthly payment', async () => {
      mockInsert.mockReturnValue({
        values: jest.fn().mockReturnValue(Promise.resolve()),
      } as any);

      mockSelect.mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await service.createMortgageCalculation(mockUserId, mockDto);

      expect(result.recommendedIncome).toBe(result.monthlyPayment * 2.5);
    });
  });
});

