import { classToPlain } from "class-transformer";
import { Response } from "express";
import { inject } from "inversify";
import {
    controller,
    httpGet,
    interfaces,
    requestParam,
    response,
} from "inversify-express-utils";
import ICardsService from "../models/services/cards.service";
import { TYPES } from "../types";

@controller("/packs")
export class CardsController implements interfaces.Controller {
    @inject(TYPES.CardsService)
    private cards: ICardsService;

    @httpGet("/")
    private getAll(@response() res: Response) {
        res.status(200).json({
            packs: this.cards.getAllPacks().map((pack) => ({
                id: pack.id,
                name: pack.name,
                blackCardCount: pack.black.length,
                whiteCardCount: pack.white.length,
            })),
        });
    }

    @httpGet("/:packId")
    private get(
        @requestParam("packId") packId: string,
        @response() res: Response
    ) {
        const packs = this.cards.getAllPacks();

        const pack = packs[parseInt(packId, 10)];

        if (!pack) {
            res.status(404).json({
                error: `invalid pack id ${packId}`,
            });
            return;
        }

        res.status(200).json(classToPlain(packs[parseInt(packId, 10)]));
    }
}
