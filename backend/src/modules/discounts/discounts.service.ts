import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import {
  PaginatedResult,
  toPaginatedResult,
} from '../../common/database/paginated-result.util';
import { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { DiscountResponseDto } from './dto/discount-response.dto';
import { DiscountValidationResponseDto } from './dto/discount-validation-response.dto';
import {
  DiscountListRow,
  DiscountRow,
  DiscountsRepository,
} from './discounts.repository';

@Injectable()
export class DiscountsService {
  constructor(private readonly discountsRepository: DiscountsRepository) {}

  async list(
    tenantId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResult<DiscountResponseDto>> {
    const rows = await this.discountsRepository.list(tenantId, query);
    const result = toPaginatedResult<DiscountListRow>(
      rows,
      query.page,
      query.pageSize,
    );
    return { ...result, data: result.data.map(toDiscountResponseDto) };
  }

  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreateDiscountDto,
  ): Promise<DiscountResponseDto> {
    const row = await this.discountsRepository.create(
      tenantId,
      actorUserId,
      dto,
    );
    return toDiscountResponseDto(row);
  }

  async validate(
    tenantId: string,
    code: string,
    subtotal: number,
  ): Promise<DiscountValidationResponseDto> {
    const row = await this.discountsRepository.validate(
      tenantId,
      code,
      subtotal,
    );
    if (!row) {
      throw new AppException(
        'DISCOUNT_NOT_APPLICABLE',
        `Discount code ${code} cannot be applied.`,
      );
    }
    return {
      code: row.Code,
      type: row.Type,
      value: Number(row.Value),
      discountAmount: Number(row.DiscountAmount),
    };
  }
}

function toDiscountResponseDto(row: DiscountRow): DiscountResponseDto {
  return {
    id: row.Id,
    code: row.Code,
    type: row.Type,
    value: Number(row.Value),
    startsAt: row.StartsAt,
    endsAt: row.EndsAt,
    usageLimit: row.UsageLimit,
    timesUsed: row.TimesUsed,
    isActive: row.IsActive,
  };
}
