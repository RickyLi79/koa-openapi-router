"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class default_1 {
    async 'GET /pets'(ctx) {
        var _a;
        const pets = [];
        const limit = (_a = ctx.query.limit) !== null && _a !== void 0 ? _a : 20;
        for (let i = 0; i < limit; i++) {
            pets.push({
                id: i,
                name: `pet:${i}`,
                tag: 'dog',
            });
        }
        ctx.status = 200;
        ctx.body = pets;
    }
    async 'POST /pets'(ctx) {
        ctx.status = 201;
    }
    async 'GET /pets/:petId'(ctx) {
        const petId = Number.parseInt(ctx.params.petId);
        if (!Number.isNaN(petId)) {
            ctx.status = 200;
            ctx.body = {
                id: petId,
                name: `pet:${petId}`,
                tag: 'cat',
            };
        }
        else {
            ctx.status = 404;
            ctx.body = 'pet not found';
        }
    }
}
exports.default = default_1;
