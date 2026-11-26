import { IsMoney } from '../../common/validation/is-money.js';

export class UpdateContractedAmountDto {
  @IsMoney()
  contractedAmount: string;
}
