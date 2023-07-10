import { Exclude, Expose, Type } from "class-transformer";
import { IsArray, IsInt } from "class-validator";
import Card from "./card";
import Player from "./player";

@Exclude()
export default class GameState {
    @Expose()
    @Type(() => Player)
    czar: Player;

    // stores all white cards while a game is running
    @IsArray()
    @Type(() => Card)
    whiteCards: Card[];

    // stores all black cards while a game is running
    @IsArray()
    @Type(() => Card)
    blackCards: Card[];

    // stores all players in their respective order while a game is running
    @IsArray()
    @Type(() => Player)
    playerPool: Player[];

    // contains the list of white cards for every player
    @IsArray()
    @Type(() => Card)
    cards: Card[][];

    // contains the current black card
    @Expose()
    @Type(() => Card)
    currentBlackCard: Card;

    @Expose()
    @IsInt({
        each: true,
    })
    @IsArray()
    points: number[];

    @Expose()
    @IsInt()
    waitingForPlayers: number;

    @IsArray()
    @Type(() => Card)
    offers: Card[][];
}
