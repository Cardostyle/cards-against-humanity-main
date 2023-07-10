import { inject, injectable } from "inversify";
import Player from "../entities/player";
import PlayerError from "../errors/player-error";
import IGameService from "../models/services/game.service";
import IPlayerService from "../models/services/player.service";
import { TYPES } from "../types";

@injectable()
export default class PlayerService implements IPlayerService {
    @inject(TYPES.GameService)
    private games: IGameService;

    private nextId: number = 0;
    private players: Map<number, Player> = new Map();

    getAll() {
        return Array.from(this.players.values());
    }

    create(name: string) {
        const player = new Player();
        player.name = name;
        player.id = this.nextId++;

        this.players.set(player.id, player);

        return player;
    }

    get(id: number) {
        if (this.players.has(id)) return this.players.get(id);
    }

    delete(id: number) {
        if (this.games.isPlayerInGame(this.get(id)))
            throw new PlayerError("player is still part of a running game");

        this.players.delete(id);
    }
}
