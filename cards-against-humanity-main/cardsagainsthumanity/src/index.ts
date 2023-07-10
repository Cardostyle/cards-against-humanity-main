// tslint:disable:ordered-imports

import "reflect-metadata";

// everything else follows
import { Container } from "inversify";
import { bindings } from "./inversify.config";
import createServer from "./server";
import { TYPES } from "./types";
import ICardsService from "./models/services/cards.service";

(async () => {
    const container = new Container();
    await container.loadAsync(bindings);

    const app = createServer(container);

    const cardsService = container.get<ICardsService>(TYPES.CardsService);

    console.log(
        `loaded ${await cardsService.readCards()} cards in ${
            cardsService.getAllPacks().length
        } packs`
    );

    app.listen(parseInt(container.get<string>(TYPES.Port), 10));
})();
