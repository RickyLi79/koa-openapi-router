const time = Number.parseFloat(process.argv[1] ?? '1');
const ms = Number.isNaN(time) ? 1 : time;
console.info(`to sleep : ${ms}ms`);
setTimeout(() => { console.info('wake now!'); }, 1000 * ms);
