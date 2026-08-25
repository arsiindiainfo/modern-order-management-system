import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiOkArrayEnvelope,
  ApiOkEnvelope,
  ApiOkPaginatedEnvelope,
} from '../../common/decorators/api-ok-envelope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import type { AuthUser } from '../../common/types/auth-user.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { HoldOrderDto } from './dto/hold-order.dto';
import { OrderDetailResponseDto } from './dto/order-detail-response.dto';
import { OrderHistoryEntryResponseDto } from './dto/order-history-entry-response.dto';
import { OrderListItemResponseDto } from './dto/order-list-item-response.dto';
import { OrderStatusActionDto } from './dto/order-status-action.dto';
import { OrderSummaryResponseDto } from './dto/order-summary-response.dto';
import { PaymentResultResponseDto } from './dto/payment-result-response.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RecordShipmentDto } from './dto/record-shipment.dto';
import { ShipmentResultResponseDto } from './dto/shipment-result-response.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import type { OrdersListQuery } from './orders.repository';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard, TenantScopeGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOkPaginatedEnvelope(OrderListItemResponseDto)
  list(
    @TenantId() tenantId: string,
    @Query(ParsePaginationPipe) query: OrdersListQuery,
  ) {
    return this.ordersService.list(tenantId, query);
  }

  @Get(':id')
  @ApiOkEnvelope(OrderDetailResponseDto)
  getById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ordersService.getById(tenantId, id);
  }

  @Post(':id/payment')
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(PaymentResultResponseDto)
  recordPayment(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.ordersService.recordPayment(tenantId, user.userId, id, dto);
  }

  @Post(':id/ship')
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(ShipmentResultResponseDto)
  recordShipment(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RecordShipmentDto,
  ) {
    return this.ordersService.recordShipment(tenantId, user.userId, id, dto);
  }

  @Get(':id/history')
  @ApiOkArrayEnvelope(OrderHistoryEntryResponseDto)
  getHistory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ordersService.getHistory(tenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkEnvelope(OrderSummaryResponseDto)
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(tenantId, user.userId, dto);
  }

  @Put(':id')
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(OrderSummaryResponseDto)
  update(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(tenantId, user.userId, id, dto);
  }

  @Post(':id/hold')
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(OrderSummaryResponseDto)
  hold(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: HoldOrderDto,
  ) {
    return this.ordersService.hold(tenantId, user.userId, id, dto);
  }

  @Post(':id/resume')
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(OrderSummaryResponseDto)
  resume(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: OrderStatusActionDto,
  ) {
    return this.ordersService.resume(tenantId, user.userId, id, dto);
  }

  @Post(':id/cancel')
  @Roles('TENANT_ADMIN', 'MANAGER')
  @ApiOkEnvelope(OrderSummaryResponseDto)
  cancel(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: OrderStatusActionDto,
  ) {
    return this.ordersService.cancel(tenantId, user.userId, id, dto);
  }
}
