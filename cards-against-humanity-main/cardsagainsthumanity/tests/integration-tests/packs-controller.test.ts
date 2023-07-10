import { classToPlain } from "class-transformer";
import { Container } from "inversify";
import random from "random";
import "reflect-metadata";
import { bindings } from "../../src/inversify.config";
import ICardsService from "../../src/models/services/cards.service";
import createServer from "../../src/server";
import { TYPES } from "../../src/types";

const request = require("supertest");

describe("packs controller tests", () => {
    let container: Container;

    beforeEach(async () => {
        container = new Container();

        await container.loadAsync(bindings);

        await container.get<ICardsService>(TYPES.CardsService).readCards();
    });

    afterEach(() => {
        container = null;
    });

    it("should return an overview over all packs", async () => {
        const cardsService = container.get<ICardsService>(TYPES.CardsService);

        const packs = cardsService.getAllPacks();

        const res = await request(createServer(container))
            .get("/packs/")
            .send();

        expect(res.statusCode).toEqual(200);
        expect(res.body.packs).toHaveLength(packs.length);
    });

    it("should return a specific pack", async () => {
        const cardsService = container.get<ICardsService>(TYPES.CardsService);

        const packs = cardsService.getAllPacks();
        const amountOfPacks = packs.length;
        const targetPack: number = random.int(0, amountOfPacks);

        const res = await request(createServer(container))
            .get(`/packs/${targetPack}`)
            .send();

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(classToPlain(packs[targetPack]));
    });

    it("should throw an error if pack number out of range is specified", async () => {
        const cardsService = container.get<ICardsService>(TYPES.CardsService);

        const packs = cardsService.getAllPacks();
        const amountOfPacks = packs.length;

        const res = await request(createServer(container))
            .get(`/packs/${amountOfPacks}`)
            .send();

        expect(res.statusCode).toEqual(404);
    });
});
