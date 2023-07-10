import Card from "../../entities/card";
import Pack from "../../entities/pack";

export default interface ICardsService {
    getAllPacks(): Pack[];
    getCard(id: number): Card;
    getPack(id: number): Pack;
    readCards(): Promise<number>;
}
