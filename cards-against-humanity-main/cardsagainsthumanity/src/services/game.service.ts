import arrayEqual from "array-equal";
import { inject, injectable } from "inversify";
import shuffle from "shuffle-array";
import Card from "../entities/card";
import Game from "../entities/game";
import GameState from "../entities/game-state";
import Pack from "../entities/pack";
import Player from "../entities/player";
import GameError from "../errors/game-error";
import ICardsService from "../models/services/cards.service";
import IGameService from "../models/services/game.service";
import { TYPES } from "../types";

@injectable()
export default class GameService implements IGameService {
    @inject(TYPES.CardsService)
    private cards: ICardsService;

    private nextId: number = 0;
    private games: Map<number, Game> = new Map();

    getAll() {
        return Array.from(this.games.values());
    }

    isPlayerInGame(player: Player, game?: Game) {
        let games: Game[];

        if (game !== undefined) games = [game];
        else games = this.getAll();

        for (const g of games) {
            if (g.players.includes(player) && g.running) return true;
        }
        return false;
    }

    create(owner: Player, packs?: Pack[], goal?: number) {
        const game = new Game();
        game.id = this.nextId++;
        game.owner = owner;
        game.players = [];
        game.state = new GameState();
        game.goal = goal !== undefined ? goal : 10;

        if (packs === undefined) game.packs = this.cards.getAllPacks();
        else game.packs = packs;

        let blackCardCount: number = 0;

        game.packs.forEach((pack) => {
            blackCardCount += pack.black.length;
        });

        if (blackCardCount === 0)
            throw new GameError(
                `there are no black cards within the selected pack(s)`
            );

        this.join(game, owner);

        this.games.set(game.id, game);

        return game;
    }

    delete(id: number) {
        if (!this.games.has(id))
            throw new GameError(`game with id ${id} not found`);

        const game: Game = this.games.get(id);

        if (game.running) throw new GameError(`game ${id} is still running`);

        this.games.delete(id);
    }

    join(game: Game, player: Player) {
        if (game.running)
            throw new GameError(`game ${game.id} is already running`);

        if (game.players.includes(player))
            throw new GameError(
                `player ${player.id} is already part of game ${game.id}`
            );

        let whiteCardCount: number = 0;

        game.packs.forEach((pack) => {
            whiteCardCount += pack.white.length;
        });

        if (whiteCardCount < (game.players.length + 1) * 10)
            throw new GameError(
                `the selected pack(s) don't provide enough white cards (${whiteCardCount}) for so many players (${
                    game.players.length + 1
                })`
            );

        game.players.push(player);
    }

    leave(game: Game, player: Player) {
        if (!game.players.includes(player))
            throw new GameError(
                `player ${player.id} is not part of game ${game.id}`
            );

        this.end(game);

        game.players.splice(game.players.indexOf(player), 1);

        if (game.players.length === 0) this.delete(game.id);
        else if (game.owner === player) game.owner = game.players[0];
    }

    end(game: Game, winner?: Player) {
        game.running = false;

        game.state = new GameState();

        if (winner) game.winner = winner;
    }

    get(id: number) {
        return this.games.get(id);
    }

    start(game: Game) {
        if (game.running)
            throw new GameError(`game ${game.id} is already running`);

        game.running = true;

        game.state.playerPool = shuffle(game.players, {
            copy: true,
        });
        game.state.points = Array.from(
            {
                length: game.players.length,
            },
            () => 0
        );

        this.nextTurn(game);
    }

    nextTurn(game: Game) {
        const winner: Player =
            game.players[game.state.points.indexOf(game.goal)];

        if (winner !== undefined) {
            game.winner = winner;
            this.end(game);
            return;
        }

        game.state.czar = game.state.playerPool.shift();
        game.state.playerPool.push(game.state.czar);
        game.state.waitingForPlayers = game.state.playerPool.length - 1;
        game.state.offers = Array.from(
            {
                length: game.players.length,
            },
            () => []
        );

        if (
            game.state.blackCards === undefined ||
            game.state.blackCards.length === 0
        ) {
            game.state.blackCards = [];

            game.packs.forEach((pack) => {
                game.state.blackCards = game.state.blackCards.concat(
                    pack.black
                );
            });

            shuffle(game.state.blackCards);
        }

        game.state.currentBlackCard = game.state.blackCards.shift();

        this.updateHands(game);
    }

    // refills the hands of every player
    updateHands(game: Game) {
        if (game.state.cards === undefined) game.state.cards = [];

        for (let i = 0; i < game.players.length; i++) {
            if (game.state.cards[i] === undefined) game.state.cards[i] = [];

            if (
                game.state.whiteCards === undefined ||
                game.state.whiteCards.length < 10 - game.state.cards[i].length
            ) {
                // we need to restack the white cards pile
                game.state.whiteCards = [];
                game.packs.forEach((pack) => {
                    game.state.whiteCards = game.state.whiteCards.concat(
                        pack.white
                    );
                });

                // remove all cards which are already in play
                game.state.cards.forEach((cards) => {
                    cards.forEach((card) => {
                        game.state.whiteCards.splice(
                            game.state.whiteCards.indexOf(card),
                            1
                        );
                    });
                });
            }

            while (game.state.cards[i].length < 10)
                game.state.cards[i].push(game.state.whiteCards.pop());
        }
    }

    getWhiteCards(game: Game, player: Player) {
        if (!this.isPlayerInGame(player, game))
            throw new GameError(
                `player ${player.id} is currently not in game ${game.id}`
            );

        if (!game.running)
            throw new GameError("the game must be running in order to do this");

        return game.state.cards[game.players.indexOf(player)];
    }

    offer(game: Game, player: Player, cards: Card[]) {
        let playerIndex: number;

        if (!this.isPlayerInGame(player, game))
            throw new GameError(
                `player ${player.id} is not part of game ${game.id}`
            );

        if (!game.running)
            throw new GameError("the game must be running in order to do this");

        playerIndex = game.players.indexOf(player);

        if (game.state.offers[playerIndex].length > 0)
            throw new GameError(`this player already sent an offer`);

        if (game.state.czar === player)
            throw new GameError(`the czar cannot send an offer`);

        if (cards.length !== game.state.currentBlackCard.pick)
            throw new GameError(
                `${game.state.currentBlackCard.pick} cards need to be offered`
            );

        game.state.offers[playerIndex] = cards;

        game.state.offers[playerIndex].sort((a, b) => a.id - b.id);

        for (const card of cards)
            game.state.cards[playerIndex].splice(
                game.state.cards[playerIndex].indexOf(card),
                1
            );

        game.state.waitingForPlayers -= 1;
    }

    getOffers(game: Game, player: Player) {
        if (!this.isPlayerInGame(player, game)) return [];

        if (!game.running)
            throw new GameError("the game must be running in order to do this");

        return game.state.waitingForPlayers === 0
            ? shuffle(
                  game.state.offers.filter(
                      (offer: Card[], i: number) => i !== game.state.czar.id
                  ),
                  {
                      copy: true,
                  }
              )
            : [game.state.offers[game.players.indexOf(player)]];
    }

    acceptOffer(game: Game, player: Player, cards: Card[]) {
        if (!this.isPlayerInGame(player, game))
            throw new GameError(
                `player ${player.id} is not part of the game ${game.id}`
            );

        if (game.state.czar !== player)
            throw new GameError(`only the czar can accept an offer`);

        if (!game.running)
            throw new GameError("the game must be running in order to do this");

        cards.sort((a, b) => a.id - b.id);

        const playerIndex: number = game.state.offers.findIndex((c) =>
            arrayEqual(c, cards)
        );

        if (playerIndex === -1)
            throw new GameError("a player with those cards could not be found");

        game.state.points[playerIndex] += 1;

        this.nextTurn(game);
    }
}
