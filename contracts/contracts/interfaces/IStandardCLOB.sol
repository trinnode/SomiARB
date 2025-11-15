// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IStandardCLOB
 * @dev Interface for Standard CLOB (Central Limit Order Book)
 */
interface IStandardCLOB {
    /*//////////////////////////////////////////////////////////////
                              STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Order {
        uint256 id;               // Order ID
        address trader;           // Trader address
        address baseToken;        // Base token address
        address quoteToken;       // Quote token address
        uint256 amount;           // Order amount
        uint256 price;            // Order price
        bool isBuy;              // Buy or sell order
        uint256 timestamp;        // Order timestamp
        uint256 filled;          // Amount filled
        bool cancelled;          // Order cancelled flag
    }

    struct OrderBook {
        uint256[] bidPrices;      // Bid prices (sorted descending)
        uint256[] askPrices;      // Ask prices (sorted ascending)
        mapping(uint256 => uint256) bidAmounts;  // Amount at each bid price
        mapping(uint256 => uint256) askAmounts;  // Amount at each ask price
    }

    struct MarketData {
        uint256 lastPrice;        // Last traded price
        uint256 bestBid;          // Best bid price
        uint256 bestAsk;          // Best ask price
        uint256 volume24h;        // 24h volume
        uint256 priceChange24h;   // 24h price change
    }

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    event OrderPlaced(
        uint256 indexed orderId,
        address indexed trader,
        address indexed baseToken,
        address quoteToken,
        uint256 amount,
        uint256 price,
        bool isBuy
    );

    event OrderFilled(
        uint256 indexed orderId,
        address indexed trader,
        uint256 filledAmount,
        uint256 price
    );

    event OrderCancelled(
        uint256 indexed orderId,
        address indexed trader
    );

    event Trade(
        address indexed baseToken,
        address indexed quoteToken,
        uint256 amount,
        uint256 price,
        address buyer,
        address seller
    );

    /*//////////////////////////////////////////////////////////////
                             FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    // Order management
    function placeOrder(
        address baseToken,
        address quoteToken,
        uint256 amount,
        uint256 price,
        bool isBuy
    ) external returns (uint256 orderId);

    function cancelOrder(uint256 orderId) external;
    function fillOrder(uint256 orderId, uint256 amount) external;

    // Trading functions
    function buyTokens(
        address baseToken,
        address quoteToken,
        uint256 quoteAmount,
        uint256 minBaseAmount
    ) external returns (uint256 baseAmount);

    function sellTokens(
        address baseToken,
        address quoteToken,
        uint256 baseAmount,
        uint256 minQuoteAmount
    ) external returns (uint256 quoteAmount);

    function marketBuy(
        address baseToken,
        address quoteToken,
        uint256 quoteAmount
    ) external returns (uint256 baseAmount);

    function marketSell(
        address baseToken,
        address quoteToken,
        uint256 baseAmount
    ) external returns (uint256 quoteAmount);

    // View functions
    function getOrder(uint256 orderId) external view returns (Order memory);
    function getOrderBook(address baseToken, address quoteToken) external view returns (
        uint256[] memory bidPrices,
        uint256[] memory bidAmounts,
        uint256[] memory askPrices,
        uint256[] memory askAmounts
    );

    function getMarketData(address baseToken, address quoteToken) external view returns (MarketData memory);
    function getBestBid(address baseToken, address quoteToken) external view returns (uint256 price, uint256 amount);
    function getBestAsk(address baseToken, address quoteToken) external view returns (uint256 price, uint256 amount);
    function getLastPrice(address baseToken, address quoteToken) external view returns (uint256);
    function getUserOrders(address user) external view returns (uint256[] memory);
    function getActiveOrders(address baseToken, address quoteToken) external view returns (uint256[] memory);
}