import { classToPlain } from "class-transformer";
import { Container } from "inversify";
import "reflect-metadata";
import shuffle from "shuffle-array";
import request from "supertest";
import Card from "../../src/entities/card";
import { bindings } from "../../src/inversify.config";
import ICardsService from "../../src/models/services/cards.service";
import IGameService from "../../src/models/services/game.service";
import createServer from "../../src/server";
import { TYPES } from "../../src/types";

const createPlayer = async (
    agent: request.SuperTest<request.Test>,
    name?: string
): Promise<request.Response> => {
    return await agent.post("/players/").send({
        name: name || "barth_to",
    });
};

const createGame = async (
    agent: request.SuperTest<request.Test>,
    playerName?: string
): Promise<request.Response> => {
    let res = await createPlayer(agent, playerName);
    return await agent.post("/games/").send({
        owner: res.body.id,
    });
};

const createStartedGame = async (
    agent: request.SuperTest<request.Test>,
    playerName1?: string,
    playerName2?: string,
    playerName3?: string
): Promise<request.Response> => {
    let game = await createGame(agent, playerName1);

    let player2 = await createPlayer(agent, playerName2 || "Toni Barth");

    let player3 = await createPlayer(agent, playerName3 || "sttobart");

    await agent.patch(`/games/${game.body.id}/${player2.body.id}`).send({
        action: "join",
    });

    await agent.patch(`/games/${game.body.id}/${player3.body.id}`).send({
        action: "join",
    });

    return await agent.patch(`/games/${game.body.id}/0`).send({
        action: "start",
    });
};

describe("games controller tests", () => {
    let container: Container;

    beforeEach(async () => {
        container = new Container();

        await container.loadAsync(bindings);

        const cards: ICardsService = container.get<ICardsService>(
            TYPES.CardsService
        );

        await cards.readCards();
    });

    afterEach(() => {
        container = null;
    });

    it("should create a new game", async () => {
        let agent = request(createServer(container));

        let res = await createGame(agent, "barth_to");

        expect(res.statusCode).toBe(201);
        expect(res.body.running).toBe(false);
        expect(res.body.players[0].name).toBe("barth_to");
        expect(res.body.owner.name).toBe("barth_to");
    });

    it("should raise an error when creating a game without owner", async () => {
        let agent = request(createServer(container));

        let res = await agent.post("/games/").send();

        expect(res.statusCode).toBe(400);
    });

    it("should raise an error when creating a game with an invalid owner", async () => {
        let res = await request(createServer(container)).post("/games/").send({
            owner: 0,
        });

        expect(res.statusCode).toBe(404);
    });

    it("should create a new game with specific packs", async () => {
        let agent = request(createServer(container));

        await createPlayer(agent);

        let res = await agent.post("/games/").send({
            owner: 0,
            packs: [0, 5, 12],
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.packs).toEqual([0, 5, 12]);
    });

    it("should raise an error when creating a game with non-array packs", async () => {
        let agent = request(createServer(container));

        await createPlayer(agent);

        let res = await agent.post("/games/").send({
            owner: 0,
            packs: "hallo",
        });

        expect(res.statusCode).toBe(400);
    });

    it("should raise an error when creating a game with too few cards for even a single player", async () => {
        let agent = request(createServer(container));

        await createPlayer(agent);

        let res = await agent.post("/games/").send({
            owner: 0,
            packs: [18],
        });

        expect(res.statusCode).toBe(400);
    });

    it("should raise an error when creating a game with 0 black cards", async () => {
        let agent = request(createServer(container));

        await createPlayer(agent);

        let res = await agent.post("/games/").send({
            owner: 0,
            packs: [10],
        });

        expect(res.statusCode).toBe(400);
    });

    it("should create a new game with a different goal", async () => {
        let agent = request(createServer(container));

        await createPlayer(agent);

        let res = await agent.post("/games/").send({
            owner: 0,
            goal: 5,
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.goal).toEqual(5);
    });

    it("should raise an error when creating a game with non-integer goal", async () => {
        let agent = request(createServer(container));

        await createPlayer(agent);

        let res = await agent.post("/games/").send({
            owner: 0,
            goal: "hallo",
        });

        expect(res.statusCode).toBe(400);
    });

    it("should return all games", async () => {
        let agent = request(createServer(container));

        await createGame(agent);

        await createGame(agent);

        let res = await agent.get("/games/").send();

        expect(res.statusCode).toEqual(200);
        expect(res.body.games).toHaveLength(2);

        let games = container.get<IGameService>(TYPES.GameService);

        expect(res.body.games).toEqual(classToPlain(games.getAll()));
    });

    it("should delete a game", async () => {
        let agent = request(createServer(container));

        await createGame(agent);

        let games = container.get<IGameService>(TYPES.GameService);

        expect(games.getAll()).toHaveLength(1);

        let res = await agent.delete("/games/0").send();

        expect(res.statusCode).toEqual(200);
        expect(games.getAll()).toHaveLength(0);
    });

    it("should join a game", async () => {
        let agent = request(createServer(container));

        await createGame(agent);

        await createPlayer(agent, "Toni Barth");

        let res = await agent.patch("/games/0/1").send({
            action: "join",
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.players).toHaveLength(2);
        expect(res.body.owner.name).toEqual("barth_to");
        expect(res.body.players[1].name).toBe("Toni Barth");
    });

    it("should reaise an error if trying to join a game with an invalid player", async () => {
        let agent = request(createServer(container));

        await createGame(agent);

        let res = await agent.patch("/games/0/1").send({
            action: "join",
        });

        expect(res.statusCode).toBe(400);
    });

    it("should reaise an error if trying to join a game with the same player twice", async () => {
        let agent = request(createServer(container));

        await createGame(agent);

        let res = await agent.patch("/games/0/0").send({
            action: "join",
        });

        expect(res.statusCode).toBe(400);
    });

    it("should reaise an error if trying to join a game with to few white cards available", async () => {
        let agent = request(createServer(container));

        await createPlayer(agent);

        await createPlayer(agent, "Toni Barth");

        await agent.post("/games/").send({
            owner: 0,
            packs: [67],
        });

        let res = await agent.patch("/games/0/1").send({
            action: "join",
        });

        expect(res.statusCode).toBe(400);
    });

    it("should leave a game", async () => {
        let agent = request(createServer(container));

        await createGame(agent);

        await createPlayer(agent, "Toni Barth");

        await agent.patch("/games/0/1").send({
            action: "join",
        });

        let res = await agent.patch("/games/0/1").send({
            action: "leave",
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.players).toHaveLength(1);
        expect(res.body.owner.name).toEqual("barth_to");
    });

    it("should reaise an error if trying to leave a game with an invalid player", async () => {
        let agent = request(createServer(container));

        await createGame(agent);

        let res = await agent.patch("/games/0/1").send({
            action: "leave",
        });

        expect(res.statusCode).toBe(400);
    });

    it("should delete a game after the last player left", async () => {
        let agent = request(createServer(container));

        await createGame(agent);

        let res = await agent.patch("/games/0/0").send({
            action: "leave",
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({});

        let games = container.get<IGameService>(TYPES.GameService);

        expect(games.getAll()).toHaveLength(0);
    });

    it("should replace the owner after the previous owner leaves the game", async () => {
        let agent = request(createServer(container));

        await createGame(agent);

        await createPlayer(agent, "Toni Barth");

        await agent.patch("/games/0/1").send({
            action: "join",
        });

        let res = await agent.patch("/games/0/0").send({
            action: "leave",
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.players).toHaveLength(1);
        expect(res.body.owner.name).toEqual("Toni Barth");
    });

    it("should read the game state of a running game", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let res = await agent.get("/games/0").send();

        expect(res.statusCode).toBe(200);
        expect(res.body.points).toEqual([0, 0, 0]);
    });

    it("should raise an error when trying to start a game while not being the owner", async () => {
        let agent = request(createServer(container));

        await createGame(agent);

        await createPlayer(agent, "Toni Barth");

        await createPlayer(agent, "sttobart");

        await agent.patch("/games/0/1").send({
            action: "join",
        });

        await agent.patch("/games/0/2").send({
            action: "join",
        });

        let res = await agent.patch("/games/0/1").send({
            action: "start",
        });

        expect(res.statusCode).toBe(400);
    });

    it("should start a game", async () => {
        let agent = request(createServer(container));

        let res = await createStartedGame(agent);

        expect(res.statusCode).toBe(200);
        expect(res.body.running).toBe(true);
    });

    it("should end a game", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let res = await agent.patch("/games/0/0").send({
            action: "end",
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.running).toBe(false);
    });

    it("should raise an error when trying to end a game whilst not being the owner", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let res = await agent.patch("/games/0/1").send({
            action: "end",
        });

        expect(res.statusCode).toBe(400);
    });

    it("should get 10 white cards after starting a game", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let res = await agent.get("/games/0/cards/0").send();

        expect(res.statusCode).toBe(200);
        expect(res.body.cards.length).toBe(10);
    });

    it("should raise an error when trying to get cards from an invalid game", async () => {
        let agent = request(createServer(container));

        await createPlayer(agent);

        let res = await agent.get("/games/0/cards/0").send();

        expect(res.statusCode).toBe(404);
    });

    it("should raise an error if trying to get cards for a non-existing player", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let res = await agent.get("/games/0/cards/100").send();

        expect(res.statusCode).toBe(400);
    });

    it("should raise an error when trying to get cards for a player not currently in the game", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        await createPlayer(agent, "test_dummy");

        let res = await agent.get("/games/0/cards/3").send();

        expect(res.statusCode).toBe(400);
    });

    it("should raise an error when trying to send an offer while being the czar", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let state = await agent.get("/games/0").send();

        let cards = await agent
            .get(`/games/0/cards/${state.body.czar.id}`)
            .send();

        let res = await agent.put(`/games/0/cards/${state.body.czar.id}`).send({
            cards: cards.body.cards
                .slice(0, state.body.currentBlackCard.pick)
                .map((card: Card) => card.id),
        });

        expect(res.statusCode).toBe(400);
    });

    it("should send an offer", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let state = await agent.get("/games/0").send();

        let player: number = state.body.czar.id !== 0 ? 0 : 1;

        let cards = await agent.get(`/games/0/cards/${player}`).send();

        let res = await agent.put(`/games/0/cards/${player}`).send({
            cards: cards.body.cards
                .slice(0, state.body.currentBlackCard.pick)
                .map((card: Card) => card.id),
        });

        expect(res.statusCode).toBe(200);
    });

    it("should raise an error when trying to send a second offer", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let state = await agent.get("/games/0").send();

        let player: number = state.body.czar.id !== 0 ? 0 : 1;

        let cards = await agent.get(`/games/0/cards/${player}`).send();

        await agent.put(`/games/0/cards/${player}`).send({
            cards: cards.body.cards
                .slice(0, state.body.currentBlackCard.pick)
                .map((card: Card) => card.id),
        });

        let res = await agent.put(`/games/0/cards/${player}`).send({
            cards: cards.body.cards
                .slice(
                    state.body.currentBlackCard.pick,
                    state.body.currentBlackCard.pick
                )
                .map((card: Card) => card.id),
        });

        expect(res.statusCode).toBe(400);
    });

    it("should raise an error when trying to send an offer with an invalid amount of cards", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let state = await agent.get("/games/0").send();

        let player: number = state.body.czar.id !== 0 ? 0 : 1;

        let res = await agent.put(`/games/0/cards/${player}`).send({
            cards: [],
        });

        expect(res.statusCode).toBe(400);
    });

    it("should get players.length - 1 offers after sending valid offers for every player", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let state = await agent.get("/games/0").send();
        let res: request.Response;

        for (let i = 0; i < 3; i++) {
            if (i === state.body.czar.id) continue;

            let cards = await agent.get(`/games/0/cards/${i}`).send();

            res = await agent.put(`/games/0/cards/${i}`).send({
                cards: cards.body.cards
                    .slice(0, state.body.currentBlackCard.pick)
                    .map((card: Card) => card.id),
            });

            expect(res.statusCode).toBe(200);
        }

        res = await agent.get("/games/0/offers/0").send();

        expect(res.body.offers.length).toBe(2);
    });

    it("should accept an offer successfully", async () => {
        let agent = request(createServer(container));

        await createStartedGame(agent);

        let state = await agent.get("/games/0").send();
        let res: request.Response;

        for (let i = 0; i < 3; i++) {
            if (i === state.body.czar.id) continue;

            let cards = await agent.get(`/games/0/cards/${i}`).send();

            res = await agent.put(`/games/0/cards/${i}`).send({
                cards: cards.body.cards
                    .slice(0, state.body.currentBlackCard.pick)
                    .map((card: Card) => card.id),
            });

            expect(res.statusCode).toBe(200);
        }

        let offers = await agent.get("/games/0/offers/0").send();

        res = await agent.put(`/games/0/offers/${state.body.czar.id}`).send({
            cards: shuffle(offers.body.offers as Card[][], {
                copy: true,
            })[0].map((card: Card) => card.id),
        });

        expect(res.statusCode).toBe(200);
    });
});
