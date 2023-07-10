import { AsyncContainerModule } from "inversify";
import ICardsService from "./models/services/cards.service";
import IGameService from "./models/services/game.service";
import IPlayerService from "./models/services/player.service";
import CardsService from "./services/cards.service";
import GameService from "./services/game.service";
import PlayerService from "./services/player.service";
import { TYPES } from "./types";

export const bindings = new AsyncContainerModule(async (bind) => {
    require("./controllers/packs");
    require("./controllers/players");
    require("./controllers/games");

    // these are all configurables

    bind<string>(TYPES.CardsFile).toConstantValue(
        process.env.CARDS_FILE ? process.env.CARDS_FILE : "./etc/cards.json"
    );

    bind<string>(TYPES.Port).toConstantValue(
        process.env.PORT ? process.env.PORT : "8060"
    );

    bind<ICardsService>(TYPES.CardsService).to(CardsService).inSingletonScope();
    bind<IGameService>(TYPES.GameService).to(GameService).inSingletonScope();
    bind<IPlayerService>(TYPES.PlayerService)
        .to(PlayerService)
        .inSingletonScope();
});
