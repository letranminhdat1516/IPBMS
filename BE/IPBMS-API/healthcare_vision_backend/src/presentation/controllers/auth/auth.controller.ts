import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import {
  AdminLoginDto,
  CaregiverLoginDto,
  CaregiverRegisterDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginOtpDto,
  RequestOtpDto,
  ResetPasswordDto,
} from '../../../application/dto/auth/auth.dto';
import { AuthService, SessionService } from '../../../application/services/auth';
import { FcmService } from '../../../application/services/fcm.service';
import { SharedPermissionsService } from '../../../application/services/shared-permissions.service';
import { UsersService } from '../../../application/services/users';
import { ActivityAction, ActivitySeverity } from '../../../core/entities/activity_logs.entity';
import { LogActivity } from '../../../shared/decorators/log-activity.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ModerateRateLimit, StrictRateLimit } from '../../../shared/guards/rate-limit.guard';
import { FirebaseAdminService } from '../../../shared/providers/firebase.provider';
import { AuthenticatedRequest } from '../../../shared/types/auth.types';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';
import { OtpDeliveryMethod } from '../../../shared/utils/otp-utility.service';
import { AuthSwagger } from '../../../swagger/auth.swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly auth: AuthService,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly firebase: FirebaseAdminService,
    private readonly fcmService: FcmService,
    private readonly sessionService: SessionService,
    private readonly sharedPermissionsService: SharedPermissionsService,
  ) {}

  @Post('reset-otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đặt lại OTP' })
  @AuthSwagger.resetOtp
  @LogActivity({
    action: 'reset_otp',
    action_enum: ActivityAction.UPDATE,
    message: 'Đặt lại mã OTP',
    resource_type: 'auth',
    resource_name: 'otp_reset',
    resource_id: 'body.phone_number',
    severity: ActivitySeverity.INFO,
  })
  resetOtp(@Body('phone_number') phone: string) {
    return this.auth.resetOtp(phone);
  }

  @Post('request-otp')
  @HttpCode(200)
  @StrictRateLimit()
  @ApiOperation({ summary: 'Yêu cầu gửi OTP' })
  @AuthSwagger.requestOtp
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone_number, dto.method || OtpDeliveryMethod.CALL);
  }

  // @Post('request-otp/firebase')
  // @HttpCode(200)
  // @ApiOperation({ summary: 'Yêu cầu OTP qua Firebase' })
  // async requestOtpFirebase(@Body(new ValidationPipe({ whitelist: true })) dto: RequestOtpDto) {
  //   const phone = dto.phone_number;
  //   const resp: any = await this.auth.requestOtpForFirebase(phone);
  //   if (resp && resp.use_firebase_fallback) return resp;
  //   const phoneNormalized = resp?.phone_number ?? phone;
  //   const expiresAt = resp?.expires_at;
  //   return this.auth.prepareFirebaseOtp(phoneNormalized, expiresAt);
  // }

  @Post('login')
  @HttpCode(200)
  @ModerateRateLimit()
  @ApiOperation({ summary: 'Đăng nhập bằng OTP' })
  @AuthSwagger.loginOtp
  @LogActivity({
    action: 'login_by_otp',
    action_enum: ActivityAction.LOGIN,
    message: 'Đăng nhập bằng OTP',
    resource_type: 'auth',
    resource_name: 'login',
    resource_id: 'body.phone_number',
    severity: ActivitySeverity.INFO,
  })
  login(@Body() dto: LoginOtpDto) {
    return this.auth.loginByPhoneOtp(dto.phone_number, dto.otp_code);
  }

  // @Post('firebase/login')
  // @HttpCode(200)
  // @ApiOperation({ summary: 'Đăng nhập bằng Firebase ID Token' })
  // @AuthSwagger.firebaseLogin
  // @LogActivity({
  //   action: 'login_firebase',
  //   action_enum: ActivityAction.LOGIN,
  //   message: 'Đăng nhập bằng Firebase',
  //   resource_type: 'auth',
  //   resource_name: 'firebase',
  //   severity: ActivitySeverity.INFO,
  // })
  // async loginWithFirebase(@Body('id_token') idToken: string) {
  //   const decoded = await this.firebase.verifyIdToken(idToken);
  //   return this.auth.loginWithFirebase(decoded);
  // }

  // @Post('firebase/login-with-fcm')
  // @HttpCode(200)
  // @ApiOperation({ summary: 'Đăng nhập Firebase và đăng ký FCM' })
  // @AuthSwagger.firebaseLoginWithFcm
  // @LogActivity({
  //   action: 'login_firebase_with_fcm',
  //   action_enum: ActivityAction.LOGIN,
  //   message: 'Đăng nhập Firebase kèm đăng ký FCM',
  //   resource_type: 'auth',
  //   resource_name: 'firebase_fcm',
  //   resource_id: 'body.device_id',
  //   severity: ActivitySeverity.INFO,
  // })
  // async loginWithFirebaseAndFcm(@Body() dto: FirebaseLoginWithFcmDto, @Req() req: Request) {
  //   this.logger.log(
  //     `[loginWithFirebaseAndFcm] incoming: id_token_present=${Boolean(dto.id_token)}, fcm_token_present=${Boolean(
  //       dto.fcm_token,
  //     )}, device_id=${dto.device_id}, platform=${dto.platform}`,
  //   );
  //   const decoded = await this.firebase.verifyIdToken(dto.id_token);
  //   const phone = decoded.phone_number || '';
  //   const user = await this.usersService.findByPhone(phone);
  //   let sessionId: string | undefined;

  //   if (user) {
  //     sessionId = await this.sessionService.createSession(user.user_id, {
  //       deviceId: dto.device_id,
  //       platform: dto.platform,
  //       ipAddress: req.ip || req.connection?.remoteAddress,
  //       userAgent: req.get('User-Agent'),
  //     });

  //     this.logger.log(`Session created for user ${user.user_id}: ${sessionId}`);
  //   }

  //   const loginResult = await this.auth.loginWithFirebaseAndFcm(
  //     decoded,
  //     dto.fcm_token,
  //     dto.platform,
  //     dto.device_id,
  //     sessionId,
  //   );

  //   return loginResult;
  // }

  // @Post('firebase/phone-auth')
  // @HttpCode(200)
  // @ApiOperation({ summary: 'Xác thực số điện thoại qua Firebase' })
  // @AuthSwagger.firebasePhoneAuth
  // @LogActivity({
  //   action: 'verify_firebase_phone',
  //   action_enum: ActivityAction.UPDATE,
  //   message: 'Xác thực số điện thoại bằng Firebase',
  //   resource_type: 'auth',
  //   resource_name: 'firebase_phone',
  //   resource_id: 'body.phone_number',
  //   severity: ActivitySeverity.INFO,
  // })
  // async verifyFirebasePhoneAuth(@Body() dto: FirebasePhoneVerificationDto) {
  //   return this.auth.verifyFirebasePhoneAuth(dto);
  // }

  // @Post('firebase/register-fcm')
  // @HttpCode(200)
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: 'Đăng ký FCM token cho người dùng đã đăng nhập' })
  // @ApiBearerAuth()
  // @LogActivity({
  //   action: 'register_fcm_token',
  //   action_enum: ActivityAction.UPDATE,
  //   message: 'Đăng ký FCM token cho thiết bị',
  //   resource_type: 'fcm',
  //   resource_name: 'device_token',
  //   resource_id: 'body.device_id',
  //   severity: ActivitySeverity.INFO,
  // })
  // async registerFcmToken(
  //   @Body(new ValidationPipe({ whitelist: true })) dto: RegisterFcmTokenDto,
  //   @Req() req: Request & { user?: { sub?: string; userId?: string } },
  // ) {
  //   const userId = req.user?.userId || req.user?.sub;
  //   if (!userId) throw new BadRequestException('User not authenticated');

  //   try {
  //     if (!this.fcmService) {
  //       this.logger.error('FCM service not initialized');
  //       throw new ServiceUnavailableException('FCM service not available');
  //     }

  //     await this.fcmService.saveToken(
  //       userId,
  //       dto.fcm_token,
  //       'device',
  //       dto.platform || 'android',
  //       dto.device_id,
  //     );
  //     return { success: true, message: 'FCM token registered successfully' };
  //   } catch (error) {
  //     this.logger.error('Failed to register FCM token:', String(error));
  //     throw new ServiceUnavailableException('FCM service not available');
  //   }
  // }

  @Post('admin/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng nhập quản trị' })
  @AuthSwagger.adminLogin
  @LogActivity({
    action: 'login_admin',
    action_enum: ActivityAction.LOGIN,
    message: 'Đăng nhập tài khoản admin',
    resource_type: 'auth',
    resource_name: 'admin',
    resource_id: 'body.email',
    severity: ActivitySeverity.INFO,
  })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.loginAdminEmailPassword(dto.email, dto.password);
  }

  @Post('caregiver/register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Đăng ký caregiver' })
  @AuthSwagger.caregiverRegister
  @LogActivity({
    action: 'register_caregiver',
    action_enum: ActivityAction.CREATE,
    message: 'Đăng ký tài khoản caregiver',
    resource_type: 'auth',
    resource_name: 'caregiver',
    resource_id: 'body.email',
    severity: ActivitySeverity.INFO,
  })
  caregiverRegister(@Body() dto: CaregiverRegisterDto) {
    return this.auth.registerCaregiver(dto);
  }

  @Post('caregiver/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng nhập caregiver' })
  @AuthSwagger.caregiverLogin
  @LogActivity({
    action: 'login_caregiver',
    action_enum: ActivityAction.LOGIN,
    message: 'Đăng nhập tài khoản caregiver',
    resource_type: 'auth',
    resource_name: 'caregiver',
    resource_id: 'body.email',
    severity: ActivitySeverity.INFO,
  })
  caregiverLogin(@Body() dto: CaregiverLoginDto) {
    return this.auth.loginCaregiverEmailPassword(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại' })
  @AuthSwagger.me
  async me(@Req() req: AuthenticatedRequest) {
    let id: string;
    try {
      id = getUserIdFromReq(req);
    } catch {
      return { user: null };
    }
    const u = await this.usersService.findById(id);
    if (!u) return { user: null };

    const userResponse: any = {
      user_id: u.user_id,
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      phone_number: u.phone_number,
      is_active: u.is_active,
      created_at: u.created_at,
    };

    if (u.role === 'customer') {
      userResponse.patient = {
        patient_id: u.user_id,
        patient_name: u.full_name,
      };
    } else if (u.role === 'caregiver') {
      try {
        const assignedPatients = await this.sharedPermissionsService.getAllForCaregiver(id);
        userResponse.patients = assignedPatients.map((assignment) => ({
          patient_id: assignment.customer_id,
          patient_name: assignment.customer_full_name,
          permissions: {
            stream_view: assignment.stream_view,
            alert_read: assignment.alert_read,
            alert_ack: assignment.alert_ack,
            profile_view: assignment.profile_view,
            log_access_days: assignment.log_access_days,
            report_access_days: assignment.report_access_days,
            notification_channel: assignment.notification_channel,
          },
        }));
      } catch (error) {
        this.logger.error(`Failed to get assigned patients for caregiver ${id}:`, error);
        userResponse.patients = [];
      }
    }

    return { user: userResponse };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng xuất' })
  @AuthSwagger.logout
  @LogActivity({
    action: 'logout',
    action_enum: ActivityAction.LOGOUT,
    message: 'Đăng xuất khỏi hệ thống',
    resource_type: 'auth',
    resource_name: 'logout',
    resource_id: 'user.userId',
    severity: ActivitySeverity.INFO,
  })
  async logout(@Req() req: AuthenticatedRequest) {
    let userId: string | undefined;
    try {
      userId = getUserIdFromReq(req);
    } catch {
      userId = undefined;
    }
    const deviceId =
      typeof req.get === 'function'
        ? req.get('x-device-id')
        : (req.headers as unknown as Record<string, string | undefined>)['x-device-id'];

    if (userId) {
      try {
        const result = await this.fcmService.deleteDeviceTokens(userId, deviceId);
        this.logger.log(
          `[LOGOUT] Deleted ${result.deleted} FCM tokens for user ${userId}, device: ${deviceId || 'all'}`,
        );
      } catch (error) {
        this.logger.error(`[LOGOUT] Failed to delete FCM tokens for user ${userId}:`, error);
      }
    }

    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Làm mới access token' })
  @AuthSwagger.refresh
  @LogActivity({
    action: 'refresh_token',
    action_enum: ActivityAction.UPDATE,
    message: 'Làm mới access token',
    resource_type: 'auth',
    resource_name: 'token',
    resource_id: 'user.userId',
    severity: ActivitySeverity.INFO,
  })
  async refresh(@Req() req: AuthenticatedRequest) {
    const u = req.user;
    if (!u) return { access_token: null };
    const payload = {
      sub: u.userId ?? u.sub,
      role: u.role,
      phone_number: (u as any).phone_number,
    };
    const access_token = await this.jwt.signAsync(payload);
    return { access_token };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @StrictRateLimit()
  @ApiOperation({ summary: 'Yêu cầu đặt lại mật khẩu qua email' })
  @LogActivity({
    action: 'forgot_password_request',
    action_enum: ActivityAction.CREATE,
    message: 'Yêu cầu đặt lại mật khẩu',
    resource_type: 'auth',
    resource_name: 'password_reset',
    resource_id: 'body.email',
    severity: ActivitySeverity.INFO,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.auth.sendPasswordResetEmail(dto.email);
    return result;
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng token' })
  @LogActivity({
    action: 'reset_password',
    action_enum: ActivityAction.UPDATE,
    message: 'Đặt lại mật khẩu bằng token',
    resource_type: 'auth',
    resource_name: 'password_reset',
    resource_id: 'literal:password_reset',
    severity: ActivitySeverity.MEDIUM,
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const result = await this.auth.resetPasswordWithToken(dto.token, dto.newPassword);
    if (!result.success) {
      throw new BadRequestException(result.message);
    }
    return result;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Đổi mật khẩu' })
  @LogActivity({
    action: 'change_password',
    action_enum: ActivityAction.UPDATE,
    message: 'Đổi mật khẩu người dùng',
    resource_type: 'auth',
    resource_name: 'password_change',
    resource_id: 'user.userId',
    severity: ActivitySeverity.MEDIUM,
  })
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: AuthenticatedRequest) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const userId = getUserIdFromReq(req);

    this.logger.log(`Password change requested for user: ${userId}`);

    // Verify current password
    const user = await this.usersService.findById(userId);
    const ok = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!ok) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Use UsersService.update which will hash the password when the `password` field is provided
    await this.usersService.update(userId, { password: dto.newPassword } as any);

    return {
      success: true,
      message: 'Password has been changed successfully.',
    };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Lấy danh sách phiên đăng nhập đang hoạt động' })
  @ApiBearerAuth()
  async getActiveSessions(@Req() req: AuthenticatedRequest) {
    const userId = getUserIdFromReq(req);

    const sessions = await this.sessionService.getActiveSessions(userId);
    return {
      sessions: sessions.map((session) => ({
        sessionId: session.sessionId,
        deviceId: session.deviceId,
        platform: session.platform,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      })),
      total: sessions.length,
    };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Kết thúc một phiên đăng nhập' })
  @ApiBearerAuth()
  @LogActivity({
    action: 'terminate_session',
    action_enum: ActivityAction.DELETE,
    message: 'Kết thúc phiên đăng nhập',
    resource_type: 'auth',
    resource_name: 'session',
    resource_id: 'sessionId',
    severity: ActivitySeverity.MEDIUM,
  })
  async terminateSession(@Param('sessionId') sessionId: string, @Req() req: AuthenticatedRequest) {
    const userId = getUserIdFromReq(req);
    if (!userId) throw new BadRequestException('User not authenticated');

    const terminated = await this.sessionService.terminateSession(sessionId);

    if (!terminated) {
      throw new BadRequestException('Session not found or already terminated');
    }

    return {
      success: true,
      message: 'Session terminated successfully',
    };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Kết thúc tất cả phiên đăng nhập' })
  @ApiBearerAuth()
  @LogActivity({
    action: 'terminate_all_sessions',
    action_enum: ActivityAction.DELETE,
    message: 'Kết thúc tất cả các phiên đăng nhập của người dùng',
    resource_type: 'auth',
    resource_name: 'session',
    resource_id: 'user.userId',
    severity: ActivitySeverity.HIGH,
  })
  async terminateAllSessions(@Req() req: AuthenticatedRequest) {
    const userId = getUserIdFromReq(req);
    if (!userId) throw new BadRequestException('User not authenticated');

    const terminatedCount = await this.sessionService.terminateAllSessions(userId);

    return {
      success: true,
      message: `Terminated ${terminatedCount} active sessions`,
      terminatedCount,
    };
  }
}
