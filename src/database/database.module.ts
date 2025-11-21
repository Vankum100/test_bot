import { Global, Module } from '@nestjs/common';
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
        const connection = mysql.createPool({
          host: configService.get('HOST'),
          port: parseInt(configService.get('PORT') || '3306'),
          user: configService.get('USERNAME'),
          password: configService.get('PASSWORD') || undefined,
          database: configService.get('DATABASE'),
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
