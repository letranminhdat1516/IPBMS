import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CaregiverRegisterDto } from '../../../application/dto/auth/auth.dto';
import { User, UserRole } from '../../../core/entities/users.entity';
import { TwilioSmsService } from '../../../infrastructure/external-apis/twilio/twilio-sms.service';
import { TwilioVoiceService } from '../../../infrastructure/external-apis/twilio/twilio-voice.service';
import { FirebaseAdminService } from '../../../shared/providers/firebase.provider';
import { OtpDeliveryMethod, OtpUtilityService } from '../../../shared/utils/otp-utility.service';
import { FcmService } from '../notifications/fcm.service';
import { SubscriptionService } from '../subscription';
import { CaregiverInvitationsService } from '../users/caregiver-invitations.service';
import { UsersService } from '../users/users.service';

@Injectable()
/**
 * AuthService
 * Mô tả tổng quan:
 * - Xử lý các luồng xác thực chính: OTP (SMS), Firebase Phone Auth, đăng nhập bằng Firebase và sinh JWT.
 * - Trách nhiệm: validate input, sinh/luu OTP, xác thực token từ Firebase, tạo user nếu cần, sinh JWT.
 * - Không nên đặt logic gửi thông báo/notification nặng ở đây. Hiện có lưu FCM token trong một số flow,
 *   nhưng khuyến nghị tách ra endpoint riêng để giữ single-responsibility.
 *
 * Quy ước và chú ý bảo mật:
 * - Số điện thoại luôn được chuẩn hoá bằng `TwilioSmsService.formatE164` khi đọc/ghi với DB hoặc provider SMS.
 * - `OtpUtilityService` chịu trách nhiệm sinh mã và tính thời hạn; server lưu `otp_code` và `otp_expires_at`.
 * - Biến môi trường `BYPASS_OTP` KHÔNG được bật trên môi trường production. Chỉ dùng cho test/CI.
 * - Các endpoint liên quan OTP cần rate-limiting (không implement ở đây).
 */
export class AuthService {
  [x: string]: any;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly firebase: FirebaseAdminService,
    private readonly jwt: JwtService,
    private readonly twilioSms: TwilioSmsService,
    private readonly otpUtility: OtpUtilityService,
    private readonly assignmentsService: CaregiverInvitationsService,
    private readonly fcmService: FcmService,
    private readonly twilioVoice: TwilioVoiceService,
    private readonly _subscriptionService: SubscriptionService,
    // EmailService is commented out to avoid SMTP initialization at bootstrap
    // @Optional() private readonly emailService?: EmailService,
  ) {}

  /**
   * Xóa OTP cho số điện thoại
   * - Bước thực hiện:
   *   1. Chuẩn hoá số (E.164)
   *   2. Tìm user bằng cả dạng có dấu '+' và không có (tương thích dữ liệu cũ)
   *   3. Xoá `otp_code` và `otp_expires_at` nếu user tồn tại
   * - Trả về message thông báo
   * - Lưu ý: hàm này chỉ thao tác DB, không gửi SMS hay tương tác với Firebase.
   */
  async resetOtp(phone: string) {
    const cleanPhone = this.twilioSms.formatE164(phone);
    const phoneWithoutPlus = cleanPhone.replace('+', '');

    // Try to find user with both formats (with and without +)
    let user = await this.usersService.findByPhone(cleanPhone);
    if (!user) {
      user = await this.usersService.findByPhone(phoneWithoutPlus);
    }

    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng với số điện thoại này');
    }
    await this.usersService.update(user.user_id, {
      otp_code: undefined,
      otp_expires_at: undefined,
    });
    return { message: `Đã xóa OTP cho số ${cleanPhone}` };
  }

  /**
   * Yêu cầu gửi OTP (flow chính):
   * 1. Chuẩn hoá số về E.164 và tìm user (hỗ trợ cả dạng không có +)
   * 2. Kiểm tra cooldown (tránh spam) bằng `otpUtility.canSendNewOtp`
   * 3. Sinh OTP và lưu `otp_code` + `otp_expires_at` vào DB ngay lập tức
   * 4. Thử gửi SMS qua Twilio;
   *    - Nếu Twilio trả success => trả kết quả success cho client
   *    - Nếu Twilio thất bại hoặc throw => trả về gợi ý để client dùng Firebase Phone Auth (fallback)
   *
   * Hết hạn & bảo mật:
   * - OTP expiry được kiểm tra khi verify (loginByPhoneOtp). Không log OTP thuần trong production.
   */

  async requestOtp(phone: string, method: OtpDeliveryMethod = OtpDeliveryMethod.SMS) {
    this.logger.log(`OTP request for phone=${phone}, method=${method}`);

    const cleanPhone = this.otpUtility.sanitizePhoneNumber(phone);
    const user = await this.usersService.findByPhone(cleanPhone);
    if (!user) throw new UnauthorizedException('Số điện thoại này chưa được đăng ký.');

    const cooldown = this.otpUtility.canSendNewOtp(user.otp_expires_at as Date, 1);
    if (!cooldown.canSend) {
      throw new BadRequestException(
        `Please wait ${this.otpUtility.formatRemainingTime(cooldown.remainingCooldown!)} before requesting new OTP`,
      );
    }

    const { code: otpCode, expiresAt } = this.otpUtility.generateOtp({ length: 6 });
    await this.usersService.update(user.user_id, {
      otp_code: otpCode,
      otp_expires_at: expiresAt,
    });

    let success = false;
    let reason: string | undefined;
    let actualMethod = method;

    try {
      if (method === OtpDeliveryMethod.SMS) {
        const result = await this.twilioSms.sendOtpSms(cleanPhone, otpCode);
        success = result.success;
        if (!success) reason = result.error ?? 'Twilio SMS failed';
      }

      if (method === OtpDeliveryMethod.CALL) {
        const voiceOk: boolean = await this.twilioVoice.callOtp(cleanPhone, otpCode);
        success = voiceOk;
        if (!success) reason = 'Twilio Voice failed';
      }
    } catch (e) {
      this.logger.error(`OTP delivery error: ${String(e)}`);
      return {
        success: false,
        message: 'Failed to deliver OTP due to internal error',
        reason: String(e),
        phone_number: cleanPhone,
        method: actualMethod,
        expires_at: expiresAt,
        expires_in: this.otpUtility.formatRemainingTime(5 * 60),
      };
    }

    // Prepare Firebase fallback response
    return this.prepareFirebaseOtp(cleanPhone, expiresAt);
  }

  /**
   * Gửi OTP qua Twilio
   * - Nhận cleanPhone (đã chuẩn hoá E.164) và optional otpCode
   * - Trả về object mô tả trạng thái gửi (success boolean, message, call_id nếu có)
   * - Không ném exception ra ngoài (catch và trả về success: false) để caller quyết định fallback.
   *
   * Edge cases:
   * - Twilio có thể trả về response không đầy đủ (no call_id) => vẫn xem là thất bại nếu success flag false
   * - Nếu Twilio throw network error => catch và log
   */
  async requestOtpViaTwilio(cleanPhone: string, otpCode?: string) {
    const code = otpCode ?? this.otpUtility.generateOtp({ length: 6 }).code;
    try {
      const twilioResult: any = await this.twilioSms.sendOtpSms(cleanPhone, code);
      if (!twilioResult || !twilioResult.success) {
        this.logger.warn(
          `\u26a0 [SMS_DELIVERY] Twilio SMS failed for ${cleanPhone}: ${twilioResult?.error ?? 'unknown'}`,
        );
        return {
          success: false,
          method: OtpDeliveryMethod.SMS,
          phone_number: cleanPhone,
          message: twilioResult?.error ?? 'Twilio SMS failed',
          call_id: twilioResult?.call_id ?? null,
          use_firebase_fallback: true,
          expires_at: null,
          expires_in: null,
          metadata: twilioResult ?? null,
        };
      }
      return {
        success: true,
        method: OtpDeliveryMethod.SMS,
        phone_number: cleanPhone,
        message: 'OTP sent successfully via SMS',
        call_id: twilioResult.call_id ?? null,
        use_firebase_fallback: false,
        expires_at: null,
        expires_in: null,
        metadata: twilioResult ?? null,
      };
    } catch (e) {
      this.logger.error(`\u274c [OTP_DELIVERY] Twilio error for ${cleanPhone}: ${String(e)}`);
      return {
        success: false,
        method: OtpDeliveryMethod.SMS,
        phone_number: cleanPhone,
        message: String(e) || 'Twilio error',
        call_id: null,
        use_firebase_fallback: true,
        expires_at: null,
        expires_in: null,
        metadata: null,
      };
    }
  }

  /**
   * Chuẩn bị response để client dùng Firebase Phone Authentication làm fallback
   * - Thường gọi khi Twilio SMS không thể gửi được mã
   * - Server không quản lý verification_id của Firebase; server chỉ trả thông tin expiry và flag
   * - Trường `use_firebase_fallback: true` báo client thực hiện flow Firebase (client-side)
   */
  async prepareFirebaseOtp(cleanPhone: string, expiresAt?: Date) {
    // Assumes OTP already generated and stored by caller; if not, generate minimal expiry
    const expires = expiresAt ?? new Date(Date.now() + 5 * 60 * 1000);
    // Return the same normalized envelope as Twilio responses so client logic is unified
    return {
      success: true,
      method: OtpDeliveryMethod.SMS,
      phone_number: cleanPhone,
      message: 'Please use Firebase Phone Authentication for OTP',
      call_id: null,
      use_firebase_fallback: true,
      expires_at: expires,
      expires_in: this.otpUtility.formatRemainingTime(5 * 60),
      metadata: null,
    };
  }

  // --- Hàm đăng nhập bằng số điện thoại và OTP (áp dụng logic VerifyOtpAsync từ C#) ---
  /**
   * Đăng nhập bằng số điện thoại + OTP
   * Steps:
   * 1. Chuẩn hoá số điện thoại về E.164 và tìm user (đọc cả dạng không có +)
   * 2. Kiểm tra OTP:
   *    - Nếu `BYPASS_OTP=true` (test) thì bỏ qua expiry check
   *    - Nếu OTP hết hạn => UnauthorizedException
   *    - So sánh chuỗi (trim) để tránh whitespace mismatch
   * 3. Nếu hợp lệ và user active => xóa OTP trên DB (ngăn replay) và trả JWT
   *
   * Security notes:
   * - BYPASS_OTP chỉ dùng cho test; không kích hoạt trên production.
   * - Hãy hạn chế logging thông tin nhạy cảm.
   */
  async loginByPhoneOtp(phone: string, otp: string) {
    this.logger.log(`📞 [LOGIN] Login attempt for phone: ${phone}`);

    const cleanPhone = this.twilioSms.formatE164(phone);
    this.logger.log(`🔧 [LOGIN] Phone number formatted to E.164: ${cleanPhone}`);

    const phoneWithoutPlus = cleanPhone.replace('+', '');

    let user = await this.usersService.findByPhone(cleanPhone);
    if (!user) {
      user = await this.usersService.findByPhone(phoneWithoutPlus);
    }

    if (!user) {
      this.logger.warn(`❌ [LOGIN] User not found for phone ${cleanPhone} or ${phoneWithoutPlus}`);
      throw new UnauthorizedException('User not found');
    }

    this.logger.log(
      `🔍 [OTP_VERIFY] DB otp_code: ${user.otp_code} (type: ${typeof user.otp_code}), DB otp_expires_at: ${user.otp_expires_at} (type: ${typeof user.otp_expires_at}), input otp: ${otp} (type: ${typeof otp})`,
    );

    const bypassOtp = process.env.BYPASS_OTP === 'true';
    this.logger.log(`🔧 [OTP_VERIFY] Bypass mode: ${bypassOtp}`);

    const now = new Date();
    if (!bypassOtp && user.otp_expires_at && user.otp_expires_at < now) {
      this.logger.warn(`⏰ [OTP_VERIFY] OTP has expired for ${cleanPhone}`);
      throw new UnauthorizedException('OTP has expired. Please request a new one.');
    }

    const dbOtp = String(user.otp_code || '').trim();
    const inputOtp = String(otp || '').trim();
    const isValidOtp = bypassOtp || (dbOtp === inputOtp && dbOtp.length > 0);

    if (bypassOtp) {
      this.logger.warn(`🚨 [OTP_VERIFY] OTP bypassed for testing for ${cleanPhone}`);
    }

    this.logger.log(
      `✅ [OTP_VERIFY] Verification result for ${cleanPhone}: ${isValidOtp} (DB: "${dbOtp}", Input: "${inputOtp}")`,
    );

    if (!isValidOtp) {
      if (!user.otp_code) {
        throw new BadRequestException('OTP not requested. Please request OTP first.');
      } else {
        throw new UnauthorizedException('Invalid OTP code.');
      }
    }

    if (!user.is_active) {
      this.logger.warn(`🚫 [LOGIN] Account inactive for ${cleanPhone}`);
      throw new UnauthorizedException('Account is inactive. Please contact support.');
    }

    // ✅ Prisma style: clear OTP trong DB
    await this.usersService.update(user.user_id, {
      otp_code: undefined,
      otp_expires_at: undefined,
    });
    const payload = {
      sub: user.user_id,
      role: user.role,
      phone: cleanPhone,
      username: user.username,
      full_name: user.full_name,
    };

    const access_token = await this.jwt.signAsync(payload);

    this.logger.log(`🎉 [LOGIN] Login successful for ${cleanPhone} (${user.username})`);

    return {
      access_token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone_number: cleanPhone,
        is_first_login: this.isFirstTimeLogin(user),
      },
    };
  }

  // --- Helper method kiểm tra lần đầu đăng nhập ---
  private isFirstTimeLogin(user: User): boolean {
    // Logic kiểm tra lần đầu đăng nhập có thể dựa trên:
    // 1. Thời gian tạo tài khoản gần bằng thời gian cập nhật cuối
    // 2. Một số field chưa được điền đầy đủ
    // 3. Hoặc có thể thêm một field riêng trong DB

    const timeDiff = user.updated_at.getTime() - user.created_at.getTime();
    const isRecentlyCreated = timeDiff < 60000; // Dưới 1 phút

    const hasIncompleteProfile = !user.date_of_birth || !user.gender;

    return isRecentlyCreated || hasIncompleteProfile;
  }

  // --- Firebase Phone Authentication verification ---
  async verifyFirebasePhoneAuth(dto: {
    verification_id: string;
    sms_code: string;
    phone_number: string;
    fcm_token?: string;
    platform?: string;
    device_id?: string;
  }) {
    /**
     * Xác thực Firebase Phone Auth
     * - Client gửi id_token (Firebase) sau khi verify phone trên client
     * - Server verify token bằng Firebase Admin SDK để đảm bảo token hợp lệ
     * - So sánh số điện thoại trong token với số điện thoại client gửi
     * - Nếu user không tồn tại -> tạo mới (role: CUSTOMER)
     * - Nếu client gửi fcm_token thì lưu token (không làm fail login nếu lưu token lỗi)
     * - Trả access_token + user info
     *
     * Notes:
     * - Việc tạo user tự động cần audit log để dễ điều tra abuse.
     */
    this.logger.log(
      `🔐 [FIREBASE_VERIFY] Starting Firebase Phone Auth verification for phone: ${dto.phone_number}`,
    );

    try {
      // For Firebase Phone Auth, client should send the ID token (id_token).
      // Backward-compatible: accept verification_id if id_token not present in transformed DTO
      const idToken = (dto as any).id_token ?? dto.verification_id;
      this.logger.log(`🔍 [FIREBASE_VERIFY] Verifying Firebase ID token for ${dto.phone_number}`);
      const decodedToken = await this.firebase.verifyIdToken(idToken);

      this.logger.log(
        `✅ [FIREBASE_VERIFY] Firebase token verified successfully for phone: ${decodedToken.phone_number}`,
      );

      // Verify phone number matches
      const cleanPhone = this.otpUtility.sanitizePhoneNumber(dto.phone_number);
      const tokenPhone = this.otpUtility.sanitizePhoneNumber(decodedToken.phone_number || '');

      if (cleanPhone !== tokenPhone) {
        this.logger.warn(
          `⚠️ [FIREBASE_VERIFY] Phone number mismatch: expected ${cleanPhone}, got ${tokenPhone}`,
        );
        throw new UnauthorizedException('Phone number verification failed');
      }

      this.logger.log(`📞 [FIREBASE_VERIFY] Phone number verification successful: ${cleanPhone}`);

      // Find or create user
      let user = await this.users.findOne({ where: { phone_number: cleanPhone } });

      if (!user) {
        // Create new user if doesn't exist
        this.logger.log(`👤 [FIREBASE_VERIFY] Creating new user for phone: ${cleanPhone}`);

        // Use usersService.create() to ensure subscription is created automatically
        user = await this.usersService.create({
          phone_number: cleanPhone,
          full_name: `User ${cleanPhone}`,
          username: cleanPhone.replace(/[^a-zA-Z0-9]/g, ''),
          email: `${cleanPhone.replace(/[^0-9]/g, '')}@temp.com`, // Temporary email
        });

        // Override role to customer since CreateUserDto doesn't have role field
        await this.usersService.update(user.user_id, {
          role: UserRole.CUSTOMER,
        });

        this.logger.log(
          `✅ [FIREBASE_VERIFY] New user created successfully: ${user.username} (${cleanPhone})`,
        );
      } else {
        this.logger.log(
          `👤 [FIREBASE_VERIFY] Existing user found: ${user.username} (${cleanPhone})`,
        );

        // Ensure existing customer users have a subscription
        if (user.role === UserRole.CUSTOMER) {
          const hasSubscription = await this._subscriptionService.getActive(user.user_id);
          if (!hasSubscription) {
            this.logger.log(
              `🔄 [FIREBASE_VERIFY] Creating missing subscription for existing user: ${user.username}`,
            );
            await this._subscriptionService.createFree(user.user_id);
          }
        }
      }

      // Check if user is active
      if (!user.is_active) {
        this.logger.warn(`Login failed for ${cleanPhone}: User is inactive`);
        throw new UnauthorizedException('Account is inactive. Please contact support.');
      }

      // Register FCM token if provided
      if (dto.fcm_token) {
        this.logger.log(
          `📱 [FCM_TOKEN] Registering FCM token for user ${user.username} (${cleanPhone})`,
        );
        await this.fcmService.saveToken(
          user.user_id,
          dto.fcm_token,
          'customer',
          dto.platform as any,
          dto.device_id,
        );
        this.logger.log(`✅ [FCM_TOKEN] FCM token registered successfully for ${user.username}`);
      } else {
        this.logger.log(`📱 [FCM_TOKEN] No FCM token provided for ${user.username}`);
      }

      // Create JWT payload
      const payload = {
        sub: user.user_id,
        role: user.role,
        phone: cleanPhone,
        username: user.username,
      };

      // Generate JWT token
      const access_token = await this.jwt.signAsync(payload);

      this.logger.log(
        `🎉 [FIREBASE_VERIFY] Firebase Phone Auth successful for ${cleanPhone} (${user.username}) - SMS delivery confirmed`,
      );
      this.logger.log(`🔑 [AUTH_SUCCESS] JWT token generated for user: ${user.username}`);

      return {
        access_token,
        user: {
          user_id: user.user_id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          phone_number: cleanPhone,
          is_first_login: this.isFirstTimeLogin(user),
        },
      };
    } catch (error) {
      this.logger.error(
        `❌ [FIREBASE_VERIFY] Firebase Phone Auth verification failed for ${dto.phone_number}: ${String(error)}`,
      );
      throw new UnauthorizedException('Firebase phone authentication failed');
    }
  }

  /**
   * Đăng ký caregiver
   * - Validate password/confirm
   * - Kiểm tra tồn tại (email/username/phone)
   * - Hash password và tạo user với role CAREGIVER
   * - Tạo bản ghi trong table caregivers (raw query hiện tại)
   *
   * Notes:
   * - Sử dụng transaction nếu logic tạo user + insert caregivers cần atomicity
   */
  async registerCaregiver(dto: CaregiverRegisterDto) {
    if (dto.password !== dto.confirm_password) {
      throw new BadRequestException('Password và Confirm Password không khớp');
    }

    // Check tồn tại
    const existedByEmail = dto.email ? await this.usersService.findByEmail(dto.email) : null;
    const existedByPhone = dto.phone_number
      ? await this.usersService.findByPhone(dto.phone_number)
      : null;
    const existedByUsername = dto.username
      ? (await this.usersService.findAllWithOptions({ username: dto.username }))[0]
      : null;

    if (existedByEmail || existedByPhone || existedByUsername) {
      throw new BadRequestException('Email, username hoặc số điện thoại đã tồn tại');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);
    const cleanPhone = this.otpUtility.sanitizePhoneNumber(dto.phone_number);

    // Tạo user qua UsersService (create() will set a temporary password_hash internally)
    const newUser = await this.usersService.create({
      username: dto.username,
      email: dto.email,
      full_name: dto.full_name,
      phone_number: cleanPhone,
      role: UserRole.CAREGIVER,
      is_active: true,
    } as any);

    // Replace the temporary password_hash with the caregiver's hashed password so they can login
    await this.usersService.update(newUser.user_id, {
      password_hash,
      updated_at: new Date(),
    } as any);

    return {
      message: 'Đăng ký caregiver thành công',
      user: {
        user_id: newUser.user_id,
        username: newUser.username,
        full_name: newUser.full_name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        role: newUser.role,
      },
    };
  }

  // --- Caregiver Login ---
  /**
   * Login caregiver bằng email + password
   * - Kiểm tra role CAREGIVER
   * - Kiểm tra trạng thái active
   * - Lấy assignments để trả `is_assigned` (business logic)
   */
  async loginCaregiverEmailPassword(email: string, password: string) {
    this.logger.log(`🔐 [CAREGIVER_LOGIN] Login attempt with email: ${email}`);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`❌ [CAREGIVER_LOGIN] No account found for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== UserRole.CAREGIVER) {
      this.logger.warn(`🚫 [CAREGIVER_LOGIN] Role mismatch for email ${email} (role=${user.role})`);
      throw new UnauthorizedException('Not allowed');
    }

    if (!user.is_active) {
      this.logger.warn(`⏸️ [CAREGIVER_LOGIN] Inactive caregiver account: ${user.user_id}`);
      throw new UnauthorizedException('Account is inactive');
    }

    const caregiverAssignments = await this.assignmentsService.listByStatus(
      user.user_id,
      'accepted',
    );
    const is_assigned = caregiverAssignments.length > 0;

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      this.logger.warn(`⚠️ [CAREGIVER_LOGIN] Invalid password for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.user_id,
      role: user.role,
      username: user.username,
      email: user.email,
    };

    const access_token = await this.jwt.signAsync(payload);

    this.logger.log(`✅ [CAREGIVER_LOGIN] Login successful for caregiver ${user.user_id}`);

    return {
      access_token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_assigned,
      },
    };
  }

  async verifyFirebaseIdToken(idToken: string) {
    return this.firebase.verifyIdToken(idToken);
  }

  async loginWithFirebase(
    decoded: { uid: string; phone_number?: string; email?: string },
    sessionId?: string,
  ) {
    const phone = this.otpUtility.sanitizePhoneNumber(decoded.phone_number || '');
    this.logger.log(`🔐 [FIREBASE_LOGIN] Login attempt for phone: ${phone || 'unknown'}`);

    const user = await this.users.findOne({ where: { phone_number: phone } });

    if (!user) {
      this.logger.warn(`❌ [FIREBASE_LOGIN] No user bound to phone ${phone}`);
      throw new UnauthorizedException('Không tìm thấy user với số điện thoại Firebase.');
    }

    if (!user.is_active) {
      this.logger.warn(`⏸️ [FIREBASE_LOGIN] Inactive account: ${user.user_id}`);
      throw new UnauthorizedException('Tài khoản bị khóa.');
    }

    const payload = {
      sub: user.user_id,
      role: user.role,
      phone: phone,
      username: user.username,
      sessionId: sessionId, // Include session ID in JWT payload
    };

    const access_token = await this.jwt.signAsync(payload);

    this.logger.log(`✅ [FIREBASE_LOGIN] Login successful for user ${user.user_id}`);

    return {
      access_token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone_number: phone,
        is_first_login: this.isFirstTimeLogin(user),
      },
    };
  }

  /**
   * Login bằng Firebase và đăng ký FCM token (nếu client gửi)
   * - Reuse `loginWithFirebase` để sinh token
   * - Lưu FCM token nếu có; nếu lưu thất bại thì vẫn cho phép login
   * - Recommend: tách việc đăng ký FCM ra endpoint riêng `/me/fcm` để giữ SRP
   */
  async loginWithFirebaseAndFcm(
    decoded: { uid: string; phone_number?: string; email?: string },
    fcmToken?: string,
    platform?: string,
    deviceId?: string,
    sessionId?: string,
  ) {
    // Firebase login first
    const authResult = await this.loginWithFirebase(decoded, sessionId);

    // Register FCM token if provided
    if (fcmToken && authResult.user?.user_id) {
      this.logger.log(
        `📲 [FIREBASE_LOGIN] User ${authResult.user.user_id} provided FCM token ${fcmToken} (platform=${platform || 'unknown'}, deviceId=${deviceId || 'unknown'})`,
      );

      try {
        if (this.fcmService) {
          // Thử refresh token trước, nếu không tồn tại thì save mới
          const refreshResult = await this.fcmService.refreshTokenOnLogin(
            authResult.user.user_id,
            fcmToken,
            deviceId,
          );

          this.logger.log(
            `🔄 [FIREBASE_LOGIN] FCM token refresh result for ${authResult.user.user_id}: refreshed=${refreshResult.refreshed}`,
          );

          if (!refreshResult.refreshed) {
            // Token mới, lưu như bình thường
            await this.fcmService.saveToken(
              authResult.user.user_id,
              fcmToken,
              'device', // default type for mobile app
              platform || 'android',
              deviceId,
            );
            this.logger.log(
              `💾 [FIREBASE_LOGIN] Stored new FCM token ${fcmToken} for user ${authResult.user.user_id}`,
            );
          }
        } else {
          // fallback: log but do not throw
          this.logger.warn('FcmService not available for token registration');
        }
      } catch (error) {
        this.logger.warn(
          `⚠️ [FIREBASE_LOGIN] Failed to persist FCM token ${fcmToken} for user ${authResult.user.user_id}: ${String(
            error,
          )}`,
        );
        // Don't fail the login if FCM token save fails
      }
    } else if (authResult.user?.user_id) {
      this.logger.log(
        `ℹ️ [FIREBASE_LOGIN] No FCM token supplied for user ${authResult.user.user_id}`,
      );
    }

    return authResult;
  }

  private maskToken(token?: string): string {
    if (!token) return '[empty]';
    const value = token.trim();
    if (value.length <= 6) {
      return `${value.slice(0, 2)}***${value.slice(-2)}`;
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  // ---------------------- Password Reset Methods ----------------------

  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email
      const user = await this.users.findOne({ where: { email } });
      if (!user) {
        // Don't reveal if email exists or not for security
        return { success: true, message: 'If the email exists, a reset link has been sent.' };
      }

      /*
       * Original token generation + email send logic (commented out to disable SMTP):
       *
       * // Generate reset token (using JWT with short expiry)
       * const resetToken = await this.jwt.signAsync(
       *   {
       *     sub: user.user_id,
       *     type: 'password_reset',
       *     email: user.email,
       *   },
       *   { expiresIn: '1h' },
       * );
       * Email sending is disabled in this branch to avoid SMTP initialization at bootstrap.
       * The original logic is preserved below for easy re-enable.
       *
       * // Create email template and send only if EmailService is available
       * if (!this.emailService) {
       *   this.logger.warn('EmailService not available; skipping password reset email send');
       *   return { success: true, message: 'If the email exists, a reset link has been sent.' };
       * }
       *
       * // Create email template
       * const template = this.emailService.createPasswordResetTemplate(
       *   resetToken,
       *   user.full_name || user.username,
       * );
       *
       * // Send email
       * const emailSent = await this.emailService.sendEmail(user.email, template);
       *
       * if (emailSent) {
       *   this.logger.log(`Password reset email sent to ${user.email} for user ${user.user_id}`);
       *   return { success: true, message: 'Password reset email sent successfully.' };
       * } else {
       *   this.logger.error(`Failed to send password reset email to ${user.email}`);
       *   throw new Error('Failed to send email');
       * }
       */

      this.logger.warn('Password reset email sending is disabled in this environment.');
      return { success: true, message: 'If the email exists, a reset link has been sent.' };
    } catch (error) {
      this.logger.error('Error sending password reset email:', error);
      return { success: false, message: 'Failed to send password reset email.' };
    }
  }

  async resetPasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify token
      const payload = await this.jwt.verifyAsync(token);
      if (payload.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      // Find user
      const user = await this.users.findOne({
        where: { user_id: payload.sub, email: payload.email },
      });
      if (!user) {
        throw new Error('User not found');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.users.update(user.user_id, {
        password_hash: hashedPassword,
        updated_at: new Date(),
      });

      this.logger.log(`Password reset successfully for user ${user.user_id}`);
      return { success: true, message: 'Password reset successfully.' };
    } catch (error) {
      this.logger.error('Error resetting password:', error);
      return { success: false, message: 'Invalid or expired reset token.' };
    }
  }

  /**
   * Đăng nhập admin bằng email + password
   * - Chỉ cho phép user có role ADMIN
   * - Kiểm tra trạng thái active
   * - Trả JWT + thông tin user
   */
  async loginAdminEmailPassword(email: string, password: string) {
    this.logger.log(`🔐 [ADMIN_LOGIN] Admin login attempt with email: ${email}`);

    // Tìm user qua UsersService (hoặc UsersRepository nếu inject trực tiếp)
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.warn(`❌ [ADMIN_LOGIN] No user found with email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== UserRole.ADMIN) {
      this.logger.warn(`🚫 [ADMIN_LOGIN] User ${user.username} is not an admin`);
      throw new UnauthorizedException('Not allowed');
    }

    if (!user.is_active) {
      this.logger.warn(`🚫 [ADMIN_LOGIN] User ${user.username} is inactive`);
      throw new UnauthorizedException('Account is inactive');
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      this.logger.warn(`❌ [ADMIN_LOGIN] Invalid password for admin ${user.username}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.user_id,
      role: user.role,
      username: user.username,
      email: user.email,
    };

    const access_token = await this.jwt.signAsync(payload);

    this.logger.log(`✅ [ADMIN_LOGIN] Admin login successful for ${user.username}`);

    return {
      access_token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
