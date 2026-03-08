import prisma from "./lib/prisma.js";

async function main() {
    const orders = await prisma.workOrder.findMany({ include: { timeline: true } });
    console.log(JSON.stringify(orders.slice(0, 1), null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
