import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateBudgetDto {
    @IsNumber()
    @IsNotEmpty()
    mes: number;

    @IsNumber()
    @IsNotEmpty()
    ano: number;

    @IsNumber()
    @IsNotEmpty()
    receitaMeta: number;

    @IsNumber()
    @IsNotEmpty()
    despesaMeta: number;
}
