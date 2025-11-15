// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IQuickSwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockQuickSwapRouter
 * @dev Mock implementation of QuickSwap router for testing
 */
contract MockQuickSwapRouter is IQuickSwapRouter {
    address public constant override WETH = address(0x1234567890123456789012345678901234567890);
    address public constant override factory = address(0x0987654321098765432109876543210987654321);

    // Mock exchange rate (1:1 for simplicity)
    uint256 public constant EXCHANGE_RATE = 1e18;

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external override returns (uint amountA, uint amountB, uint liquidity) {
        // Mock implementation - just return desired amounts
        return (amountADesired, amountBDesired, amountADesired + amountBDesired);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external override returns (uint amountA, uint amountB) {
        // Mock implementation
        return (liquidity / 2, liquidity / 2);
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        require(amountIn > 0, "Amount in must be > 0");
        
        // Transfer tokens from sender
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        
        // Mock swap: 1:1 ratio with 0.3% fee
        uint256 amountOut = (amountIn * 997) / 1000;
        require(amountOut >= amountOutMin, "Insufficient output amount");
        
        // Transfer output tokens
        IERC20(path[1]).transfer(to, amountOut);
        
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
        
        return amounts;
    }

    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        
        // Mock calculation: reverse of swapExactTokensForTokens
        uint256 amountIn = (amountOut * 1000) / 997 + 1;
        require(amountIn <= amountInMax, "Excessive input amount");
        
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[1]).transfer(to, amountOut);
        
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
        
        return amounts;
    }

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override returns (uint[] memory amounts) {
        require(msg.value > 0, "Must send ETH");
        
        uint256 amountOut = (msg.value * 997) / 1000;
        require(amountOut >= amountOutMin, "Insufficient output amount");
        
        IERC20(path[1]).transfer(to, amountOut);
        
        amounts = new uint[](2);
        amounts[0] = msg.value;
        amounts[1] = amountOut;
        
        return amounts;
    }

    function swapTokensForExactETH(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        uint256 amountIn = (amountOut * 1000) / 997 + 1;
        require(amountIn <= amountInMax, "Excessive input amount");
        
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        payable(to).transfer(amountOut);
        
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
        
        return amounts;
    }

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        require(amountIn > 0, "Amount in must be > 0");
        
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 amountOut = (amountIn * 997) / 1000;
        require(amountOut >= amountOutMin, "Insufficient output amount");
        
        payable(to).transfer(amountOut);
        
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
        
        return amounts;
    }

    function swapETHForExactTokens(
        uint amountOut,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override returns (uint[] memory amounts) {
        uint256 requiredETH = (amountOut * 1000) / 997 + 1;
        require(msg.value >= requiredETH, "Insufficient ETH");
        
        IERC20(path[1]).transfer(to, amountOut);
        
        // Refund excess ETH
        if (msg.value > requiredETH) {
            payable(msg.sender).transfer(msg.value - requiredETH);
        }
        
        amounts = new uint[](2);
        amounts[0] = requiredETH;
        amounts[1] = amountOut;
        
        return amounts;
    }

    function quote(uint amountA, uint reserveA, uint reserveB) external pure override returns (uint amountB) {
        require(amountA > 0, "Amount A must be > 0");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");
        
        amountB = (amountA * reserveB) / reserveA;
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure override returns (uint amountOut) {
        require(amountIn > 0, "Amount in must be > 0");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure override returns (uint amountIn) {
        require(amountOut > 0, "Amount out must be > 0");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint numerator = reserveIn * amountOut * 1000;
        uint denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    function getAmountsOut(uint amountIn, address[] calldata path) external view override returns (uint[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        
        for (uint i = 1; i < path.length; i++) {
            // Mock calculation with 0.3% fee
            amounts[i] = (amounts[i-1] * 997) / 1000;
        }
    }

    function getAmountsIn(uint amountOut, address[] calldata path) external view override returns (uint[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        
        amounts = new uint[](path.length);
        amounts[amounts.length - 1] = amountOut;
        
        for (uint i = path.length - 1; i > 0; i--) {
            // Mock reverse calculation with 0.3% fee
            amounts[i-1] = (amounts[i] * 1000) / 997 + 1;
        }
    }

    // Helper function to fund the mock router with tokens for testing
    function fundRouter(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }

    // Allow the contract to receive ETH
    receive() external payable {}
}