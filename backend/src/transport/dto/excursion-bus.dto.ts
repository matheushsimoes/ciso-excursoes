import { IsUUID } from 'class-validator';
import { IsQuantity } from '../../common/validation/is-quantity.js';

export class AddExcursionBusDto {
  @IsUUID()
  busTypeId: string;

  @IsQuantity(50)
  quantity: number;
}

export class UpdateExcursionBusDto {
  @IsQuantity(50)
  quantity: number;
}
