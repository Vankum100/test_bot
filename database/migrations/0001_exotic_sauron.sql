CREATE TABLE `MortgageProfile` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(255) NOT NULL,
	`propertyPrice` decimal(15,2) NOT NULL,
	`propertyType` varchar(255) NOT NULL,
	`downPaymentAmount` decimal(15,2) NOT NULL,
	`matCapitalAmount` decimal(15,2),
	`matCapitalIncluded` boolean NOT NULL,
	`loanTermYears` int NOT NULL,
	`interestRate` decimal(5,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `MortgageProfile_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `MortgageCalculation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(255) NOT NULL,
	`mortgageProfileId` int NOT NULL,
	`monthlyPayment` decimal(15,2) NOT NULL,
	`totalPayment` decimal(15,2) NOT NULL,
	`totalOverpaymentAmount` decimal(15,2) NOT NULL,
	`possibleTaxDeduction` decimal(15,2) NOT NULL,
	`savingsDueMotherCapital` decimal(15,2) NOT NULL,
	`recommendedIncome` decimal(15,2) NOT NULL,
	`paymentSchedule` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `MortgageCalculation_id` PRIMARY KEY(`id`)
);
