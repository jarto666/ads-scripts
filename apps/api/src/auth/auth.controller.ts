import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiResponse, ApiOperation } from "@nestjs/swagger";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import {
  RequestMagicLinkDto,
  ConsumeMagicLinkDto,
  AuthResponseDto,
  MessageDto,
  UserDto,
} from "./dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("request-link")
  @ApiOperation({ summary: "Request a magic link for authentication" })
  @ApiResponse({ status: 201, type: MessageDto })
  async requestLink(@Body() dto: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(dto.email);
  }

  @Post("consume-link")
  @ApiOperation({ summary: "Consume a magic link token and authenticate" })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async consumeLink(
    @Body() dto: ConsumeMagicLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.consumeMagicLink(dto.token);

    // Set JWT in httpOnly cookie
    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { user: result.user };
  }

  @Post("logout")
  @ApiOperation({ summary: "Logout the current user" })
  @ApiResponse({ status: 201, type: MessageDto })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("access_token");
    return { message: "Logged out successfully" };
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  @ApiOperation({ summary: "Get the current authenticated user" })
  @ApiResponse({ status: 200, type: UserDto })
  async me(@Req() req: Request) {
    const user = req.user as { id: string; email: string };
    return this.authService.getMe(user.id);
  }
}
