import { Global, Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { Database } from './schema';
import { DATABASE_CONSTANTS } from './constants';
import { databaseSchema } from './schema';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DATABASE',
      useFactory: async (configService: ConfigService): Promise<Database> => {
        const logger = new Logger('DatabaseModule');
        
        const host = configService.get('DB_HOST') || configService.get('HOST');
        const port = parseInt(configService.get('DB_PORT') || configService.get('PORT') || '3306');
        const user = configService.get('DB_USERNAME') || configService.get('DB_USER') || configService.get('USERNAME');
        const password = configService.get('DB_PASSWORD') || configService.get('PASSWORD') || undefined;
        const database = configService.get('DB_NAME') || configService.get('DATABASE');

        if (!host || !user || !database) {
          logger.error('Database configuration is missing required values:');
          logger.error(`  HOST: ${host || 'MISSING'}`);
          logger.error(`  USER: ${user || 'MISSING'}`);
          logger.error(`  DATABASE: ${database || 'MISSING'}`);
          logger.error('Please set DB_HOST, DB_USERNAME (or DB_USER), and DB_NAME (or DATABASE) in your .env file');
          throw new Error('Database configuration is incomplete');
        }

        logger.log(`Connecting to database: ${user}@${host}:${port}/${database}`);

        const connection = mysql.createPool({
          host,
          port,
          user,
          password,
          database,
          timezone: DATABASE_CONSTANTS.DEFAULT_TIMEZONE,
          dateStrings: true
        });

        return drizzle(connection, {
          schema: databaseSchema,
          mode: 'default'
        }) as Database;
      },
      inject: [ConfigService]
    }
  ],
  exports: ['DATABASE']
})
export class DatabaseModule {}
