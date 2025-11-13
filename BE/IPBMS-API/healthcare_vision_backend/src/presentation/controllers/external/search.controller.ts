import {
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { SearchService } from '../../../application/services/search.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { getUserIdFromReq } from '../../../shared/utils/auth.util';

export interface UnifiedSearchQuery {
  q?: string;
  type?: 'events' | 'caregivers' | 'invoices' | 'all';
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  confidenceMin?: number;
  page?: number;
  limit?: number;
}

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'customer', 'caregiver')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  @Get('unified')
  @ApiOperation({ summary: 'Unified search across events, caregivers, and invoices' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['events', 'caregivers', 'invoices', 'all'] })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async unifiedSearch(@Query() query: UnifiedSearchQuery, @Req() req: any) {
    const userId = getUserIdFromReq(req);
    const userRole = req.user?.role;

    const filters = {
      keyword: query.q,
      type: query.type || 'all',
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      status: query.status,
      confidenceMin: query.confidenceMin,
      page: query.page || 1,
      limit: query.limit || 20,
      userId: userRole === 'customer' ? userId : undefined, // Customers can only see their own data
    };

    this.logger.debug(`Unified search: ${JSON.stringify(filters)}`);

    const result = await this.searchService.search(filters);

    // TODO: Implement search_history table in schema
    // Save search history
    // if (userId && result.total > 0) {
    //   await this.searchService.saveSearchHistory(userId, filters, result.total);
    // }

    return {
      success: true,
      data: result,
    };
  }

  // TODO: Implement search_history table in schema
  // @Get('history')
  // @ApiOperation({ summary: 'Get search history' })
  // @ApiResponse({ status: 200, description: 'Search history' })
  // @ApiQuery({ name: 'limit', required: false, type: Number })
  // async getSearchHistory(@Req() req: any, @Query('limit') limit?: string) {
  //   const userId = req.user?.userId;
  //   const limitNum = limit ? parseInt(limit, 10) : 10;

  //   const history = await this.searchService.getSearchHistory(userId, limitNum);

  //   return {
  //     success: true,
  //     data: history,
  //   };
  // }

  // @Post('history/clear')
  // @ApiOperation({ summary: 'Clear search history' })
  // @ApiResponse({ status: 200, description: 'Search history cleared' })
  // async clearSearchHistory(@Req() req: any) {
  //   const userId = req.user?.userId;

  //   await this.searchService.clearSearchHistory(userId);

  //   return {
  //     success: true,
  //     message: 'Search history cleared successfully',
  //   };
  // }

  @Post('quick-action/:action/:entityId')
  @ApiOperation({ summary: 'Perform quick action on search result' })
  @ApiResponse({ status: 200, description: 'Action performed successfully' })
  async performQuickAction(
    @Param('action') action: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Req() req: any,
  ) {
    const userId = getUserIdFromReq(req);
    const userRole = req.user?.role;

    let success = false;

    switch (action) {
      case 'mark-processed':
        if (userRole === 'admin' || userRole === 'customer') {
          await this.searchService.markEventAsProcessed(entityId, userId);
          success = true;
        }
        break;

      case 'pay-invoice':
        if (userRole === 'customer') {
          const paymentUrl = await this.searchService.getInvoicePaymentUrl(entityId, userId);
          return {
            success: true,
            data: { paymentUrl },
          };
        }
        break;

      case 'view-details':
        success = true; // This is just navigation, always allowed
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      success,
      message: success ? 'Action performed successfully' : 'Action not allowed',
    };
  }
}
