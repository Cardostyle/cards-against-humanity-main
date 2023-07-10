import { classToPlain } from "class-transformer";
import { Request, Response } from "express";
import { inject } from "inversify";
import {
    controller,
    httpDelete,
    httpGet,
    httpPost,
    interfaces,
    request,
    requestParam,
    response,
} from "inversify-express-utils";
import Player from "../entities/player";
import PlayerError from "../errors/player-error";
import IPlayerService from "../models/services/player.service";
import { TYPES } from "../types";

@controller("/players")
export class PlayersController implements interfaces.Controller {
    @inject(TYPES.PlayerService)
    private players: IPlayerService;

    @httpGet("/")
    private async getAll(@response() res: Response) {
        res.json({
            players: classToPlain(await this.players.getAll()),
        });
    }

    @httpPost("/")
    private async create(@request() req: Request, @response() res: Response) {
        const player: Player = this.players.create(req.body.name);

        res.status(201).json(classToPlain(player));
    }

    @httpDelete("/:playerId")
    private async delete(
        @requestParam("playerId") playerId: string,
        @response() res: Response
    ) {
        try {
            this.players.delete(parseInt(playerId, 10));
            res.sendStatus(200);
        } catch (error) {
            if (error instanceof PlayerError)
                res.status(400).send({
                    error: error.message,
                });
            else throw error;
        }
    }
}
