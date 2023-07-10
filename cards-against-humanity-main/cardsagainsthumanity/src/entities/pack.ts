import { Expose, Type } from "class-transformer";
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import Card from "./card";

export default class Pack {
    @Expose()
    @IsInt()
    @IsOptional()
    id: number;

    @Expose()
    @IsString()
    @IsNotEmpty()
    name: string;

    @Expose()
    @Type(() => Card)
    @ValidateNested()
    black: Card[];

    @Expose()
    @Type(() => Card)
    @ValidateNested()
    white: Card[];

    @Expose()
    @IsBoolean()
    @IsNotEmpty()
    official: boolean;
}
