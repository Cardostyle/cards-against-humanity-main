import Card from "../../entities/card";
import Game from "../../entities/game";
import Pack from "../../entities/pack";
import Player from "../../entities/player";

export default interface IGameService {
    acceptOffer(game: Game, player: Player, cards: Card[]): void;
    create(owner: Player, packs?: Pack[], goal?: number): Game;
    delete(id: number): void;
    end(game: Game, winner?: Player): void;
    get(id: number): Game;
    getAll(): Game[];
    getOffers(game: Game, player: Player): Card[][];
    getWhiteCards(game: Game, player: Player): Card[];
    isPlayerInGame(player: Player, game?: Game): boolean;
    join(game: Game, player: Player): void;
    leave(game: Game, player: Player): void;
    offer(game: Game, player: Player, cards: Card[]): void;
    start(game: Game): void;
}
