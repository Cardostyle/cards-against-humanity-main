import { classToPlain } from "class-transformer";
import { Container } from "inversify";
import "reflect-metadata";
import Player from "../../src/entities/player";
import { bindings } from "../../src/inversify.config";
import IPlayerService from "../../src/models/services/player.service";
import createServer from "../../src/server";
import { TYPES } from "../../src/types";

const request = require("supertest");

describe("players controller tests", () => {
    let container: Container;

    beforeEach(async () => {
        container = new Container();

        await container.loadAsync(bindings);
    });

    afterEach(() => {
        container = null;
    });

    it("should create a new player", async () => {
        let player = new Player();
        player.name = "barth_to";
        player.id = 0;

        let res = await request(createServer(container))
            .post("/players/")
            .send({
                name: "barth_to",
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual(classToPlain(player));

        let players = container.get<IPlayerService>(TYPES.PlayerService);

        expect(players.get(res.body.id)).toEqual(player);
    });

    it("should return all players", async () => {
        let agent = request(createServer(container));

        await agent.post("/players/").send({
            name: "barth_to",
        });

        await agent.post("/players/").send({
            name: "Toni Barth",
        });

        let res = await agent.get("/players/").send();

        expect(res.statusCode).toEqual(200);
        expect(res.body.players).toHaveLength(2);
        expect(res.body.players[0].name).toEqual("barth_to");
        expect(res.body.players[1].name).toEqual("Toni Barth");

        let players = container.get<IPlayerService>(TYPES.PlayerService);

        expect(res.body.players).toEqual(classToPlain(players.getAll()));
    });

    it("should delete a player", async () => {
        let agent = request(createServer(container));

        await agent.post("/players/").send({
            name: "barth_to",
        });

        let players = container.get<IPlayerService>(TYPES.PlayerService);

        expect(players.getAll()).toHaveLength(1);

        let res = await agent.delete("/players/0").send();

        expect(res.statusCode).toEqual(200);
        expect(players.getAll()).toHaveLength(0);
    });
});
