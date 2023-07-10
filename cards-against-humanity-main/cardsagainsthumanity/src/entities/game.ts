import { Exclude, Expose, Transform, Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsInt,
    IsOptional,
    ValidateNested,
} from "class-validator";
import GameState from "./game-state";
import Pack from "./pack";
import Player from "./player";

@Exclude()
export default class Game {
    @Expose()
    @IsInt()
    id: number;

    @Expose()
    @IsArray()
    @Type(() => Player)
    @ValidateNested()
    players: Player[];

    @Expose()
    @IsOptional()
    @ValidateNested()
    winner: Player;

    @Expose()
    @ValidateNested()
    owner: Player;

    @Expose()
    @IsBoolean()
    running: boolean = false;

    @Expose()
    @IsArray()
    @IsOptional()
    @Type(() => Pack)
    @Transform(({ value }) => value.map((pack: Pack) => pack.id), {
        toPlainOnly: true,
    })
    @ValidateNested()
    packs: Pack[];

    @Expose()
    @IsInt()
    goal: number;

    @Type(() => GameState)
    state: GameState;
}
