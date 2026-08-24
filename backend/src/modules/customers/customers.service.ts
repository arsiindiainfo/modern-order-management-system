import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import {
  PaginatedResult,
  toPaginatedResult,
} from '../../common/database/paginated-result.util';
import { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';
import {
  CustomerRow,
  CustomerListRow,
  CustomersRepository,
  CustomerWriteInput,
} from './customers.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async list(
    tenantId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResult<CustomerResponseDto>> {
    const rows = await this.customersRepository.list(tenantId, query);
    const result = toPaginatedResult<CustomerListRow>(
      rows,
      query.page,
      query.pageSize,
    );
    return { ...result, data: result.data.map(toCustomerResponseDto) };
  }

  async getById(tenantId: string, id: string): Promise<CustomerResponseDto> {
    const row = await this.customersRepository.getById(tenantId, id);
    if (!row) {
      throw new AppException('RESOURCE_NOT_FOUND', 'Customer not found.');
    }
    return toCustomerResponseDto(row);
  }

  async create(
    tenantId: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const row = await this.customersRepository.create(
      tenantId,
      toWriteInput(dto),
    );
    return toCustomerResponseDto(row);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const row = await this.customersRepository.update(
      tenantId,
      id,
      toWriteInput(dto),
    );
    return toCustomerResponseDto(row);
  }

  async deactivate(tenantId: string, id: string): Promise<void> {
    await this.customersRepository.deactivate(tenantId, id);
  }
}

function toWriteInput(dto: CreateCustomerDto): CustomerWriteInput {
  return {
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    billingAddress: dto.billingAddress,
    shippingAddress: dto.shippingAddress,
  };
}

function toCustomerResponseDto(row: CustomerRow): CustomerResponseDto {
  return {
    id: row.Id,
    name: row.Name,
    email: row.Email,
    phone: row.Phone,
    billingAddress: parseAddress(row.BillingAddress),
    shippingAddress: parseAddress(row.ShippingAddress),
    isActive: row.IsActive,
    createdAt: row.CreatedAt,
  };
}

function parseAddress(
  value: string | null,
): CustomerResponseDto['billingAddress'] {
  if (!value) return null;
  try {
    return JSON.parse(value) as CustomerResponseDto['billingAddress'];
  } catch {
    return null;
  }
}
