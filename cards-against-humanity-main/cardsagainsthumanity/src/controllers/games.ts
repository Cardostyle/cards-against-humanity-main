import { classToPlain } from "class-transformer";
import { Request, Response } from "express";
import { inject } from "inversify";
import {
    controller,
    httpDelete,
    httpGet,
    httpPatch,
    httpPost,
    httpPut,
    interfaces,
    request,
    requestParam,
    response,
} from "inversify-express-utils";
import Card from "../entities/card";
import Game from "../entities/game";
import Pack from "../entities/pack";
import Player from "../entities/player";
import APIError from "../errors/api-error";
import GameError from "../errors/game-error";
import ICardsService from "../models/services/cards.service";
import IGameService from "../models/services/game.service";
import IPlayerService from "../models/services/player.service";
import { TYPES } from "../types";

@controller("/games")
export class GamesController implements interfaces.Controller {
    @inject(TYPES.PlayerService)
    private players: IPlayerService;

    @inject(TYPES.GameService)
    private games: IGameService;

    @inject(TYPES.CardsService)
    private cards: ICardsService;

    @httpGet("/")
    private async getAll(@response() res: Response) {
        res.json({
            games: classToPlain(await this.games.getAll()),
        });
    }

    @httpPost("/")
    private async create(@request() req: Request, @response() res: Response) {
        try {
            if (req.body.owner === undefined)
                throw new APIError("no owner specified");

            const owner: Player = this.players.get(req.body.owner);

            if (owner === undefined)
                throw new APIError(
                    `player with id ${req.body.owner} not found`,
                    404
                );

            if (req.body.packs !== undefined && !Array.isArray(req.body.packs))
                throw new APIError("packs needs to be an array if specified");

            if (
                req.body.goal !== undefined &&
                (typeof req.body.goal !== "number" || isNaN(req.body.goal))
            )
                throw new APIError("goal needs to be a valid number");

            const packs: Pack[] = req.body.packs
                ?.filter((id: any) => !isNaN(id))
                .map((id: number) => this.cards.getPack(id))
                .filter((pack: Pack) => pack !== undefined);

            const game: Game = this.games.create(owner, packs, req.body.goal);

            res.status(201).json(classToPlain(game));
        } catch (error) {
            if (error instanceof GameError)
                res.status(400).json({
                    error: error.message,
                });
            else if (error instanceof APIError)
                res.status(error.statusCode).json({
                    error: error.message,
                });
            else throw error;
        }
    }

    @httpDelete("/:gameId")
    private async delete(
        @requestParam("gameId") gameId: string,
        @response() res: Response
    ) {
        try {
            this.games.delete(parseInt(gameId, 10));
            res.sendStatus(200);
        } catch (error) {
            if (error instanceof GameError)
                res.status(400).json({
                    error: error.message,
                });
            else throw error;
        }
    }

    @httpPatch("/:gameId/:playerId")
    private async joinOrLeave(
        @requestParam("gameId") gameId: string,
        @requestParam("playerId") playerId: string,
        @request() req: Request,
        @response() res: Response
    ) {
        try {
            const player: Player = this.players.get(parseInt(playerId, 10));

            if (player === undefined)
                throw new APIError(`player ${playerId} not found`);

            const game: Game = this.games.get(parseInt(gameId, 10));

            if (game === undefined)
                throw new APIError(`game ${gameId} not found`, 404);

            const action: string = req.body.action;

            if (typeof action !== "string")
                throw new APIError("action must be of type string");

            switch (action) {
                case "leave": {
                    this.games.leave(game, player);
                    break;
                }
                case "join": {
                    this.games.join(game, player);
                    break;
                }
                case "start": {
                    if (game.owner !== player)
                        throw new APIError("only the owner can start a game");

                    this.games.start(game);
                    break;
                }
                case "end": {
                    if (game.owner !== player)
                        throw new APIError("only the owner can end a game");

                    this.games.end(game);
                    break;
                }
                default: {
                    throw new APIError(`unknown action ${action}`);
                }
            }

            if (!this.games.get(parseInt(gameId, 10))) res.status(200).json({});
            else res.status(200).json(classToPlain(game));
        } catch (error) {
            if (error instanceof GameError)
                res.status(400).json({
                    error: error.message,
                });
            else if (error instanceof APIError)
                res.status(error.statusCode).json({
                    error: error.message,
                });
            else throw error;
        }
    }

    @httpGet("/:gameId/")
    private getState(
        @requestParam("gameId") gameId: string,
        @response() res: Response
    ) {
        try {
            const game: Game = this.games.get(parseInt(gameId, 10));

            if (game === undefined)
                throw new APIError(`game with id ${gameId} not found`, 404);

            if (!game.running)
                throw new APIError(`game ${gameId} is not running`);

            res.status(200).json(classToPlain(game.state));
        } catch (error) {
            if (error instanceof APIError)
                res.status(error.statusCode).json({
                    error: error.message,
                });
            else throw error;
        }
    }

    @httpGet("/:gameId/cards/:playerId")
    private getWhiteCards(
        @requestParam("gameId") gameId: string,
        @requestParam("playerId") playerId: string,
        @response() res: Response
    ) {
        try {
            const player: Player = this.players.get(parseInt(playerId, 10));

            if (player === undefined)
                throw new APIError(`player ${playerId} not found`);

            const game: Game = this.games.get(parseInt(gameId, 10));

            if (game === undefined)
                throw new APIError(`game ${gameId} not found`, 404);

            res.status(200).json({
                cards: classToPlain(this.games.getWhiteCards(game, player)),
            });
        } catch (error) {
            if (error instanceof GameError)
                res.status(400).json({
                    error: error.message,
                });
            else if (error instanceof APIError)
                res.status(error.statusCode).json({
                    error: error.message,
                });
            else throw error;
        }
    }

    @httpPut("/:gameId/cards/:playerId")
    private setOffer(
        @requestParam("gameId") gameId: string,
        @requestParam("playerId") playerId: string,
        @request() req: Request,
        @response() res: Response
    ) {
        try {
            const player: Player = this.players.get(parseInt(playerId, 10));

            if (player === undefined)
                throw new APIError(`player ${playerId} not found`);

            const game: Game = this.games.get(parseInt(gameId, 10));

            if (game === undefined)
                throw new APIError(`game ${gameId} not found`, 404);

            if (req.body.cards === undefined)
                throw new APIError(`no white cards given`);

            const cards: Card[] = req.body.cards
                ?.filter((id: any) => !isNaN(id))
                .map((id: number) => this.cards.getCard(id));

            this.games.offer(game, player, cards);

            res.sendStatus(200);
        } catch (error) {
            if (error instanceof GameError)
                res.status(400).json({
                    error: error.message,
                });
            else if (error instanceof APIError)
                res.status(error.statusCode).json({
                    error: error.message,
                });
            else throw error;
        }
    }

    @httpGet("/:gameId/offers/:playerId")
    private getOffers(
        @requestParam("gameId") gameId: string,
        @requestParam("playerId") playerId: string,
        @response() res: Response
    ) {
        try {
            const player: Player = this.players.get(parseInt(playerId, 10));

            if (player === undefined)
                throw new APIError(`player ${playerId} not found`);

            const game: Game = this.games.get(parseInt(gameId, 10));

            if (game === undefined)
                throw new APIError(`game ${gameId} not found`, 404);

            res.status(200).json({
                offers: classToPlain(this.games.getOffers(game, player)),
            });
        } catch (error) {
            if (error instanceof GameError)
                res.status(400).json({
                    error: error.message,
                });
            else if (error instanceof APIError)
                res.status(error.statusCode).json({
                    error: error.message,
                });
            else throw error;
        }
    }

    @httpPut("/:gameId/offers/:playerId")
    private acceptOffer(
        @requestParam("gameId") gameId: string,
        @requestParam("playerId") playerId: string,
        @request() req: Request,
        @response() res: Response
    ) {
        try {
            const player: Player = this.players.get(parseInt(playerId, 10));

            if (player === undefined)
                throw new APIError(`player ${playerId} not found`);

            const game: Game = this.games.get(parseInt(gameId, 10));

            if (game === undefined)
                throw new APIError(`game ${gameId} not found`, 404);

            if (req.body.cards === undefined)
                throw new APIError(`no white cards given`);

            const cards: Card[] = req.body.cards
                ?.filter((id: any) => !isNaN(id))
                .map((id: number) => this.cards.getCard(id));

            this.games.acceptOffer(game, player, cards);

            res.sendStatus(200);
        } catch (error) {
            if (error instanceof GameError)
                res.status(400).json({
                    error: error.message,
                });
            else if (error instanceof APIError)
                res.status(error.statusCode).json({
                    error: error.message,
                });
            else throw error;
        }
    }
}
