import { transformAndValidate } from "class-transformer-validator";
import { inject, injectable } from "inversify";
import jsonfile from "jsonfile";
import Card from "../entities/card";
import Pack from "../entities/pack";
import ICardsService from "../models/services/cards.service";
import { TYPES } from "../types";

@injectable()
export default class CardsService implements ICardsService {
    @inject(TYPES.CardsFile)
    private cardsFile: string;

    private cards: Map<number, Card> = new Map();
    private packs: Pack[] = [];

    async readCards() {
        let id = 0;

        try {
            const data = await jsonfile.readFile(this.cardsFile);

            const packs = await transformAndValidate(Pack, data as object[]);

            packs.forEach((pack, i) => {
                pack.id = i;
                pack.white.forEach((card) => {
                    card.id = id++;
                    this.cards.set(card.id, card);
                });
                pack.black.forEach((card) => {
                    card.id = id++;
                    this.cards.set(card.id, card);
                });
            });

            this.packs = packs;
        } catch (error) {
            if (Array.isArray(error)) {
                // validation issues

                console.log(
                    `error reading ${this.cardsFile}: ` +
                        error.map((c) => c.toString()).join("\n")
                );
            }
        }

        return id;
    }

    getAllPacks() {
        return this.packs;
    }

    getPack(id: number) {
        return this.packs[id];
    }

    getCard(id: number) {
        return this.cards.get(id);
    }
}
