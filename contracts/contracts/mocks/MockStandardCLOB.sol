// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IStandardCLOB.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockStandardCLOB
 * @dev Mock implementation of Standard CLOB for testing
 */
contract MockStandardCLOB is IStandardCLOB {
    uint256 private nextOrderId = 1;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    
    // Mock market data
    mapping(bytes32 => MarketData) public marketDataStorage;
    mapping(bytes32 => uint256[]) public bidPricesStorage;
    mapping(bytes32 => uint256[]) public askPricesStorage;
    mapping(bytes32 => mapping(uint256 => uint256)) public bidAmountsStorage;
    mapping(bytes32 => mapping(uint256 => uint256)) public askAmountsStorage;

    function _getMarketKey(address baseToken, address quoteToken) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(baseToken, quoteToken));
    }

    function placeOrder(
        address baseToken,
        address quoteToken,
        uint256 amount,
        uint256 price,
        bool isBuy
    ) external override returns (uint256 orderId) {
        orderId = nextOrderId++;
        
        orders[orderId] = Order({
            id: orderId,
            trader: msg.sender,
            baseToken: baseToken,
            quoteToken: quoteToken,
            amount: amount,
            price: price,
            isBuy: isBuy,
            timestamp: block.timestamp,
            filled: 0,
            cancelled: false
        });
        
        userOrders[msg.sender].push(orderId);
        
        // Update order book
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        if (isBuy) {
            bidPricesStorage[marketKey].push(price);
            bidAmountsStorage[marketKey][price] += amount;
        } else {
            askPricesStorage[marketKey].push(price);
            askAmountsStorage[marketKey][price] += amount;
        }
        
        emit OrderPlaced(orderId, msg.sender, baseToken, quoteToken, amount, price, isBuy);
    }

    function cancelOrder(uint256 orderId) external override {
        require(orders[orderId].trader == msg.sender, "Not your order");
        require(!orders[orderId].cancelled, "Order already cancelled");
        
        orders[orderId].cancelled = true;
        
        emit OrderCancelled(orderId, msg.sender);
    }

    function fillOrder(uint256 orderId, uint256 amount) external override {
        Order storage order = orders[orderId];
        require(!order.cancelled, "Order cancelled");
        require(order.filled + amount <= order.amount, "Fill amount too large");
        
        order.filled += amount;
        
        emit OrderFilled(orderId, order.trader, amount, order.price);
    }

    function buyTokens(
        address baseToken,
        address quoteToken,
        uint256 quoteAmount,
        uint256 minBaseAmount
    ) external override returns (uint256 baseAmount) {
        // Mock buy: 1:1 ratio with 0.2% fee
        baseAmount = (quoteAmount * 998) / 1000;
        require(baseAmount >= minBaseAmount, "Insufficient output amount");
        
        // Transfer quote tokens from buyer
        IERC20(quoteToken).transferFrom(msg.sender, address(this), quoteAmount);
        
        // Transfer base tokens to buyer
        IERC20(baseToken).transfer(msg.sender, baseAmount);
        
        // Update market data
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        marketDataStorage[marketKey].lastPrice = (quoteAmount * 1e18) / baseAmount;
        marketDataStorage[marketKey].volume24h += baseAmount;
        
        emit Trade(baseToken, quoteToken, baseAmount, marketDataStorage[marketKey].lastPrice, msg.sender, address(this));
    }

    function sellTokens(
        address baseToken,
        address quoteToken,
        uint256 baseAmount,
        uint256 minQuoteAmount
    ) external override returns (uint256 quoteAmount) {
        // Mock sell: 1:1 ratio with 0.2% fee
        quoteAmount = (baseAmount * 998) / 1000;
        require(quoteAmount >= minQuoteAmount, "Insufficient output amount");
        
        // Transfer base tokens from seller
        IERC20(baseToken).transferFrom(msg.sender, address(this), baseAmount);
        
        // Transfer quote tokens to seller
        IERC20(quoteToken).transfer(msg.sender, quoteAmount);
        
        // Update market data
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        marketDataStorage[marketKey].lastPrice = (quoteAmount * 1e18) / baseAmount;
        marketDataStorage[marketKey].volume24h += baseAmount;
        
        emit Trade(baseToken, quoteToken, baseAmount, marketDataStorage[marketKey].lastPrice, address(this), msg.sender);
    }

    function marketBuy(
        address baseToken,
        address quoteToken,
        uint256 quoteAmount
    ) external override returns (uint256 baseAmount) {
        // Mock buy: 1:1 ratio with 0.2% fee
        baseAmount = (quoteAmount * 998) / 1000;
        
        // Transfer quote tokens from buyer
        IERC20(quoteToken).transferFrom(msg.sender, address(this), quoteAmount);
        
        // Transfer base tokens to buyer
        IERC20(baseToken).transfer(msg.sender, baseAmount);
        
        // Update market data
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        marketDataStorage[marketKey].lastPrice = (quoteAmount * 1e18) / baseAmount;
        marketDataStorage[marketKey].volume24h += baseAmount;
        
        emit Trade(baseToken, quoteToken, baseAmount, marketDataStorage[marketKey].lastPrice, msg.sender, address(this));
    }

    function marketSell(
        address baseToken,
        address quoteToken,
        uint256 baseAmount
    ) external override returns (uint256 quoteAmount) {
        // Mock sell: 1:1 ratio with 0.2% fee
        quoteAmount = (baseAmount * 998) / 1000;
        
        // Transfer base tokens from seller
        IERC20(baseToken).transferFrom(msg.sender, address(this), baseAmount);
        
        // Transfer quote tokens to seller
        IERC20(quoteToken).transfer(msg.sender, quoteAmount);
        
        // Update market data
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        marketDataStorage[marketKey].lastPrice = (quoteAmount * 1e18) / baseAmount;
        marketDataStorage[marketKey].volume24h += baseAmount;
        
        emit Trade(baseToken, quoteToken, baseAmount, marketDataStorage[marketKey].lastPrice, address(this), msg.sender);
    }

    function getOrder(uint256 orderId) external view override returns (Order memory) {
        return orders[orderId];
    }

    function getOrderBook(address baseToken, address quoteToken) external view override returns (
        uint256[] memory bidPrices,
        uint256[] memory bidAmounts,
        uint256[] memory askPrices,
        uint256[] memory askAmounts
    ) {
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        
        bidPrices = bidPricesStorage[marketKey];
        askPrices = askPricesStorage[marketKey];
        
        bidAmounts = new uint256[](bidPrices.length);
        askAmounts = new uint256[](askPrices.length);
        
        for (uint i = 0; i < bidPrices.length; i++) {
            bidAmounts[i] = bidAmountsStorage[marketKey][bidPrices[i]];
        }
        
        for (uint i = 0; i < askPrices.length; i++) {
            askAmounts[i] = askAmountsStorage[marketKey][askPrices[i]];
        }
    }

    function getMarketData(address baseToken, address quoteToken) external view override returns (MarketData memory) {
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        return marketDataStorage[marketKey];
    }

    function getBestBid(address baseToken, address quoteToken) external view override returns (uint256 price, uint256 amount) {
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        uint256[] memory bidPrices = bidPricesStorage[marketKey];
        
        if (bidPrices.length == 0) {
            return (0, 0);
        }
        
        // Find highest bid (mock implementation - not sorted)
        price = bidPrices[0];
        for (uint i = 1; i < bidPrices.length; i++) {
            if (bidPrices[i] > price) {
                price = bidPrices[i];
            }
        }
        amount = bidAmountsStorage[marketKey][price];
    }

    function getBestAsk(address baseToken, address quoteToken) external view override returns (uint256 price, uint256 amount) {
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        uint256[] memory askPrices = askPricesStorage[marketKey];
        
        if (askPrices.length == 0) {
            return (0, 0);
        }
        
        // Find lowest ask (mock implementation - not sorted)
        price = askPrices[0];
        for (uint i = 1; i < askPrices.length; i++) {
            if (askPrices[i] < price) {
                price = askPrices[i];
            }
        }
        amount = askAmountsStorage[marketKey][price];
    }

    function getLastPrice(address baseToken, address quoteToken) external view override returns (uint256) {
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        return marketDataStorage[marketKey].lastPrice;
    }

    function getUserOrders(address user) external view override returns (uint256[] memory) {
        return userOrders[user];
    }

    function getActiveOrders(address baseToken, address quoteToken) external view override returns (uint256[] memory) {
        // Mock implementation - return empty array
        return new uint256[](0);
    }

    // Helper functions for testing

    function setMarketPrice(address baseToken, address quoteToken, uint256 price) external {
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        marketDataStorage[marketKey].lastPrice = price;
        marketDataStorage[marketKey].bestBid = (price * 999) / 1000; // 0.1% spread
        marketDataStorage[marketKey].bestAsk = (price * 1001) / 1000; // 0.1% spread
    }

    function fundCLOB(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }

    function addLiquidity(
        address baseToken,
        address quoteToken,
        uint256 bidPrice,
        uint256 askPrice,
        uint256 amount
    ) external {
        bytes32 marketKey = _getMarketKey(baseToken, quoteToken);
        
        // Add bid
        bidPricesStorage[marketKey].push(bidPrice);
        bidAmountsStorage[marketKey][bidPrice] = amount;
        
        // Add ask
        askPricesStorage[marketKey].push(askPrice);
        askAmountsStorage[marketKey][askPrice] = amount;
        
        // Update market data
        marketDataStorage[marketKey].bestBid = bidPrice;
        marketDataStorage[marketKey].bestAsk = askPrice;
        marketDataStorage[marketKey].lastPrice = (bidPrice + askPrice) / 2;
    }
}