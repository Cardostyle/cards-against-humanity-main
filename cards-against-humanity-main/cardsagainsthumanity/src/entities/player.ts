import { Expose } from "class-transformer";
import { IsInt, IsString } from "class-validator";

export default class Player {
    @Expose()
    @IsInt()
    id: number;

    @Expose()
    @IsString()
    name: string;
}
