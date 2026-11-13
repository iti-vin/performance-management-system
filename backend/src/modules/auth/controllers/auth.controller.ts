import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "../services/auth.service.js";
import { AccountRegistrationService } from "../services/account-registration.service.js";
import { LoginDto } from "../dtos/login.dto.js";
import { SignUpDto } from "../dtos/sign-up.dto.js";
import { RegisterDto } from "../dtos/register.dto.js";
import { RefreshTokenDto } from "../dtos/refresh-token.dto.js";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard.js";
import { AuthResponseDto } from "../dtos/auth-response.dto.js";
import { CurrentUserResponseDto } from "../dtos/current-user-response.dto.js";
import { TokenResponseDto } from "../dtos/token-response.dto.js";
import { ApiErrorNotFoundResponse, ApiErrorResponseDto } from "../../../common/dtos/api-response.dto.js";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly registration: AccountRegistrationService,
  ) {}

  @Post("sign-up")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "create a new user account" })
  @ApiOkResponse({ description: "Success", type: AuthResponseDto })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  async signUp(@Body() dto: SignUpDto) {
    return this.registration.signUp(dto.employeeCode, dto.username, dto.password, dto.confirmPassword);
  }

  @Post("register")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "register a new user connected to the hrdotnet" })
  @ApiOkResponse({ description: "Success", type: AuthResponseDto })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: "Employee or HRDotNet user not found", type: ApiErrorNotFoundResponse })
  async register(@Body() dto: RegisterDto) {
    return this.registration.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "authenticate with email or username and password" })
  @ApiOkResponse({ description: "Success", type: TokenResponseDto })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    try {
      return await this.auth.login(dto.identifier, dto.password);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.warn({ event: "login_rejected", peerIp: request.socket.remoteAddress });
      }
      throw error;
    }
  }

  @Post("refresh-token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "submit a valid access token to get a new one with longer expiry" })
  @ApiOkResponse({ description: "Success", type: TokenResponseDto })
  @ApiBadRequestResponse({ description: "Bad Request", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshToken(dto.accessToken);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current authenticated user" })
  @ApiOkResponse({ description: "Success", type: CurrentUserResponseDto })
  @ApiUnauthorizedResponse({ description: "Unauthorized", type: ApiErrorResponseDto })
  async me(@Req() req: Request) {
    const { userId } = (req as unknown as { user: { userId: string } }).user;
    return this.auth.getCurrentUser(userId);
  }
}
