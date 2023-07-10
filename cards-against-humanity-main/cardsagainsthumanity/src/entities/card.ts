import { Expose } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export default class Card {
    @Expose()
    @IsOptional()
    @IsInt()
    id: number;

    @Expose()
    @IsString()
    @IsNotEmpty()
    text: string;

    @Expose()
    @IsInt()
    @IsNotEmpty()
    pack: number;

    @Expose()
    @IsOptional()
    @IsInt()
    pick: number;
}
