import { CustomError } from "ts-custom-error";

export default class APIError extends CustomError {
    statusCode: number;

    constructor(message: string, statusCode?: number) {
        super(message);

        this.statusCode = statusCode || 400;
    }
}
