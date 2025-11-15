// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISomiArbVault
 * @dev Interface for the SomiArbVault contract
 */
interface ISomiArbVault {
    /*//////////////////////////////////////////////////////////////
                               ENUMS
    //////////////////////////////////////////////////////////////*/
    
    enum Platform {
        QUICKSWAP,
        STANDARD
    }

    /*//////////////////////////////////////////////////////////////
                              STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct ArbitrageParams {
        address tokenA;           // Input token
        address tokenB;           // Output token
        uint256 amountIn;         // Amount to trade
        uint256 minAmountOut;     // Minimum output amount
        uint256 expectedProfit;   // Expected profit in basis points
        uint256 minProfit;        // Minimum acceptable profit
        uint256 slippage;         // Maximum slippage in basis points
        Platform buyPlatform;     // Platform to buy on
        Platform sellPlatform;    // Platform to sell on
        uint256 deadline;         // Transaction deadline
    }

    struct RiskParametersInput {
        uint256 maxPositionSize;  // Maximum position size per trade
        uint256 maxDailyVolume;   // Maximum daily trading volume
        uint256 exposureLimit;    // Maximum exposure per token
        uint256 cooldownPeriod;   // Cooldown between trades in seconds
    }

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    event Deposit(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 shares
    );

    event Withdraw(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 shares
    );

    event ArbitrageExecuted(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountIn,
        uint256 profit,
        Platform buyPlatform,
        Platform sellPlatform,
        uint256 indexed executionId
    );

    /*//////////////////////////////////////////////////////////////
                             FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function deposit(address token, uint256 amount) external returns (uint256 shares);
    function withdraw(address token, uint256 shares) external returns (uint256 amount);
    function executeArbitrage(ArbitrageParams calldata params) external returns (uint256 profit);
    function getUserShares(address user, address token) external view returns (uint256);
    function getUserBalance(address user, address token) external view returns (uint256);
    function getTotalValue(address token) external view returns (uint256);
}