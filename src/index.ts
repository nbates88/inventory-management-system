import express, { Request, Response, Application } from 'express';

import { OrderRepository, InventoryRepository, ShipmentRepository, Item, ItemOnHand, OrderStatus, OrderTransaction } from './DB';
const app: Application = express();
const PORT = process.env.PORT || 8000;

const inventoryRepo = new InventoryRepository()
const shipmentRepo = new ShipmentRepository()
const orderRepo = new OrderRepository(inventoryRepo, shipmentRepo)

app.use(express.json())

app.post("/init", (req: Request, res: Response) => {
    const inventory = req.body;

    if (!inventory) {
        return res.sendStatus(400)
    }
    inventoryRepo.init(inventory)
    console.log("inventory", inventoryRepo.inventory)

    res.sendStatus(201);

})

app.post('/process_restock', (req: Request, res: Response) => {
    const inventoryRestock = req.body;

    if (!inventoryRestock) {
        return res.sendStatus(400)
    }

    inventoryRepo.process_restock(inventoryRestock)
    console.log("inventory", inventoryRepo.inventory)

    res.sendStatus(200);
})


app.post('/process_order', (req: Request, res: Response) => {
    const content = req.body;

    if (!content) {
        return res.sendStatus(400)
    }

    orderRepo.insert_order(content)
    console.log("orderHeaders", orderRepo.orderHeaders)
    console.log("orderTransactions", orderRepo.orderTransactionsAudit)

    res.sendStatus(201);
})

app.post('/process_awaiting_fulfillment', (_: Request, res: Response) => {
    const itemsAwaitingFulfillment = orderRepo.get_awaiting_fulfillment();
    itemsAwaitingFulfillment.map(transaction => {
        const { quantity: quantityBooked } = inventoryRepo.book_inventory({ product_id: transaction.product_id, quantity: transaction.quantity });
        if (quantityBooked === transaction.quantity) {
            const fulfilledTransaction: OrderTransaction = { ...transaction, status: OrderStatus.AWAITING_SHIPMENT }
            orderRepo.insert_transactions(transaction, [fulfilledTransaction])
        } else if (quantityBooked > 0 && quantityBooked < transaction.quantity) {
            const partiallyFilledTransaction: OrderTransaction = { ...transaction, quantity: quantityBooked, status: OrderStatus.AWAITING_SHIPMENT };
            const unfulfilledTransaction: OrderTransaction = { ...transaction, quantity: transaction.quantity - quantityBooked }
            orderRepo.insert_transactions(transaction, [partiallyFilledTransaction, unfulfilledTransaction]);
        }
    })

    console.log("orderTransactions", orderRepo.orderTransactionsAudit)
    res.sendStatus(200);
})

app.post('/process_awaiting_shipment', (_: Request, res: Response) => {
    const itemsAwaitingShipment = orderRepo.get_awaiting_shipment();

    const shipmentsGroupedByOrder = itemsAwaitingShipment.reduce(function (rv: Record<string, Array<OrderTransaction>>, x: OrderTransaction) {
        (rv[x["order_id"]] = rv[x["order_id"]] || []).push(x);
        return rv;
    }, {});

    Object.keys(shipmentsGroupedByOrder).forEach(orderId => {
        orderRepo.prepare_shipments(shipmentsGroupedByOrder[orderId])
        //ship_package(orderShipments)
    })

    console.log("orderTransactions", orderRepo.orderTransactionsAudit)
    console.log("shipments", shipmentRepo.shipments)
    res.sendStatus(200)
})

app.post('/ship_package', (req: Request, res: Response) => {
    const shipment = req.body;
    console.log(`Shipment ${shipment.shipment_id} has been shipped!`)
    res.sendStatus(200);
})

app.listen(PORT, (): void => {
    console.log(`Server Running here 👉 https://localhost:${PORT}`);
});

