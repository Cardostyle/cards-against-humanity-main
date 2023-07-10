import Player from "../../entities/player";

export default interface IPlayerService {
    create(name: string): Player;
    delete(id: number): void;
    get(id: number): Player;
    getAll(): Player[];
}
