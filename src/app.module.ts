import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { SupabaseStorageModule } from './modules/supabase-storage/supabase-storage.module';
import { MailerModule } from './modules/mailer/mailer.module';
import getDatabaseConfig from './configs/database.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { ResidentsModule } from './modules/residents/residents.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { ApartmentsModule } from './modules/apartments/apartments.module';
import { AssetTypesModule } from './modules/asset-types/asset-types.module';
import { AssetsModule } from './modules/assets/assets.module';
import { IssuesModule } from './modules/issues/issues.module';
import { ServicesModule } from './modules/services/services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { TechniciansModule } from './modules/technicians/technicians.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FeesModule } from './modules/fees/fees.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { MaintenanceTicketsModule } from './modules/maintenance-tickets/maintenance-tickets.module';
import { VotingsModule } from './modules/votings/votings.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AiModule } from './modules/ai/ai.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StartTimingMiddleware } from './middlewares/start-timing.middleware';
import { ScheduleModule } from '@nestjs/schedule';
import { SocketsModule } from './modules/sockets/sockets.module';
import { SystemNotificationsModule } from './modules/system-notifications/system-notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { BackupModule } from './modules/backup/backup.module';
import { SharedModule } from './modules/shared/shared.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SharedModule,
    CloudinaryModule,
    SupabaseStorageModule,
    MailerModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    ScheduleModule.forRoot(),
    AccountsModule,
    AuthModule,
    ResidentsModule,
    BlocksModule,
    ApartmentsModule,
    AssetTypesModule,
    AssetsModule,
    IssuesModule,
    ServicesModule,
    BookingsModule,
    TechniciansModule,
    NotificationsModule,
    FeesModule,
    InvoicesModule,
    VotingsModule,
    ReportsModule,
    MaintenanceTicketsModule,
    AiModule,
    PaymentsModule,
    SocketsModule,
    SystemNotificationsModule,
    AuditModule,
    BackupModule,
    HealthModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(StartTimingMiddleware).forRoutes('*');
  }
}
