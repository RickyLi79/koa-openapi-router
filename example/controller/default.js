"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class default_1 {
    async 'ALL /hello'(ctx) {
        ctx.body = 'hello world';
    }
    async 'POST /hello'(ctx) {
        ctx.body = `hello ${ctx.request.body.name}`;
    }
}
exports.default = default_1;
