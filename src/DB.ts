import { randomUUID } from "crypto";

export interface Item {
    mass_g: number;
    product_name: string;
    product_id: number;
}

export interface ItemOnHand {
    available: number;
    total: number;
}

export interface ProductQuantity {
    product_id: number;
    quantity: number;
}

export interface OrderHeader {
    order_id: number;
}

export interface Order {
    order_id: number;
    requested: Array<ProductQuantity>
}

export enum OrderStatus {
    AWAITING_FULFILLMENT,
    AWAITING_SHIPMENT,
    SHIPPED
}

export interface OrderTransaction {
    order_id: number;
    line_id: number;
    product_id: number;
    quantity: number;
    status: OrderStatus;
    current_transaction: boolean;
    shipment_id?: Array<number>;
}

export interface Shipment {
    shipment_id: string;
    weight: number;
    items: Record<string, number>;
}

export class InventoryRepository {
    inventory: Record<string, [Item, ItemOnHand]> = {};
    init(initialInventory: Array<Item>) {
        initialInventory.forEach(item => {
            this.inventory[item.product_id] = [item, { available: 0, total: 0 }]
        })
    }

    process_restock(restockData: Array<ProductQuantity>) {
        restockData.forEach(restock => {
            const restockId = restock.product_id
            const restockQuantity = restock.quantity
            const [item, itemOnHand] = this.inventory[restockId]
            const updatedStock: ItemOnHand = { available: itemOnHand.available + restockQuantity, total: itemOnHand.total + restockQuantity }
            this.inventory[restockId] = [item, updatedStock]
        })
    }

    book_inventory(inventoryNeeded: ProductQuantity): ProductQuantity {
        const { product_id, quantity } = inventoryNeeded;
        const [item, itemOnHand] = this.inventory[product_id]
        const maybeStock: number = itemOnHand.available - quantity
        if (maybeStock >= 0) {
            const updatedStock: ItemOnHand = { ...itemOnHand, available: maybeStock }
            this.inventory[product_id] = [item, updatedStock]
            return { product_id, quantity }
        } else {
            const updatedStock: ItemOnHand = { ...itemOnHand, available: 0 }
            const fulfilled: number = quantity + maybeStock;
            this.inventory[product_id] = [item, updatedStock]
            return { product_id, quantity: fulfilled }
        }
    }

    get_product_weight(product_id: number): number {
        return this.inventory[product_id][0].mass_g;
    }
}

export class ShipmentRepository {
    shipments: Array<Shipment> = [];

    insert_shipments(s: Array<Shipment>) {
        this.shipments = [...this.shipments, ...s]
    }
}

export class OrderRepository {
    orderHeaders: Record<string, OrderHeader> = {};
    orderTransactionsAudit: Array<OrderTransaction> = [];

    inventoryRepository: InventoryRepository
    shipmentRepository: ShipmentRepository
    constructor(inventoryRepository: InventoryRepository, shipmentRepository: ShipmentRepository) {
        this.inventoryRepository = inventoryRepository,
        this.shipmentRepository = shipmentRepository
    }

    insert_order({ order_id, requested }: Order) {
        this.orderHeaders[order_id] = { order_id };

        requested.forEach((lineItem, index) => {
            const key = `${order_id}_${index}`;
            const transactionItem: OrderTransaction = {
                order_id,
                line_id: index,
                product_id: lineItem.product_id,
                quantity: lineItem.quantity,
                current_transaction: true,
                status: OrderStatus.AWAITING_FULFILLMENT
            }
            this.orderTransactionsAudit.push(transactionItem);
        })
    }

    get_awaiting_fulfillment() {
        return this.orderTransactionsAudit.filter(audit => audit.current_transaction && audit.status === OrderStatus.AWAITING_FULFILLMENT);
    }

    insert_transactions(originalTransaction: OrderTransaction, transactions: Array<OrderTransaction>) {
        const currentTransactionIndex = this.orderTransactionsAudit.indexOf(originalTransaction);
        this.orderTransactionsAudit[currentTransactionIndex] = { ...originalTransaction, current_transaction: false };
        this.orderTransactionsAudit = [...this.orderTransactionsAudit, ...transactions];
    }

    get_awaiting_shipment() {
        return this.orderTransactionsAudit.filter(audit => audit.current_transaction && audit.status === OrderStatus.AWAITING_SHIPMENT);
    }

    prepare_shipments(transactions: Array<OrderTransaction>) {
        const shipments: Array<Shipment> = []
        transactions.forEach((transaction) => {
            const productWeight = this.inventoryRepository.get_product_weight(transaction.product_id);
            let quantity = transaction.quantity;

            let usedShipments = []
            while (quantity > 0) {
                const maybeShipmentIndex = shipments.findIndex(shipment => shipment.weight + productWeight <= 1800)
                if (maybeShipmentIndex !== -1) {
                    const shipmentToAddTo = shipments[maybeShipmentIndex];
                    usedShipments.push(shipmentToAddTo.shipment_id)
                    if(shipmentToAddTo.items[transaction.product_id] === undefined) {
                        shipmentToAddTo.items[transaction.product_id] = 1;
                    } else {
                        shipmentToAddTo.items[transaction.product_id]++
                    }
                    shipmentToAddTo.weight = shipmentToAddTo.weight + productWeight;
                    
                } else {
                    const items:Record<string, number> = {};
                    items[transaction.product_id] = 1; 
                    const shipment: Shipment = { shipment_id: randomUUID(), weight: productWeight, items }
                    usedShipments.push(shipment.shipment_id)
                    shipments.push(shipment)
                }
                quantity--;
            }
            const lineShipments = new Set(usedShipments)
            const updatedTransaction = {...transaction, shipments: lineShipments, status: OrderStatus.SHIPPED}
            this.insert_transactions(transaction, [updatedTransaction])
            
        })
        this.shipmentRepository.insert_shipments(shipments)
    }
}
