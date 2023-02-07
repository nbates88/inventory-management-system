<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

This project consists of the APIs for a sample lightweight inventory management system. This project aims to take the following into consideration:
* Quick turnaround - geting items packaged and shipped as soon as they are available
* Efficient packaging
* ACID compliant DB - When a transaction is being processed, immediately "book" the quantity so that another transaction can not use that quanity.
* Keeping an audit of how each line item is processed by inserting new records into the `OrderTransaction` with new statuses instead of upserting.  


In order to keep the scope minimal, some tradeoffs have been made including:
* Instead of using a real relational database, objects representing tables have been stored in memory as "repositories" that also contain the business logic
* In an ideal world, to continually process orders that are awaiting a restock of items and transactions awaiting shipment, background processess such as a cron job or pub/sub would be implemented. However, for the sake of this assignment, these endpoint will need to be alled manually.  
* When determining how to split up a group of transactions into shipments with a weight that equaled no more than the carrying limit of a drone, a niave algorithm has been utilized. However, a better way to achieve more efficient packaging would be to use a version of the knapsack algorithm. 

<p align="right">(<a href="#readme-top">back to top</a>)</p>


### Built With

* [Node](https://nodejs.org/en/)
* [Express](https://expressjs.com/)
* [TypeScript](https://www.typescriptlang.org/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.
* node: Download the latest version [here](https://nodejs.org/en/download/)
* npm
  ```sh
  npm install npm@latest -g
  ```

### Installation
1. Install NPM packages
   ```sh
   npm install
   ```
2. In order to call the api endpoints you'll need to download a Node api client such as [Postman](https://www.postman.com/downloads/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

1. Start the server by calling `npm start`

2. Begin my initializing the inventory by calling `localhost:8000/init` with a JSON payload of products:
```
[{"mass_g": 700, "product_name": "RBC A+ Adult", "product_id": 0}, {"mass_g": 700,
"product_name": "RBC B+ Adult", "product_id": 1}, {"mass_g": 750, "product_name": "RBC
AB+ Adult", "product_id": 2}, {"mass_g": 680, "product_name": "RBC O- Adult",
"product_id": 3}, {"mass_g": 350, "product_name": "RBC A+ Child", "product_id": 4},
{"mass_g": 200, "product_name": "RBC AB+ Child", "product_id": 5}, {"mass_g": 120,
"product_name": "PLT AB+", "product_id": 6}, {"mass_g": 80, "product_name": "PLT O+",
"product_id": 7}, {"mass_g": 40, "product_name": "CRYO A+", "product_id": 8}, {"mass_g":
80, "product_name": "CRYO AB+", "product_id": 9}, {"mass_g": 300, "product_name":
"FFP A+", "product_id": 10}, {"mass_g": 300, "product_name": "FFP B+", "product_id": 11},
{"mass_g": 300, "product_name": "FFP AB+", "product_id": 12}]
```

3. Add some stock by calling `localhost:8000/process_restock` with a JSON payload:
```
[{"product_id": 0, "quantity": 30}, {"product_id": 1, "quantity": 25}, {"product_id": 2, "quantity":
25}, {"product_id": 3, "quantity": 12}, {"product_id": 4, "quantity": 15}, {"product_id": 5,
"quantity": 10}, {"product_id": 6, "quantity": 8}, {"product_id": 7, "quantity": 8}, {"product_id":
8, "quantity": 20}, {"product_id": 9, "quantity": 10}, {"product_id": 10, "quantity": 5},
{"product_id": 11, "quantity": 5}, {"product_id": 12, "quantity": 5}]
```

  Ideally, this would also kick off the `process_awaiting_fulfillment` flow. Could use a pub/sub for when a transaction is set to `awaiting_fulfillment` so that it subscribes to any update of quantity for that product.

4. Simulate some orders coming in by calling `localhost:8000/process_order` with a JSON payload such as:
```
{"order_id": 124, "requested": [{"product_id": 4, "quantity": 6}, {"product_id": 8, "quantity": 5}]}
```

5. Simulate a background job continuously looking for orders that need to be fulfilled by calling `localhost:8000/process_awaiting_fulfillment`. As noted above, this process would be continually run in the background on some cadence so that the system is always trying to move orders throught the process. It would also be kicked off anytime a restock of inventory occurs. 

6. Simulate a background job continuously looking for transactions that need to be shipped by calling `localhost:8000/process_awaiting_shipment`. Ideally this endpoint would then call `localhost:8000/ship_package` for each package created but it's not possible with this minimal set up.


<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- After transactions have been marked as `shipped`, update the product's `ItemOnHand.total` to reflect the `ItemOnHand.available` 
- Use a relational database
- Break down API into microservices 
    - Don't have all endpoints talk to the same DB 
    - Improve scalability
- Implement cron jobs to run processing the background
- Use knapsack algorithm for efficient packaging

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

