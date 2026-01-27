import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { CreditsBalancesResponseDto, CreditTransactionDto } from './dto';

@ApiTags('Credits')
@Controller('credits')
@UseGuards(AuthGuard('jwt'))
export class CreditsController {
  constructor(private creditsService: CreditsService) {}

  @Get('balances')
  @ApiOperation({ summary: 'Get current credit balances' })
  @ApiResponse({ status: 200, type: CreditsBalancesResponseDto })
  async getBalances(@CurrentUser() user: CurrentUserPayload) {
    const balances = await this.creditsService.getBalances(user.id);
    const total = balances.reduce((sum: number, b: { effectiveBalance: number }) => sum + b.effectiveBalance, 0);
    return { balances, total };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get credit transaction history' })
  @ApiResponse({ status: 200, type: [CreditTransactionDto] })
  async getTransactions(@CurrentUser() user: CurrentUserPayload) {
    return this.creditsService.getTransactionHistory(user.id);
  }
}
