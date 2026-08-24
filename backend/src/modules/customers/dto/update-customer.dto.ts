import { CreateCustomerDto } from './create-customer.dto';

/** PUT is a full replace, same shape as create (§11.3). */
export class UpdateCustomerDto extends CreateCustomerDto {}
