import { IsOptional, IsString } from 'class-validator';
import { PaginationInput } from 'src/common/dtos/pagination.dto';

export class SearchAnalysisInput extends PaginationInput {
    @IsString()
    @IsOptional()
    q?: string;

    @IsString()
    @IsOptional()
    orderby?: string;
}